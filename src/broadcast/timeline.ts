// A station's (or a TV channel's) running order.
//
// The timeline is generated forward in world time, one segment after
// another, like a radio automation log. The past never changes; the future
// can be rewritten (a request taken on the phone, a song loaded in the
// backstage), and a hard break can be forced at an exact time (the anthem at
// 6:00 p.m. cuts whatever is on air).

import type { Cue, Scheduled, Segment } from './types';

export interface Measured {
  dur: number;
  cues: Cue[];
}

export interface TimelineOptions {
  /** Produce the next segment to air, given the time it will start. */
  next: (start: number) => Segment;
  /** How long a segment lasts and where its lines fall. */
  measure: (seg: Segment, start: number) => Measured;
  /** When the log begins (before the room opens, so t = 0 lands mid-segment). */
  from: number;
  /** A time at which whatever is on air is cut for a special segment (or null to skip it). */
  hardBreak?: { at: number; seg: () => Segment | null };
}

export class Timeline {
  readonly items: Scheduled[] = [];
  private breakDone = false;

  constructor(private readonly opts: TimelineOptions) {}

  private lastEnd(): number {
    return this.items.length ? this.items[this.items.length - 1].end : this.opts.from;
  }

  private place(seg: Segment, start: number): Scheduled {
    const { dur, cues } = this.opts.measure(seg, start);
    const item: Scheduled = { start, end: start + dur, seg, cues };
    this.items.push(item);
    return item;
  }

  /** Append a segment, honoring the hard break. */
  private push(seg: Segment): Scheduled {
    const hb = this.opts.hardBreak;
    if (hb && !this.breakDone && this.lastEnd() >= hb.at) {
      // the previous segment ended exactly at (or, oddly, after) the break
      this.breakDone = true;
      const special = hb.seg();
      if (special && this.lastEnd() - hb.at < 0.5) this.place(special, this.lastEnd());
    }
    const item = this.place(seg, this.lastEnd());
    if (hb && !this.breakDone && item.start < hb.at && item.end > hb.at) {
      this.breakDone = true;
      const special = hb.seg();
      if (special) {
        item.end = hb.at;
        item.cut = true;
        item.cues = item.cues.filter((c) => c.at < hb.at - item.start);
        this.place(special, hb.at);
      }
    }
    return item;
  }

  /** Generate segments until the log covers time `until`. */
  ensure(until: number): void {
    let guard = 0;
    while (this.lastEnd() <= until && guard++ < 2000) this.push(this.opts.next(this.lastEnd()));
  }

  /** The segment on air at time t. */
  at(t: number): Scheduled | undefined {
    this.ensure(t + 1);
    // search from the end: callers almost always ask about "now"
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.start <= t && t < item.end) return item;
      if (item.end <= t) break;
    }
    return undefined;
  }

  /** The segment that follows `item`. */
  after(item: Scheduled): Scheduled | undefined {
    this.ensure(item.end + 1);
    const i = this.items.indexOf(item);
    return i >= 0 ? this.items[i + 1] : undefined;
  }

  /**
   * Rewrite the future: keep everything up to the segment on air at time t
   * (plus the next `keep` segments), then air `segs`, then carry on as usual.
   * Returns the placed segments.
   */
  rewrite(t: number, segs: Segment[], keep = 0): Scheduled[] {
    const current = this.at(t);
    this.ensure((current?.end ?? t) + 900);
    const base = current ? this.items.indexOf(current) : this.items.length - 1;
    const index = Math.min(this.items.length - 1, base + keep);
    this.items.splice(index + 1);
    const hb = this.opts.hardBreak;
    this.breakDone = !hb || this.lastEnd() > hb.at;
    return segs.map((seg) => this.push(seg));
  }

  /** Throw away the unplayed future (a song's length changed, the anthem was loaded). */
  regenerateAfter(t: number): void {
    this.rewrite(t, []);
  }
}
