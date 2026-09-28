// The radio in the grabadora: an analog tuner.
//
// Between stations there is hiss (FM) or crackle and whistles (AM). Near a
// station its signal fades in; right on it, the static almost disappears.
// Everything you hear here is exactly what the deck records.

import { Station } from '../broadcast/station';
import { StationPlayer } from '../broadcast/player';
import { STATIONS } from '../content/stations';
import { song } from '../content/songs';
import { dynamicLine, type Line } from '../content/lines';
import { library } from '../audio/library';
import type { AudioEngine } from '../audio/engine';
import { subtitles } from '../ui/subtitles';
import { kv } from '../world/store';
import { bus } from '../world/bus';
import { clock } from '../world/clock';
import { clamp } from '../util/rng';
import { glide } from '../audio/param';

export type Band = 'FM' | 'AM';

export const FM_RANGE: [number, number] = [87.5, 108];
export const AM_RANGE: [number, number] = [530, 1610];

interface Tuned {
  station: Station;
  player: StationPlayer;
  gain: GainNode;
}

export class Radio {
  readonly out: GainNode;
  power = false;
  band: Band;
  freq: Record<Band, number>;
  /** Set by the deck: while the tape plays, the radio is not heard (but keeps running). */
  audible = true;
  volume = 0.6;

  private readonly tuned: Tuned[];
  private readonly stationsIn: GainNode;
  private readonly bandFilter: BiquadFilterNode;
  private readonly staticGain: GainNode;
  private readonly staticFilter: BiquadFilterNode;
  private readonly crackleGain: GainNode;
  private readonly whistle: OscillatorNode;
  private readonly whistleGain: GainNode;
  private readonly powerGain: GainNode;
  private lastPrefetch = -99;
  private strengths = new Map<Station, number>();

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.band = kv.get<Band>('radio.band', 'FM');
    this.freq = kv.get('radio.freq', { FM: 97.9, AM: 1010 });

    this.out = ctx.createGain();
    this.powerGain = ctx.createGain();
    this.powerGain.gain.value = 0;
    this.powerGain.connect(this.out);

    this.stationsIn = ctx.createGain();
    this.bandFilter = ctx.createBiquadFilter();
    this.bandFilter.type = 'lowpass';
    this.bandFilter.frequency.value = 15000;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 60;
    this.stationsIn.connect(hp).connect(this.bandFilter).connect(this.powerGain);

    // static: hiss for FM, crackle for AM
    this.staticFilter = ctx.createBiquadFilter();
    this.staticFilter.type = 'lowpass';
    this.staticFilter.frequency.value = 9000;
    this.staticGain = ctx.createGain();
    this.staticGain.gain.value = 0;
    engine.noiseSource('white', this.staticFilter);
    this.staticFilter.connect(this.staticGain).connect(this.powerGain);

    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer(ctx);
    crackle.loop = true;
    crackle.connect(this.crackleGain).connect(this.powerGain);
    crackle.start();

    this.whistle = ctx.createOscillator();
    this.whistle.type = 'sine';
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;
    this.whistle.connect(this.whistleGain).connect(this.powerGain);
    this.whistle.start();

    // a song or the anthem was loaded: re-plan what hasn't aired yet
    bus.on('media:loaded', () => {
      for (const { station } of this.tuned) station.timeline.regenerateAfter(clock.now());
    });

    this.tuned = STATIONS.map((def) => {
      const station = new Station(def);
      const player = new StationPlayer(ctx, station);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      player.out.connect(gain).connect(this.stationsIn);
      return { station, player, gain };
    });
  }

  get stations(): Station[] {
    return this.tuned.map((t) => t.station);
  }

  station(id: string): Station {
    return this.tuned.find((t) => t.station.def.id === id)!.station;
  }

  setPower(on: boolean): void {
    this.power = on;
    bus.emit('radio:changed', undefined);
  }

  setBand(band: Band): void {
    this.band = band;
    kv.set('radio.band', band);
    bus.emit('radio:changed', undefined);
  }

  tune(freq: number): void {
    const [lo, hi] = this.band === 'FM' ? FM_RANGE : AM_RANGE;
    this.freq[this.band] = clamp(freq, lo, hi);
    kv.set('radio.freq', this.freq);
  }

  /** How well a station comes in at the current tuning (0–1). */
  strength(station: Station): number {
    if (station.def.band !== this.band) return 0;
    const d = Math.abs(this.freq[this.band] - station.def.freq);
    const width = this.band === 'FM' ? 0.11 : 7;
    return Math.exp(-((d / width) ** 2));
  }

  /** The station you'd say you are "on", if any. */
  dominant(): { station: Station; strength: number } | null {
    let best: { station: Station; strength: number } | null = null;
    for (const [station, s] of this.strengths) if (!best || s > best.strength) best = { station, strength: s };
    return best && best.strength > 0.02 ? best : null;
  }

  tick(t: number): void {
    const now = this.engine.ctx.currentTime;
    let max = 0;
    let nearestAm = Infinity;
    for (const { station, player, gain } of this.tuned) {
      const s = this.power ? this.strength(station) : 0;
      this.strengths.set(station, s);
      max = Math.max(max, s);
      player.setActive(s > 0.002);
      player.tick(t);
      glide(gain.gain, Math.pow(s, 0.6), now, 0.05);
      if (this.band === 'AM' && station.def.band === 'AM') nearestAm = Math.min(nearestAm, Math.abs(this.freq.AM - station.def.freq));
    }

    const fm = this.band === 'FM';
    const miss = 1 - max;
    glide(this.staticGain.gain, fm ? 0.018 + 0.2 * Math.pow(miss, 1.3) : 0.006 + 0.05 * miss, now, 0.05);
    glide(this.staticFilter.frequency, fm ? 7000 : 2600, now, 0.1);
    glide(this.crackleGain.gain, fm ? 0 : 0.05 + 0.12 * miss, now, 0.1);
    glide(this.bandFilter.frequency, fm ? 4200 + 10800 * max : 2400 + 2200 * max, now, 0.05);
    // tuning near an AM station you hear the carrier beat: a whistle that drops as you close in
    const whistleOn = !fm && nearestAm < 9 && nearestAm > 0.4;
    glide(this.whistle.frequency, 90 + Math.min(nearestAm, 20) * 190, now, 0.03);
    glide(this.whistleGain.gain, whistleOn ? 0.035 * Math.sin((nearestAm / 9) * Math.PI) : 0, now, 0.05);
    glide(this.powerGain.gain, this.power ? 1 : 0, now, 0.02);

    this.subtitles(t);

    if (t - this.lastPrefetch > 15) {
      this.lastPrefetch = t;
      for (const { station } of this.tuned) library.prefetch(station.upcomingSongs(t, 420));
    }
  }

  /** What can be made out on the air right now (for subtitles, and for the tape). */
  caption(t: number): { label: string; line: Line; clarity: number } | null {
    const dom = this.dominant();
    if (!this.power || !dom || dom.strength < 0.3) return null;
    const player = this.tuned.find((x) => x.station === dom.station)!.player;
    const now = player.cueAt(t);
    const label = `Radio · ${dom.station.def.label}`;
    const clarity = clamp((dom.strength - 0.3) / 0.6, 0, 1);
    if (now?.cue) return { label, line: now.cue.line, clarity };
    if (now && now.item.seg.kind === 'song' && t - now.item.start < 9 && !library.isUploaded(now.item.seg.songId)) {
      const s = song(now.item.seg.songId);
      return { label, line: dynamicLine('jugador', `♪ ${s.artist} — «${s.title}»`), clarity };
    }
    if (now && now.item.seg.kind === 'anthem') return { label, line: dynamicLine('jugador', '♪ Himno Nacional de la República de Colombia'), clarity };
    return null;
  }

  private subtitles(t: number): void {
    const caption = this.audible && this.volume >= 0.04 ? this.caption(t) : null;
    subtitles.set('radio', caption);
  }
}

/** A loop of AM crackle: sparse pops over a low rumble. */
function crackleBuffer(ctx: BaseAudioContext): AudioBuffer {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    lp += (white - lp) * 0.08;
    d[i] = lp * 0.6;
    if (Math.random() < 0.0009) {
      const len = 20 + Math.floor(Math.random() * 120);
      const amp = 0.4 + Math.random() * 0.6;
      for (let j = 0; j < len && i + j < d.length; j++) d[i + j] += (Math.random() * 2 - 1) * amp * (1 - j / len);
    }
  }
  return buffer;
}
