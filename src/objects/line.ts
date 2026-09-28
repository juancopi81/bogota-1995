// What you hear in the handset: Colombian call-progress tones (425 Hz),
// the pulses of the dial, the exchange thinking, the other house in the
// background, and voices — all squeezed through a telephone's narrow band.

import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';

export type Tone = 'none' | 'dial' | 'ringback' | 'busy' | 'sit';

/** Cadences in seconds: [on, off, on, off...]. From ITU tone plans for Colombia. */
const CADENCE: Record<Exclude<Tone, 'none' | 'dial'>, number[]> = {
  ringback: [1.0, 4.5],
  busy: [0.25, 0.25],
  sit: [0.333, 0.0, 0.333, 0.0, 0.333, 1.0],
};
const SIT_FREQS = [950, 1400, 1800];

export type Ambience = 'none' | 'kitchen' | 'tv' | 'office' | 'street' | 'radio';

export class PhoneLine {
  /** The line's signal, already band-limited. */
  readonly out: GainNode;
  private readonly bus: GainNode;
  private readonly osc: OscillatorNode;
  private readonly toneGain: GainNode;
  private readonly hiss: GainNode;
  private readonly bed: GainNode;
  private readonly bedFilter: BiquadFilterNode;
  private tone: Tone = 'none';
  private toneStarted = 0;
  private scheduledUntil = 0;
  private cadenceIndex = 0;
  private voices = new Set<AudioBufferSourceNode>();

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.bus = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 320;
    hp.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3300;
    lp.Q.value = 0.9;
    const grit = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8);
    }
    grit.curve = curve;
    this.out = ctx.createGain();
    this.bus.connect(hp).connect(lp).connect(grit).connect(this.out);

    this.osc = ctx.createOscillator();
    this.osc.frequency.value = 425;
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0;
    this.osc.connect(this.toneGain).connect(this.bus);
    this.osc.start();

    // the faint hiss and hum of a copper line
    this.hiss = ctx.createGain();
    this.hiss.gain.value = 0;
    engine.noiseSource('pink', this.hiss);
    const hum = ctx.createOscillator();
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.004;
    hum.connect(humGain).connect(this.hiss);
    hum.start();
    this.hiss.connect(this.bus);

    // the other house, heard behind the voice: a TV, a kitchen, a street
    this.bedFilter = ctx.createBiquadFilter();
    this.bedFilter.type = 'bandpass';
    this.bedFilter.frequency.value = 700;
    this.bedFilter.Q.value = 0.8;
    this.bed = ctx.createGain();
    this.bed.gain.value = 0;
    engine.noiseSource('brown', this.bedFilter);
    this.bedFilter.connect(this.bed).connect(this.bus);
  }

  /** The line is live (handset off the hook). */
  setOpen(open: boolean): void {
    const now = this.engine.ctx.currentTime;
    this.hiss.gain.setTargetAtTime(open ? 0.018 : 0, now, 0.02);
    if (!open) {
      this.setTone('none');
      this.setAmbience('none');
      this.stopVoices();
    }
  }

  setTone(tone: Tone): void {
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    this.tone = tone;
    this.toneStarted = now;
    this.cadenceIndex = 0;
    this.scheduledUntil = now;
    this.toneGain.gain.cancelScheduledValues(now);
    this.toneGain.gain.setTargetAtTime(tone === 'dial' ? 0.22 : 0, now, 0.005);
    if (tone === 'dial') this.osc.frequency.setValueAtTime(425, now);
    this.scheduleAhead();
  }

  get currentTone(): Tone {
    return this.tone;
  }

  /** Seconds since the current tone started. */
  get toneAge(): number {
    return this.engine.ctx.currentTime - this.toneStarted;
  }

  /** Keep the tone cadence scheduled a couple of seconds ahead. */
  scheduleAhead(): void {
    if (this.tone === 'none' || this.tone === 'dial') return;
    const ctx = this.engine.ctx;
    const cadence = CADENCE[this.tone];
    const g = this.toneGain.gain;
    while (this.scheduledUntil < ctx.currentTime + 2) {
      const i = this.cadenceIndex % cadence.length;
      const dur = cadence[i];
      const at = this.scheduledUntil;
      if (i % 2 === 0) {
        if (this.tone === 'sit') this.osc.frequency.setValueAtTime(SIT_FREQS[(i / 2) % 3], at);
        else this.osc.frequency.setValueAtTime(425, at);
        g.setValueAtTime(0, at);
        g.linearRampToValueAtTime(this.tone === 'sit' ? 0.15 : 0.22, at + 0.008);
        g.setValueAtTime(this.tone === 'sit' ? 0.15 : 0.22, at + dur - 0.008);
        g.linearRampToValueAtTime(0, at + dur);
      }
      this.scheduledUntil = at + dur;
      this.cadenceIndex++;
    }
  }

  /** A dial pulse, heard as a click on the line. */
  pulse(when?: number): void {
    play(this.engine.ctx, sfx.pulse(this.engine.ctx), this.bus, { gain: 0.5, when });
  }

  /** The exchange's relays working (electromechanical switching). */
  relays(count = 3): void {
    const ctx = this.engine.ctx;
    for (let i = 0; i < count; i++) {
      play(ctx, sfx.pulse(ctx), this.bus, { gain: 0.12 + Math.random() * 0.12, when: ctx.currentTime + 0.2 + i * (0.25 + Math.random() * 0.4), rate: 0.6 + Math.random() * 0.5 });
    }
  }

  /** Somebody picks up (or hangs up) at the other end. */
  click(): void {
    play(this.engine.ctx, sfx.hook(this.engine.ctx), this.bus, { gain: 0.4, rate: 0.8 });
  }

  setAmbience(kind: Ambience): void {
    const now = this.engine.ctx.currentTime;
    const settings: Record<Ambience, [number, number]> = {
      none: [0, 700],
      kitchen: [0.05, 900],
      tv: [0.06, 1300],
      office: [0.035, 1100],
      street: [0.07, 500],
      radio: [0.06, 1600],
    };
    const [gain, freq] = settings[kind];
    this.bed.gain.setTargetAtTime(gain, now, 0.2);
    this.bedFilter.frequency.setTargetAtTime(freq, now, 0.2);
  }

  /** Play a recorded voice through the line. */
  voice(buffer: AudioBuffer): number {
    const source = play(this.engine.ctx, buffer, this.bus, { gain: 1.2 });
    this.voices.add(source);
    source.addEventListener('ended', () => this.voices.delete(source));
    return buffer.duration;
  }

  stopVoices(): void {
    for (const v of this.voices) {
      try {
        v.stop();
      } catch {
        /* ended */
      }
    }
    this.voices.clear();
  }
}
