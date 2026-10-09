// The sound of the street below: rain, the city far off, and what passes:
// busetas and taxis following their simulated paths (tires on the wet
// asphalt, the diesel idling at a stop, the horn when someone's in the way),
// the reciclador's call, the afilador's whistle, the Lourdes church bells at
// six. Muffled with the window shut, all of it when you open it. From the
// room you hear the rain and only the odd horn or call, faint; look out of
// the window and the street comes up.

import type { AudioEngine } from '../audio/engine';
import { rendered, play } from '../audio/sfx';
import { lineDuration, speak } from '../audio/voices';
import { VEHICLE_LEN, VIEW_W, vehicleSpeed, vehicleX, vehiclesNear, type Honk, type Vehicle } from '../world/street';
import { recicladorCalls } from '../world/life';
import { at } from '../world/clock';
import { bus } from '../world/bus';
import { CALLE } from '../content/calle';
import { subtitles } from '../ui/subtitles';
import { clamp, mulberry32 } from '../util/rng';

const AFILADOR_AT = [at(17, 43), at(17, 44, 10)];
const BELLS_AT = at(18, 0, 4);
/** How much of what happens in the street reaches you: from the room, at the window. */
const EVENTS_ROOM = 0.3;
const EVENTS_WINDOW = 1;

interface Voice {
  gain: GainNode;
  pan: StereoPannerNode;
  tires: GainNode;
  engine: OscillatorNode;
  engineGain: GainNode;
  noise: AudioBufferSourceNode;
}

export class Street {
  private readonly out: GainNode;
  private readonly lowpass: BiquadFilterNode;
  /** Everything that happens down there (not the rain): quiet from the room, clear at the window. */
  private readonly events: GainNode;
  private readonly rng = mulberry32(6);
  private readonly voices = new Map<number, Voice>();
  private played = new Set<string>();
  private lastT: number | null = null;
  private nextCall = 0;
  private callTimer = 0;
  private atWindow = false;
  open = false;

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 1400;
    this.out = ctx.createGain();
    this.out.gain.value = 0.45;
    this.lowpass.connect(this.out).connect(engine.channel('window').input);
    this.events = ctx.createGain();
    this.events.gain.value = EVENTS_ROOM;
    this.events.connect(this.lowpass);

    // steady rain: a broad hiss plus the patter on the glass and the sill
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = 3200;
    hiss.Q.value = 0.3;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.22;
    engine.noiseSource('pink', hiss);
    hiss.connect(hissGain).connect(this.lowpass);

    const patter = ctx.createBufferSource();
    patter.buffer = patterBuffer(ctx);
    patter.loop = true;
    const patterGain = ctx.createGain();
    patterGain.gain.value = 0.5;
    patter.connect(patterGain).connect(engine.channel('window').input);
    patter.start();

    // the city far away
    const hum = ctx.createBiquadFilter();
    hum.type = 'lowpass';
    hum.frequency.value = 260;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.25;
    engine.noiseSource('brown', hum);
    hum.connect(humGain).connect(this.lowpass);

    // looking out of the window brings the street up
    bus.on('closeup:open', ({ id }) => this.look(id === 'window'));
    bus.on('closeup:close', () => this.look(false));
  }

  setOpen(open: boolean): void {
    this.open = open;
    const now = this.engine.ctx.currentTime;
    this.lowpass.frequency.setTargetAtTime(open ? 14000 : 1400, now, 0.15);
    this.out.gain.setTargetAtTime(open ? 1.1 : 0.45, now, 0.15);
  }

  private look(atWindow: boolean): void {
    this.atWindow = atWindow;
    this.events.gain.setTargetAtTime(atWindow ? EVENTS_WINDOW : EVENTS_ROOM, this.engine.ctx.currentTime, 0.35);
  }

  tick(t: number): void {
    // a jump in time (the start, or the clock moved forward): nothing in between happens
    const jumped = this.lastT === null || t - this.lastT > 1 || t < this.lastT;
    const from = jumped ? t : this.lastT!;
    this.lastT = t;

    this.updateVehicles(t, from, jumped);

    // the reciclador
    if (jumped) this.nextCall = recicladorCalls.findIndex((c) => c.t > t);
    while (this.nextCall >= 0 && this.nextCall < recicladorCalls.length && recicladorCalls[this.nextCall].t <= t) {
      const call = recicladorCalls[this.nextCall++];
      if (call.t > from) this.call(call.x, this.nextCall);
    }

    for (const [i, when] of AFILADOR_AT.entries()) {
      if (t >= when && !this.played.has(`afilador${i}`)) {
        this.played.add(`afilador${i}`);
        if (t - when < 2) this.afilador();
      }
    }
    if (t >= BELLS_AT && !this.played.has('bells')) {
      this.played.add('bells');
      if (t - BELLS_AT < 3) this.bells();
    }
  }

  // ---------- vehicles ----------

  private updateVehicles(t: number, from: number, jumped: boolean): void {
    const ctx = this.engine.ctx;
    const near = vehiclesNear(t);
    const keep = new Set(near.map((v) => v.id));
    for (const [id, voice] of this.voices) {
      if (!keep.has(id)) {
        this.release(voice);
        this.voices.delete(id);
      }
    }
    for (const v of near) {
      let voice = this.voices.get(v.id);
      if (!voice) {
        voice = this.voice(v);
        this.voices.set(v.id, voice);
      }
      const len = VEHICLE_LEN[v.kind];
      const center = vehicleX(v, t) + len / 2;
      const speed = vehicleSpeed(v, t);
      const bus = v.kind === 'buseta';
      const near01 = 1 - Math.min(1, Math.abs(center - VIEW_W / 2) / 1500);
      const loud = near01 * near01;
      const now = ctx.currentTime;
      voice.pan.pan.setTargetAtTime(clamp((center - VIEW_W / 2) / 900, -1, 1) * 0.85, now, 0.08);
      voice.gain.gain.setTargetAtTime(loud, now, 0.08);
      voice.tires.gain.setTargetAtTime(Math.min(1, speed / 220) * (bus ? 0.55 : 0.4), now, 0.08);
      // the engine: up with speed; a buseta stopped at the curb idles, loud and rough
      const idle = bus && speed < 8 ? 1 : 0;
      voice.engine.frequency.setTargetAtTime((bus ? 36 : 50) + speed * (bus ? 0.07 : 0.1) + idle * 4, now, 0.15);
      voice.engineGain.gain.setTargetAtTime((bus ? 0.42 : 0.16) * (0.45 + 0.55 * Math.min(1, speed / 160)) + idle * 0.25, now, 0.15);

      if (jumped) continue;
      for (const h of v.honks) if (h.t > from && h.t <= t) this.honk(v, h.kind, center);
      // a buseta's brakes as it pulls over
      if (v.stop && v.stop.from - 1.3 > from && v.stop.from - 1.3 <= t) this.squeal(center);
    }
  }

  private voice(v: Vehicle): Voice {
    const ctx = this.engine.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const pan = ctx.createStereoPanner();
    gain.connect(pan).connect(this.events);
    // tires on wet asphalt
    const tiresFilter = ctx.createBiquadFilter();
    tiresFilter.type = 'bandpass';
    tiresFilter.frequency.value = v.kind === 'buseta' ? 1500 : 1900;
    tiresFilter.Q.value = 0.5;
    const tires = ctx.createGain();
    tires.gain.value = 0;
    const noise = this.engine.noiseSource('white', tiresFilter, this.rng() * 3);
    tiresFilter.connect(tires).connect(gain);
    // the engine
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 50;
    const engLp = ctx.createBiquadFilter();
    engLp.type = 'lowpass';
    engLp.frequency.value = v.kind === 'buseta' ? 380 : 260;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engine.connect(engLp).connect(engineGain).connect(gain);
    engine.start();
    return { gain, pan, tires, engine, engineGain, noise };
  }

  private release(voice: Voice): void {
    const when = this.engine.ctx.currentTime + 0.3;
    voice.gain.gain.setTargetAtTime(0, this.engine.ctx.currentTime, 0.08);
    voice.engine.stop(when);
    voice.noise.stop(when);
  }

  /** A short toot, a double "pi-pi" at someone on the sidewalk, or a long impatient one. */
  private honk(v: Vehicle, kind: Honk, center: number): void {
    const ctx = this.engine.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((center - VIEW_W / 2) / 900, -1, 1) * 0.85;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.connect(pan).connect(this.events);
    const tones = v.kind === 'buseta' ? [370, 466] : v.kind === 'taxi' ? [440, 554] : v.id % 2 ? [415, 523] : [392, 494];
    const beeps = kind === 'double' ? [[0, 0.1], [0.17, 0.1]] : kind === 'toot' ? [[0, 0.16]] : [[0, 0.5], [0.62, 0.14]];
    const t0 = ctx.currentTime + 0.02;
    for (const f of tones) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      for (const [start, dur] of beeps) {
        g.gain.setValueAtTime(0, t0 + start);
        g.gain.linearRampToValueAtTime(0.05, t0 + start + 0.015);
        g.gain.setValueAtTime(0.05, t0 + start + dur - 0.02);
        g.gain.linearRampToValueAtTime(0, t0 + start + dur);
      }
      osc.connect(g).connect(lp);
      osc.start(t0);
      osc.stop(t0 + 1.3);
    }
  }

  /** Worn brake shoes on a wet drum: a short squeal. */
  private squeal(center: number): void {
    const ctx = this.engine.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((center - VIEW_W / 2) / 900, -1, 1) * 0.85;
    pan.connect(this.events);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(2350, t0);
    osc.frequency.linearRampToValueAtTime(2050, t0 + 0.9);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 23;
    const depth = ctx.createGain();
    depth.gain.value = 30;
    wobble.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.035, t0 + 0.12);
    g.gain.linearRampToValueAtTime(0.02, t0 + 0.7);
    g.gain.linearRampToValueAtTime(0, t0 + 1);
    osc.connect(g).connect(pan);
    osc.start(t0);
    wobble.start(t0);
    osc.stop(t0 + 1.05);
    wobble.stop(t0 + 1.05);
  }

  // ---------- the reciclador ----------

  /** "¡Botella, papel!": his voice if it's been recorded, and the words on screen either way. */
  private call(x: number, n: number): void {
    const line = n % 3 === 0 ? CALLE.botellaLarga : CALLE.botella;
    const ctx = this.engine.ctx;
    speak(ctx, line.id, (buffer, offset) => {
      const pan = ctx.createStereoPanner();
      pan.pan.value = clamp((x - VIEW_W / 2) / 900, -1, 1) * 0.85;
      pan.connect(this.events);
      play(ctx, buffer, pan, { gain: 1.1, offset });
    });
    const heard = this.open ? 1 : this.atWindow ? 0.8 : 0.45;
    subtitles.set('street', { label: 'Desde la calle', line, clarity: heard, showWho: true });
    clearTimeout(this.callTimer);
    this.callTimer = window.setTimeout(() => subtitles.set('street', null), lineDuration(line) * 1000 + 600);
  }

  /** The knife sharpener's pan flute, going up and down the scale. */
  private afilador(): void {
    const ctx = this.engine.ctx;
    const buffer = rendered(ctx, 'afilador', 2.8, (d, sr) => {
      const notes = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0];
      const base = 880;
      let phase = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const k = Math.min(notes.length - 1, Math.floor(t / 0.16));
        const f = base * Math.pow(2, notes[k] / 12);
        phase += (2 * Math.PI * f) / sr;
        const env = Math.min(1, t * 20) * Math.max(0, 1 - Math.max(0, t - 2.3) / 0.5);
        d[i] = (Math.sin(phase) * 0.7 + (Math.random() - 0.5) * 0.12) * env * 0.5;
      }
    });
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.5;
    pan.connect(this.events);
    play(ctx, buffer, pan, { gain: 0.5 });
  }

  /** Six o'clock at the Lourdes church in Chapinero. */
  private bells(): void {
    const ctx = this.engine.ctx;
    const buffer = rendered(ctx, 'church-bell', 5, (d, sr) => {
      const partials = [
        [0.5, 0.5, 3.5],
        [1, 1, 2.6],
        [1.19, 0.6, 2.0],
        [1.5, 0.4, 1.6],
        [2, 0.35, 1.2],
        [2.52, 0.2, 0.9],
      ];
      const f0 = 330;
      for (const [ratio, amp, decay] of partials) {
        const f = f0 * ratio;
        for (let i = 0; i < d.length; i++) {
          const t = i / sr;
          d[i] += Math.sin(2 * Math.PI * f * t) * amp * Math.exp(-t / decay) * 0.25;
        }
      }
    });
    const pan = ctx.createStereoPanner();
    pan.pan.value = -0.4;
    pan.connect(this.lowpass);
    for (let i = 0; i < 6; i++) play(ctx, buffer, pan, { gain: 0.3, when: ctx.currentTime + i * 2.4 });
  }
}

/** Rain on the glass and the sill: many soft ticks, looped. */
function patterBuffer(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 7;
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    for (let n = 0; n < seconds * 260; n++) {
      const start = Math.floor(Math.random() * (d.length - 400));
      const amp = Math.pow(Math.random(), 3) * 0.12;
      const f = 1800 + Math.random() * 3200;
      const len = 120 + Math.floor(Math.random() * 260);
      for (let i = 0; i < len; i++) d[start + i] += Math.sin((2 * Math.PI * f * i) / ctx.sampleRate) * amp * Math.exp(-i / (len / 5));
    }
    // a gutter dripping, slow and regular
    for (let k = 0; k < seconds / 1.3; k++) {
      const start = Math.floor((k * 1.3 + c * 0.4) * ctx.sampleRate);
      for (let i = 0; i < 2400 && start + i < d.length; i++) d[start + i] += Math.sin((2 * Math.PI * 620 * i) / ctx.sampleRate) * 0.08 * Math.exp(-i / 500);
    }
  }
  return buffer;
}
