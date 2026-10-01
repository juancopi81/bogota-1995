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

export interface TimelineOptions<S> {
  /** Produce the next segment to air, given the time it will start. */
  next: (start: number) => S;
  /** How long a segment lasts and where its lines fall. */
  measure: (seg: S, start: number) => Measured;
  /** When the log begins (before the room opens, so t = 0 lands mid-segment). */
  from: number;
  /** A time at which whatever is on air is cut for a special segment (or null to skip it). */
  hardBreak?: { at: number; seg: () => S | null };
}

export class Timeline<S = Segment> {
  readonly items: Scheduled<S>[] = [];
  private breakDone = false;

  constructor(private readonly opts: TimelineOptions<S>) {}

  private lastEnd(): number {
    return this.items.length ? this.items[this.items.length - 1].end : this.opts.from;
  }

  private place(seg: S, start: number): Scheduled<S> {
    const { dur, cues } = this.opts.measure(seg, start);
    const item: Scheduled<S> = { start, end: start + dur, seg, cues };
    this.items.push(item);
    return item;
  }

  /** Append a segment, honoring the hard break. */
  private push(seg: S): Scheduled<S> {
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
  at(t: number): Scheduled<S> | undefined {
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
  after(item: Scheduled<S>): Scheduled<S> | undefined {
    this.ensure(item.end + 1);
    const i = this.items.indexOf(item);
    return i >= 0 ? this.items[i + 1] : undefined;
  }

  /**
   * Rewrite the future: keep everything up to the segment on air at time t
   * (plus the next `keep` segments), then air `segs`, then carry on as usual.
   * Returns the placed segments.
   */
  rewrite(t: number, segs: S[], keep = 0): Scheduled<S>[] {
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

  /** Like regenerateAfter, but the segment on air at time t goes too: for before anyone has heard it. */
  replanFrom(t: number): void {
    const current = this.at(t);
    if (current) this.items.splice(this.items.indexOf(current));
    const hb = this.opts.hardBreak;
    this.breakDone = !hb || this.lastEnd() > hb.at;
    this.ensure(t + 1);
  }

  /** Cut whatever is on air at time t short, air `then` (if anything), and carry on from there. */
  cutAt(t: number, then: S[] = []): void {
    const current = this.at(t);
    if (!current) return void this.rewrite(t, then);
    this.items.splice(this.items.indexOf(current) + 1);
    current.end = Math.max(current.start, t);
    current.cut = true;
    current.cues = current.cues.filter((c) => c.at < t - current.start);
    const hb = this.opts.hardBreak;
    this.breakDone = !hb || this.lastEnd() > hb.at;
    for (const seg of then) this.push(seg);
  }
}
