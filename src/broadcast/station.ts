// A radio station: its content (StationDef) turned into a live running order.

import { Timeline, type Measured } from './timeline';
import type { Cue, Scheduled, Segment } from './types';
import type { StationDef, Dedication } from '../content/stations';
import { requestIntro } from '../content/stations';
import { song } from '../content/songs';
import type { Line } from '../content/lines';
import { library } from '../audio/library';
import { lineDuration } from '../audio/voices';
import { at } from '../world/clock';
import { mulberry32, pick, shuffle, type Rng } from '../util/rng';

export const JINGLE_SECONDS = 3.2;
const ANTHEM_AT = at(18, 0);

export class Station {
  readonly timeline: Timeline;
  private readonly rng: Rng;
  private slot = 0;
  private bag: string[] = [];
  private lastSong = '';
  private counters = { talk: 0, ads: 0, news: 0, id: 0 };

  constructor(readonly def: StationDef) {
    this.rng = mulberry32(def.seed);
    this.slot = Math.floor(this.rng() * def.format.length);
    this.timeline = new Timeline({
      from: -120 - this.rng() * 240,
      next: (start) => this.next(start),
      measure: (seg) => this.measure(seg),
      hardBreak: {
        at: ANTHEM_AT,
        seg: () => (library.anthemLength() !== undefined ? { kind: 'anthem' } : null),
      },
    });
  }

  private nextSong(): string {
    if (this.bag.length === 0) {
      this.bag = shuffle(this.rng, [...this.def.catalog, ...(this.def.heavy ?? [])]);
    }
    let id = this.bag.shift()!;
    if (id === this.lastSong && this.bag.length) {
      this.bag.push(id);
      id = this.bag.shift()!;
    }
    this.lastSong = id;
    return id;
  }

  private cycle<T>(key: keyof Station['counters'], pool: T[]): T {
    const item = pool[this.counters[key] % pool.length];
    this.counters[key]++;
    return item;
  }

  private next(start: number): Segment {
    const def = this.def;
    const slot = def.format[this.slot++ % def.format.length];
    switch (slot) {
      case 'song': {
        if (!def.catalog.length) return this.next(start);
        const songId = this.nextSong();
        // what will really play: your file, a house track standing in, or a placeholder
        const audio = library.audioFor(songId, def.id);
        const talkOver = this.rng() < 0.6;
        const generic = () => (def.genericIntros.length ? pick(this.rng, def.genericIntros) : undefined);
        // the DJ only names what's true: a stand-in gets its band's name if it's the same band, or a generic intro
        const stand = library.houseTrack(audio);
        const named = stand ? (stand.artist === song(songId).artist ? def.bandIntros?.[stand.artist] : undefined) : def.intros[songId];
        const over = talkOver ? (named ?? generic()) : undefined;
        return { kind: 'song', songId, audio, over };
      }
      case 'talk':
        return { kind: 'talk', lines: this.cycle('talk', def.talks) };
      case 'ads': {
        const a = this.cycle('ads', def.ads);
        const b = this.cycle('ads', def.ads);
        return { kind: 'ad', lines: a === b ? a : [...a, ...b] };
      }
      case 'id':
        return { kind: 'id', lines: this.cycle('id', def.ids) };
      case 'news':
        return def.news ? { kind: 'news', lines: this.cycle('news', def.news) } : this.next(start);
      case 'time':
        return { kind: 'talk', lines: def.timeCheck(start + 1) };
      case 'request':
        return def.requestLine ? { kind: 'talk', lines: def.requestLine.announce } : this.next(start);
    }
  }

  private cues(lines: Line[], from: number, gap: number): Cue[] {
    const cues: Cue[] = [];
    let t = from;
    for (const line of lines) {
      const dur = lineDuration(line, this.def.pace);
      cues.push({ line, at: t, dur });
      t += dur + gap;
    }
    return cues;
  }

  measure(seg: Segment): Measured {
    const end = (cues: Cue[], tail: number) => (cues.length ? cues[cues.length - 1].at + cues[cues.length - 1].dur + tail : tail);
    switch (seg.kind) {
      case 'song': {
        const { duration } = library.shape(seg.songId, seg.audio ?? null);
        return { dur: duration, cues: this.cues(seg.over ?? [], 0.8, 0.25) };
      }
      case 'talk': {
        const cues = this.cues(seg.lines, 0.5, 0.35);
        return { dur: end(cues, 0.9), cues };
      }
      case 'ad': {
        const cues = this.cues(seg.lines, 0.6, 0.9);
        return { dur: end(cues, 0.8), cues };
      }
      case 'id': {
        const cues = this.cues(seg.lines, 0.9, 0.3);
        return { dur: Math.max(JINGLE_SECONDS + 0.2, end(cues, 0.4)), cues };
      }
      case 'news': {
        const cues = this.cues(seg.lines, 1.6, 0.6);
        return { dur: end(cues, 1.4), cues };
      }
      case 'anthem': {
        return { dur: (library.anthemLength() ?? 60) + 1.5, cues: [] };
      }
      case 'silence':
        return { dur: seg.dur, cues: [] };
    }
  }

  /**
   * A listener called the cabina. After what's on air now and a short ad
   * break, the DJ plays the song, reading the dedication over the intro.
   * Returns when the song will start.
   */
  request(t: number, songId: string, dedication: Dedication): Scheduled {
    const ads = { kind: 'ad', lines: [...this.cycle('ads', this.def.ads), ...this.cycle('ads', this.def.ads)] } as Segment;
    const audio = library.audioFor(songId, this.def.id);
    const requested: Segment = { kind: 'song', songId, audio, over: requestIntro(songId, dedication, library.houseTrack(audio)), request: { dedication } };
    const [, placed] = this.timeline.rewrite(t, [ads, requested]);
    library.prefetch([{ songId, audio }]);
    return placed;
  }

  /** Songs coming up soon (to get their audio ready ahead of time). */
  upcomingSongs(t: number, horizon = 600): { songId: string; audio: string | null }[] {
    this.timeline.ensure(t + horizon);
    return this.timeline.items
      .filter((i) => i.end > t && i.start < t + horizon && i.seg.kind === 'song')
      .map((i) => {
        const seg = i.seg as { songId: string; audio?: string | null };
        return { songId: seg.songId, audio: seg.audio ?? null };
      });
  }
}
