// Plays a station's running order into an audio node, locked to the world
// clock. Only stations you can actually hear are playing; tuning in joins
// whatever is on air, at the right point.

import type { Station } from './station';
import { JINGLE_SECONDS } from './station';
import type { Cue, Scheduled } from './types';
import { library } from '../audio/library';
import { voices } from '../audio/voices';
import { clock } from '../world/clock';
import { bus } from '../world/bus';

interface Playing {
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
}

export class StationPlayer {
  readonly out: GainNode;
  private active = false;
  private playing = new Map<Scheduled, Playing>();
  private airedRequests = new WeakSet<Scheduled>();

  constructor(
    private readonly ctx: AudioContext,
    readonly station: Station,
  ) {
    this.out = ctx.createGain();
    bus.on('clock:skip', () => this.restart());
  }

  get isActive(): boolean {
    return this.active;
  }

  setActive(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    if (!on) this.stopAll();
  }

  restart(): void {
    this.stopAll();
  }

  private stopAll(): void {
    for (const item of [...this.playing.keys()]) this.stopItem(item);
  }

  private stopItem(item: Scheduled): void {
    const p = this.playing.get(item);
    if (!p) return;
    const now = this.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setTargetAtTime(0, now, 0.02);
    for (const s of p.sources) {
      try {
        s.stop(now + 0.1);
      } catch {
        /* already stopped */
      }
    }
    setTimeout(() => p.gain.disconnect(), 300);
    this.playing.delete(item);
  }

  tick(t: number): void {
    const timeline = this.station.timeline;
    const current = timeline.at(t);
    if (current && current.seg.kind === 'song' && current.seg.request && !this.airedRequests.has(current)) {
      this.airedRequests.add(current);
      bus.emit('radio:request-aired', { stationId: this.station.def.id, songId: current.seg.songId, dedication: current.seg.request.dedication });
    }
    if (!this.active) return;
    // drop what has finished
    for (const item of [...this.playing.keys()]) if (item.end < t - 0.5 || (current && item.start > current.end + 5)) this.stopItem(item);
    if (current && !this.playing.has(current)) this.schedule(current, t);
    if (current) {
      const next = timeline.after(current);
      if (next && next.start - t < 1.5 && !this.playing.has(next)) this.schedule(next, t);
    }
  }

  /** What is being said right now (for subtitles). */
  cueAt(t: number): { item: Scheduled; cue: Cue | null } | null {
    const item = this.station.timeline.at(t);
    if (!item) return null;
    const rel = t - item.start;
    const cue = item.cues.find((c) => rel >= c.at && rel < c.at + c.dur) ?? null;
    return { item, cue };
  }

  private schedule(item: Scheduled, _t: number): void {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.connect(this.out);
    const playing: Playing = { gain, sources: [] };
    this.playing.set(item, playing);

    const startCtx = clock.toCtx(item.start);
    const endCtx = clock.toCtx(item.end);
    const now = ctx.currentTime;
    // fade out segments that get cut (the anthem at six)
    if (item.cut) {
      gain.gain.setValueAtTime(1, Math.max(now, endCtx - 1.2));
      gain.gain.linearRampToValueAtTime(0, endCtx);
    }

    const play = (buffer: AudioBuffer, at: number, opts: { loop?: boolean; level?: number; until?: number } = {}) => {
      if (!this.playing.has(item)) return;
      const n = ctx.currentTime;
      const when = Math.max(n, at);
      const offset = Math.max(0, n - at);
      if (!opts.loop && offset >= buffer.duration) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = !!opts.loop;
      let dest: AudioNode = gain;
      if (opts.level !== undefined) {
        const g = ctx.createGain();
        g.gain.value = opts.level;
        g.connect(gain);
        dest = g;
      }
      source.connect(dest);
      source.start(when, opts.loop ? offset % buffer.duration : offset);
      const until = opts.until ?? endCtx;
      source.stop(Math.max(when + 0.05, until));
      playing.sources.push(source);
    };

    const voicesAt = (cues: Cue[]) => {
      for (const cue of cues) {
        const buffer = voices.get(cue.line.id);
        if (buffer) play(buffer, startCtx + cue.at, { until: startCtx + cue.at + buffer.duration + 0.1 });
      }
    };

    const def = this.station.def;
    const seg = item.seg;
    const withBuffer = (ready: AudioBuffer | undefined, later: () => Promise<AudioBuffer>, use: (b: AudioBuffer) => void) => {
      if (ready) use(ready);
      else void later().then(use);
    };

    switch (seg.kind) {
      case 'song': {
        // a loaded file can start and stop mid-phrase (30-second previews do): soften the edges
        if (seg.audio) {
          gain.gain.setValueAtTime(0, startCtx);
          gain.gain.linearRampToValueAtTime(1, startCtx + 0.4);
          if (!item.cut) {
            gain.gain.setValueAtTime(1, Math.max(startCtx + 0.4, endCtx - 1.8));
            gain.gain.linearRampToValueAtTime(0, endCtx);
          }
        }
        withBuffer(library.song(seg.songId, seg.audio ?? null), () => library.whenSong(seg.songId, seg.audio ?? null), (b) => play(b, startCtx));
        // the DJ ducks the music a little while talking over the intro
        voicesAt(item.cues);
        break;
      }
      case 'talk':
        withBuffer(library.bed(def.id), () => library.whenBed(def.id, def.bed), (b) => play(b, startCtx, { loop: true, level: def.band === 'AM' ? 0.12 : 0.3 }));
        voicesAt(item.cues);
        break;
      case 'ad':
        withBuffer(library.peek(`jingle:${def.id}`), () => library.whenJingle(def.id, def.jingle), (b) => play(b, startCtx, { level: 0.5, until: startCtx + JINGLE_SECONDS }));
        withBuffer(library.bed(def.id), () => library.whenBed(def.id, def.bed), (b) => play(b, startCtx + 0.4, { loop: true, level: 0.18 }));
        voicesAt(item.cues);
        break;
      case 'id':
        withBuffer(library.peek(`jingle:${def.id}`), () => library.whenJingle(def.id, def.jingle), (b) => play(b, startCtx, { level: 0.9 }));
        voicesAt(item.cues);
        break;
      case 'news':
        withBuffer(library.peek('teletype'), () => library.whenTeletype(), (b) => play(b, startCtx, { loop: true, level: 0.28 }));
        voicesAt(item.cues);
        break;
      case 'anthem': {
        const anthem = library.anthem();
        if (anthem) play(anthem, startCtx + 0.8);
        break;
      }
      case 'silence':
        break;
    }
  }
}
