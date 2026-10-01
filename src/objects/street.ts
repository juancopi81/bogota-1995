// The sound of the street below: rain, wet tires, busetas and their horns,
// the afilador's whistle, the Lourdes church bells at six. Muffled with the
// window shut, all of it when you open it.

import type { AudioEngine } from '../audio/engine';
import { rendered, play } from '../audio/sfx';
import { traffic, passTime, type Vehicle } from '../world/street';
import { at } from '../world/clock';
import { mulberry32 } from '../util/rng';

const AFILADOR_AT = [at(17, 43), at(17, 44, 10)];
const BELLS_AT = at(18, 0, 4);

export class Street {
  private readonly out: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly rng = mulberry32(6);
  private nextVehicle = 0;
  private played = new Set<string>();
  open = false;

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 1400;
    this.out = ctx.createGain();
    this.out.gain.value = 0.45;
    this.lowpass.connect(this.out).connect(engine.channel('window').input);

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

    // skip the vehicles that already passed before we arrived
    this.nextVehicle = traffic.findIndex((v) => passTime(v) > 0);
  }

  setOpen(open: boolean): void {
    this.open = open;
    const now = this.engine.ctx.currentTime;
    this.lowpass.frequency.setTargetAtTime(open ? 14000 : 1400, now, 0.15);
    this.out.gain.setTargetAtTime(open ? 1.1 : 0.45, now, 0.15);
  }

  tick(t: number): void {
    // traffic, a couple of seconds ahead of time
    while (this.nextVehicle >= 0 && this.nextVehicle < traffic.length) {
      const v = traffic[this.nextVehicle];
      const pass = passTime(v);
      if (pass - t > 2) break;
      if (pass - t > -3) this.vehicle(v, pass - t);
      this.nextVehicle++;
    }
    for (const [i, when] of AFILADOR_AT.entries()) {
      if (t >= when && !this.played.has(`afilador${i}`)) {
        this.played.add(`afilador${i}`);
        this.afilador();
      }
    }
    if (t >= BELLS_AT && !this.played.has('bells')) {
      this.played.add('bells');
      this.bells();
    }
  }

  /** A vehicle hissing past on the wet street, maybe with a toot of the horn. */
  private vehicle(v: Vehicle, inSeconds: number): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + Math.max(0, inSeconds) - 2.6;
    const bus = v.kind === 'buseta';
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    g.connect(pan).connect(this.lowpass);
    const peak = bus ? 0.55 : 0.32;
    g.gain.setValueAtTime(0, Math.max(ctx.currentTime, t0));
    g.gain.linearRampToValueAtTime(peak, t0 + 2.6);
    g.gain.linearRampToValueAtTime(0, t0 + 5.4);
    pan.pan.setValueAtTime(-0.8 * v.dir, Math.max(ctx.currentTime, t0));
    pan.pan.linearRampToValueAtTime(0.8 * v.dir, t0 + 5.4);
    // tires on wet asphalt
    const tires = ctx.createBiquadFilter();
    tires.type = 'bandpass';
    tires.frequency.value = 1800;
    tires.Q.value = 0.5;
    const noise = this.engine.noiseSource('white', tires, this.rng() * 3);
    tires.connect(g);
    noise.stop(t0 + 6);
    // the engine: a buseta's diesel grumble
    const engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(bus ? 46 : 62, Math.max(ctx.currentTime, t0));
    engineOsc.frequency.linearRampToValueAtTime(bus ? 38 : 55, t0 + 5.4);
    const engLp = ctx.createBiquadFilter();
    engLp.type = 'lowpass';
    engLp.frequency.value = bus ? 380 : 260;
    const engGain = ctx.createGain();
    engGain.gain.value = bus ? 0.5 : 0.2;
    engineOsc.connect(engLp).connect(engGain).connect(g);
    engineOsc.start(Math.max(ctx.currentTime, t0));
    engineOsc.stop(t0 + 6);
    if (v.honk) {
      const when = t0 + 1.6 + this.rng() * 1.5;
      const tones = bus ? [392, 494] : [440, 554];
      for (const f of tones) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f;
        const hg = ctx.createGain();
        hg.gain.setValueAtTime(0, when);
        hg.gain.linearRampToValueAtTime(0.05, when + 0.02);
        hg.gain.setValueAtTime(0.05, when + 0.34);
        hg.gain.linearRampToValueAtTime(0, when + 0.4);
        const hl = ctx.createBiquadFilter();
        hl.type = 'lowpass';
        hl.frequency.value = 2200;
        osc.connect(hl).connect(hg).connect(g);
        osc.start(when);
        osc.stop(when + 0.45);
      }
    }
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
    pan.connect(this.lowpass);
    play(ctx, buffer, pan, { gain: 0.35 });
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
