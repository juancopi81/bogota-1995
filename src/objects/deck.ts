// The cassette deck: piano keys, a motor, and real recording.
//
// REC captures exactly what the radio is putting out (the DJ talking over
// the intro, the static if you're a little off the station) and lays it on
// the tape at the current position. PLAY gives it back with tape character:
// hiss, a little wow and flutter, less treble. Rewinding takes (scaled) real
// time. Recordings persist in this browser.

import { Cassette, blankCassette, counterAt, type Caption, type CassetteData, type TapeSegment } from './tape';
import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';
import { idb, kv } from '../world/store';
import { subtitles } from '../ui/subtitles';
import { dynamicLine } from '../content/lines';
import { bus } from '../world/bus';
import { glide } from '../audio/param';

export type Transport = 'stop' | 'play' | 'rec' | 'ff' | 'rew';
export type Key = 'rec' | 'play' | 'rew' | 'ff' | 'stop' | 'pause';

const WIND_SPEED = 22;

const CAPTURE_WORKLET = `
class TapeCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(8192);
    this.n = 0;
    this.on = false;
    this.port.onmessage = (e) => {
      this.on = e.data;
      if (!this.on) this.flush();
    };
  }
  flush() {
    if (this.n) {
      this.port.postMessage(this.buf.slice(0, this.n));
      this.n = 0;
    }
  }
  process(inputs) {
    const input = inputs[0];
    if (this.on && input && input.length) {
      const l = input[0];
      const r = input[1] || input[0];
      for (let i = 0; i < l.length; i++) {
        this.buf[this.n++] = (l[i] + r[i]) * 0.5;
        if (this.n === this.buf.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('tape-capture', TapeCapture);
`;

interface Recording {
  start: number;
  startCtx: number;
  chunks: Float32Array[];
  frames: number;
  captions: Caption[];
}

export class Deck {
  transport: Transport = 'stop';
  paused = false;
  door: 'open' | 'closed' = 'closed';
  cassette: Cassette | null = null;
  /** Cassettes lying on the desk (not in the deck). */
  desk: Cassette[] = [];
  counterZero = 0;
  /** Tape playback output (before the volume knob). */
  readonly out: GainNode;
  /** Mechanical sounds: keys, motor. */
  readonly mech: GainNode;

  private speed = 0;
  private playAnchor: { pos: number; ctx: number } | null = null;
  private capture: { start: () => void; stop: () => void } | null = null;
  private recording: Recording | null = null;
  private sources = new Map<TapeSegment, AudioBufferSourceNode>();
  private buffers = new Map<string, AudioBuffer>();
  private captions = new Map<string, Caption[]>();
  /** What the radio is saying right now (set by the grabadora). */
  captionSource: () => { label: string; text: string } | null = () => null;
  private loading = new Set<string>();
  private readonly tapeIn: GainNode;
  private readonly hiss: GainNode;
  private readonly motor: GainNode;
  private readonly whirr: OscillatorNode;
  private readonly whirrGain: GainNode;
  private readonly wow: GainNode;
  private readonly flutter: GainNode;
  private saveTimer = 0;

  constructor(
    private readonly engine: AudioEngine,
    private readonly source: AudioNode,
  ) {
    const ctx = engine.ctx;
    this.out = ctx.createGain();
    this.mech = ctx.createGain();

    // tape character: less treble, a little saturation
    this.tapeIn = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 8500;
    lp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 70;
    const sat = ctx.createWaveShaper();
    sat.curve = saturationCurve(0.9);
    this.tapeIn.connect(hp).connect(lp).connect(sat).connect(this.out);

    this.hiss = ctx.createGain();
    this.hiss.gain.value = 0;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 3500;
    engine.noiseSource('pink', hissFilter);
    hissFilter.connect(this.hiss).connect(this.out);

    // the motor: a low hum while playing, a whirr when winding
    this.motor = ctx.createGain();
    this.motor.gain.value = 0;
    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'bandpass';
    motorFilter.frequency.value = 180;
    motorFilter.Q.value = 2;
    engine.noiseSource('brown', motorFilter);
    motorFilter.connect(this.motor).connect(this.mech);
    this.whirr = ctx.createOscillator();
    this.whirr.type = 'sawtooth';
    this.whirr.frequency.value = 110;
    const whirrFilter = ctx.createBiquadFilter();
    whirrFilter.type = 'lowpass';
    whirrFilter.frequency.value = 900;
    this.whirrGain = ctx.createGain();
    this.whirrGain.gain.value = 0;
    this.whirr.connect(whirrFilter).connect(this.whirrGain).connect(this.mech);
    this.whirr.start();

    // wow (slow) and flutter (fast) pitch wobble, shared by every playing source
    const wowOsc = ctx.createOscillator();
    wowOsc.frequency.value = 0.55;
    this.wow = ctx.createGain();
    this.wow.gain.value = 0.0028;
    wowOsc.connect(this.wow);
    wowOsc.start();
    const flutterOsc = ctx.createOscillator();
    flutterOsc.frequency.value = 6.8;
    this.flutter = ctx.createGain();
    this.flutter.gain.value = 0.0009;
    flutterOsc.connect(this.flutter);
    flutterOsc.start();

    this.loadCassettes();
  }

  async init(): Promise<void> {
    const ctx = this.engine.ctx;
    const onChunk = (data: Float32Array) => {
      if (this.recording) {
        this.recording.chunks.push(data);
        this.recording.frames += data.length;
      }
    };
    // An AudioWorklet where allowed; opened from disk (file://) some browsers
    // refuse blob: worklets, so try a data: URL, then the old ScriptProcessor.
    const urls = [
      () => URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' })),
      () => `data:application/javascript;base64,${btoa(CAPTURE_WORKLET)}`,
    ];
    for (const url of urls) {
      try {
        await ctx.audioWorklet.addModule(url());
        const node = new AudioWorkletNode(ctx, 'tape-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
        this.source.connect(node);
        const sink = ctx.createGain();
        sink.gain.value = 0;
        node.connect(sink).connect(ctx.destination);
        node.port.onmessage = (e: MessageEvent<Float32Array>) => onChunk(e.data);
        this.capture = { start: () => node.port.postMessage(true), stop: () => node.port.postMessage(false) };
        return;
      } catch {
        /* try the next way */
      }
    }
    try {
      const processor = ctx.createScriptProcessor(4096, 2, 1);
      let on = false;
      processor.onaudioprocess = (e) => {
        if (!on) return;
        const l = e.inputBuffer.getChannelData(0);
        const r = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : l;
        const mono = new Float32Array(l.length);
        for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) * 0.5;
        onChunk(mono);
      };
      this.source.connect(processor);
      const sink = ctx.createGain();
      sink.gain.value = 0;
      processor.connect(sink).connect(ctx.destination);
      this.capture = { start: () => (on = true), stop: () => (on = false) };
    } catch (error) {
      console.warn('Recording unavailable in this browser', error);
      this.capture = null;
    }
  }

  // ---------- cassettes ----------

  private loadCassettes(): void {
    const saved = kv.get<CassetteData[] | null>('cassettes', null);
    const all = saved?.length ? saved.map((d) => new Cassette(d)) : [blankCassette('virgen', 'TDK D60', '#2b2d31')];
    const inDeck = kv.get<string | null>('deck.cassette', 'virgen');
    this.cassette = all.find((c) => c.data.id === inDeck) ?? null;
    this.desk = all.filter((c) => c !== this.cassette);
    this.counterZero = kv.get('deck.counterZero', 0);
  }

  private save(): void {
    const all = [...(this.cassette ? [this.cassette] : []), ...this.desk];
    kv.set('cassettes', all.map((c) => c.data));
    kv.set('deck.cassette', this.cassette?.data.id ?? null);
    kv.set('deck.counterZero', this.counterZero);
  }

  /** Erase everything recorded on every cassette (backstage). */
  async eraseAll(): Promise<void> {
    this.pressStopSilently();
    for (const c of [...(this.cassette ? [this.cassette] : []), ...this.desk]) {
      c.data.sides = { A: [], B: [] };
      c.data.pos = 0;
      c.data.side = 'A';
    }
    this.buffers.clear();
    await idb.clear('tape');
    this.counterZero = 0;
    this.save();
  }

  // ---------- keys ----------

  private click(buffer: AudioBuffer, gain = 0.6): void {
    play(this.engine.ctx, buffer, this.mech, { gain });
  }

  /** Press a key. Returns false if the key wouldn't go down. */
  press(key: Key): boolean {
    const ctx = this.engine.ctx;
    const ready = !!this.cassette && this.door === 'closed';
    switch (key) {
      case 'stop':
        if (this.transport !== 'stop') {
          this.click(sfx.keyUp(ctx), 0.7);
          this.setTransport('stop');
        } else {
          this.click(sfx.doorOpen(ctx), 0.7);
          this.door = 'open';
        }
        return true;
      case 'pause':
        this.click(sfx.keyDown(ctx), 0.5);
        this.paused = !this.paused;
        this.onMotionChange();
        return true;
      case 'play':
        if (!ready) return this.bounce();
        this.click(sfx.keyDown(ctx));
        this.setTransport('play');
        return true;
      case 'rec':
        if (!ready || !this.cassette!.canRecord()) return this.bounce();
        this.click(sfx.keyDown(ctx));
        this.setTransport('rec');
        return true;
      case 'ff':
      case 'rew':
        if (!ready) return this.bounce();
        this.click(sfx.keyDown(ctx));
        this.setTransport(key);
        return true;
    }
  }

  private bounce(): boolean {
    this.click(sfx.keyUp(this.engine.ctx), 0.45);
    return false;
  }

  private pressStopSilently(): void {
    if (this.transport !== 'stop') this.setTransport('stop');
  }

  closeDoor(): void {
    if (this.door === 'closed') return;
    this.door = 'closed';
    this.click(sfx.hook(this.engine.ctx), 0.8);
  }

  /** Take the cassette out of the open deck. */
  takeOut(): Cassette | null {
    if (this.door !== 'open' || !this.cassette) return null;
    const c = this.cassette;
    this.cassette = null;
    this.desk.push(c);
    this.click(sfx.click(this.engine.ctx), 0.6);
    this.save();
    return c;
  }

  /** Put a cassette from the desk into the open deck. */
  insert(c: Cassette): boolean {
    if (this.door !== 'open' || this.cassette) return false;
    this.desk = this.desk.filter((d) => d !== c);
    this.cassette = c;
    this.click(sfx.click(this.engine.ctx), 0.7);
    this.save();
    return true;
  }

  flip(c: Cassette): void {
    c.flip();
    this.click(sfx.click(this.engine.ctx), 0.4);
    this.save();
  }

  resetCounter(): void {
    if (this.cassette) this.counterZero = counterAt(this.cassette.pos);
    else this.counterZero = 0;
    this.click(sfx.click(this.engine.ctx), 0.5);
    this.save();
  }

  get counterPos(): number {
    return this.cassette?.pos ?? 0;
  }

  get moving(): boolean {
    return this.transport !== 'stop' && !((this.transport === 'play' || this.transport === 'rec') && this.paused);
  }

  get isRecording(): boolean {
    return this.transport === 'rec' && !this.paused;
  }

  /** Is the tape (not the radio) what comes out of the speakers? */
  get tapeAudible(): boolean {
    return this.transport === 'play' && !this.paused;
  }

  private setTransport(next: Transport): void {
    this.finishRecording();
    this.transport = next;
    this.onMotionChange();
  }

  /** Called when transport or pause changes: start/stop recording, playback, motor. */
  private onMotionChange(): void {
    const ctx = this.engine.ctx;
    this.stopSources();
    this.finishRecording();
    const c = this.cassette;
    const now = ctx.currentTime;
    if (c && (this.transport === 'play' || this.transport === 'rec') && !this.paused) {
      this.playAnchor = { pos: c.pos, ctx: now };
      if (this.transport === 'rec') this.startRecording();
    } else {
      this.playAnchor = null;
    }
    const playing = this.transport === 'play' && !this.paused;
    const turning = (this.transport === 'play' || this.transport === 'rec') && !this.paused;
    glide(this.hiss.gain, playing ? 0.028 : 0, now, 0.05);
    glide(this.motor.gain, turning ? 0.05 : 0, now, 0.08);
    bus.emit('tape:recording', { on: this.recording !== null });
    this.save();
  }

  // ---------- recording ----------

  private startRecording(): void {
    if (!this.capture || !this.cassette) return;
    this.recording = { start: this.cassette.pos, startCtx: this.engine.ctx.currentTime, chunks: [], frames: 0, captions: [] };
    this.capture.start();
  }

  private finishRecording(): void {
    const rec = this.recording;
    if (!rec || !this.capture) return;
    this.recording = null;
    const last = rec.captions[rec.captions.length - 1];
    if (last && last.dur < 0 && this.cassette) last.dur = Math.max(0.5, this.cassette.pos - rec.start - last.at);
    this.capture.stop();
    const cassette = this.cassette;
    // the worklet flushes its last chunk asynchronously; wait a moment
    setTimeout(() => void this.storeRecording(rec, cassette), 120);
    bus.emit('tape:recording', { on: false });
  }

  private async storeRecording(rec: Recording, cassette: Cassette | null): Promise<void> {
    if (!cassette || rec.frames < 128) return;
    const ctx = this.engine.ctx;
    // downsample by 2 (tape doesn't keep the top octave anyway)
    const rate = ctx.sampleRate / 2;
    const n = Math.floor(rec.frames / 2);
    const pcm = new Int16Array(n);
    let carry: number | null = null;
    let o = 0;
    for (const chunk of rec.chunks) {
      for (let j = 0; j < chunk.length; j++) {
        if (carry === null) carry = chunk[j];
        else {
          const v = (carry + chunk[j]) * 0.5;
          if (o < n) pcm[o++] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
          carry = null;
        }
      }
    }
    const dur = o / rate;
    const key = `rec-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const captions = rec.captions.filter((c) => c.at < dur).map((c) => ({ ...c, dur: Math.min(c.dur, dur - c.at) }));
    await idb.put('tape', key, { rate, pcm, captions });
    this.buffers.set(key, toBuffer(ctx, pcm, rate));
    this.captions.set(key, captions);
    cassette.write(rec.start, dur, key);
    this.save();
    await this.collectGarbage();
  }

  private async collectGarbage(): Promise<void> {
    const used = new Set<string>();
    for (const c of [...(this.cassette ? [this.cassette] : []), ...this.desk]) for (const k of c.keys()) used.add(k);
    for (const key of await idb.keys('tape')) {
      if (!used.has(key)) {
        await idb.del('tape', key);
        this.buffers.delete(key);
      }
    }
  }

  // ---------- playback ----------

  private stopSources(): void {
    const now = this.engine.ctx.currentTime;
    for (const s of this.sources.values()) {
      try {
        s.stop(now + 0.01);
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear();
  }

  private bufferFor(key: string): AudioBuffer | undefined {
    const b = this.buffers.get(key);
    if (b) return b;
    if (!this.loading.has(key)) {
      this.loading.add(key);
      void idb.get<{ rate: number; pcm: Int16Array; captions?: Caption[] }>('tape', key).then((data) => {
        this.loading.delete(key);
        if (!data) return;
        this.buffers.set(key, toBuffer(this.engine.ctx, data.pcm, data.rate));
        this.captions.set(key, data.captions ?? []);
      });
    }
    return undefined;
  }

  private schedulePlayback(): void {
    const c = this.cassette;
    if (!c || !this.playAnchor) return;
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    const pos = c.pos;
    for (const seg of c.segments()) {
      if (this.sources.has(seg)) continue;
      const segEnd = seg.start + seg.dur;
      if (segEnd <= pos || seg.start > pos + 6) continue;
      const buffer = this.bufferFor(seg.key);
      if (!buffer) continue;
      const lead = Math.max(0, seg.start - pos);
      const into = Math.max(0, pos - seg.start);
      const offset = seg.offset + into;
      const remaining = seg.dur - into;
      if (remaining <= 0.02 || offset >= buffer.duration) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      this.wow.connect(source.playbackRate);
      this.flutter.connect(source.playbackRate);
      source.connect(this.tapeIn);
      source.start(now + lead, offset, Math.min(remaining, buffer.duration - offset));
      source.onended = () => {
        this.wow.disconnect(source.playbackRate);
        this.flutter.disconnect(source.playbackRate);
      };
      this.sources.set(seg, source);
    }
  }

  // ---------- time ----------

  tick(dt: number): void {
    const c = this.cassette;
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    const winding = this.transport === 'ff' || this.transport === 'rew';
    const target = this.transport === 'ff' ? WIND_SPEED : this.transport === 'rew' ? -WIND_SPEED : 0;

    if (c && this.playAnchor) {
      c.pos = this.playAnchor.pos + (now - this.playAnchor.ctx);
      if (this.transport === 'play') this.schedulePlayback();
    } else if (c) {
      // the reels spin up and coast down
      this.speed += (target - this.speed) * Math.min(1, dt * (winding ? 1.6 : 6));
      if (Math.abs(this.speed) > 0.01) c.pos = c.pos + this.speed * dt;
    } else {
      this.speed = 0;
    }

    const whirring = winding ? Math.abs(this.speed) / WIND_SPEED : 0;
    glide(this.whirr.frequency, 70 + whirring * 150, now, 0.05);
    glide(this.whirrGain.gain, whirring * 0.035, now, 0.05);

    // the end of the tape: the mechanism clunks and the keys pop up
    if (c && this.transport !== 'stop') {
      const atEnd = (this.transport === 'rew' && c.pos <= 0) || (this.transport !== 'rew' && c.pos >= c.length);
      if (atEnd) {
        this.click(sfx.keyUp(ctx), 0.9);
        this.speed = 0;
        this.setTransport('stop');
      }
    }

    if (++this.saveTimer % 120 === 0 && this.moving) this.save();
    this.tickCaptions();
  }

  /** Remember what was said while recording; show it again when playing the tape back. */
  private tickCaptions(): void {
    const rec = this.recording;
    const c = this.cassette;
    if (rec && c) {
      const at = c.pos - rec.start;
      const now = this.captionSource();
      const open = rec.captions[rec.captions.length - 1];
      const openText = open && open.dur < 0 ? open.text : null;
      if (now?.text !== openText) {
        if (open && open.dur < 0) open.dur = at - open.at;
        if (now) rec.captions.push({ at, dur: -1, label: now.label, text: now.text });
      }
    }
    if (!(this.transport === 'play' && !this.paused) || !c) {
      subtitles.set('tape', null);
      return;
    }
    const seg = c.segments().find((s) => c.pos >= s.start && c.pos < s.start + s.dur);
    const t = seg ? c.pos - seg.start + seg.offset : 0;
    const caption = seg ? this.captions.get(seg.key)?.find((k) => t >= k.at && t < k.at + (k.dur < 0 ? Infinity : k.dur)) : undefined;
    subtitles.set('tape', caption ? { label: `Casete · lado ${c.side} · ${caption.label.replace('Radio · ', '')}`, line: dynamicLine('jugador', caption.text) } : null);
  }

  /** How fast the reels are turning (for drawing), in tape-seconds per second. */
  get reelSpeed(): number {
    if (this.playAnchor) return 1;
    return this.speed;
  }
}

function toBuffer(ctx: BaseAudioContext, pcm: Int16Array, rate: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, pcm.length), rate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i++) d[i] = pcm[i] / 32768;
  return buffer;
}

function saturationCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * (1 + amount)) / Math.tanh(1 + amount);
  }
  return curve;
}
