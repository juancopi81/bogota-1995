// A cassette: two sides of magnetic tape, and whatever got recorded on them.
//
// Recording onto a stretch of tape erases what was there. The model keeps a
// list of recorded stretches per side; audio lives elsewhere (IndexedDB),
// referenced by key.

export type Side = 'A' | 'B';

/** What was being said while recording, relative to the start of the recording. */
export interface Caption {
  at: number;
  dur: number;
  label: string;
  text: string;
}

export interface TapeSegment {
  /** Where on the side it starts (seconds of tape). */
  start: number;
  dur: number;
  /** Key of the recorded audio. */
  key: string;
  /** Seconds into that audio where this stretch begins (after partial erasing). */
  offset: number;
}

export interface CassetteData {
  id: string;
  /** What's printed on the shell ("TDK D60") and what you wrote on the label. */
  brand: string;
  label: string;
  sideLength: number;
  side: Side;
  /** Position on the current side, in seconds of tape. */
  pos: number;
  sides: Record<Side, TapeSegment[]>;
  /** The little tabs on top. Broken off = can't record. */
  protected: Record<Side, boolean>;
  color: string;
}

export class Cassette {
  constructor(public data: CassetteData) {}

  get side(): Side {
    return this.data.side;
  }

  get pos(): number {
    return this.data.pos;
  }

  set pos(v: number) {
    this.data.pos = Math.max(0, Math.min(this.data.sideLength, v));
  }

  get length(): number {
    return this.data.sideLength;
  }

  segments(side: Side = this.data.side): TapeSegment[] {
    return this.data.sides[side];
  }

  canRecord(): boolean {
    return !this.data.protected[this.data.side];
  }

  /** Turn the cassette over. The position mirrors: the end of A is the start of B. */
  flip(): void {
    this.data.side = this.data.side === 'A' ? 'B' : 'A';
    this.data.pos = this.data.sideLength - this.data.pos;
  }

  /** Erase [start, start+dur) on the current side, trimming or splitting what was there. */
  erase(start: number, dur: number): void {
    const end = start + dur;
    const out: TapeSegment[] = [];
    for (const s of this.segments()) {
      const sEnd = s.start + s.dur;
      if (sEnd <= start || s.start >= end) {
        out.push(s);
        continue;
      }
      if (s.start < start) out.push({ ...s, dur: start - s.start });
      if (sEnd > end) out.push({ ...s, start: end, dur: sEnd - end, offset: s.offset + (end - s.start) });
    }
    this.data.sides[this.data.side] = out.sort((a, b) => a.start - b.start);
  }

  /** Lay down a new recording (erasing whatever was underneath). */
  write(start: number, dur: number, key: string): TapeSegment {
    const clipped = Math.min(dur, this.data.sideLength - start);
    this.erase(start, clipped);
    const seg: TapeSegment = { start, dur: clipped, key, offset: 0 };
    this.data.sides[this.data.side].push(seg);
    this.data.sides[this.data.side].sort((a, b) => a.start - b.start);
    return seg;
  }

  /** Every audio key still referenced by either side. */
  keys(): Set<string> {
    const keys = new Set<string>();
    for (const side of ['A', 'B'] as Side[]) for (const s of this.data.sides[side]) keys.add(s.key);
    return keys;
  }

  /** How far the recordings on this side reach. */
  recordedUntil(side: Side = this.data.side): number {
    return this.data.sides[side].reduce((m, s) => Math.max(m, s.start + s.dur), 0);
  }
}

/** A blank 60-minute cassette, 30 minutes a side. */
export function blankCassette(id: string, brand: string, color: string, label = ''): Cassette {
  return new Cassette({
    id,
    brand,
    label,
    sideLength: 30 * 60,
    side: 'A',
    pos: 0,
    sides: { A: [], B: [] },
    protected: { A: false, B: false },
    color,
  });
}

// ---------- the counter ----------
//
// The mechanical counter turns with the take-up reel, not with time: early
// in the tape the reel is thin and spins fast, near the end it's fat and
// spins slowly. So the numbers run faster at the start of a side.

const HUB_MM = 11;
const TAPE_MM = 0.012;
const SPEED_MM_S = 47.6;
const TURNS_PER_COUNT = 2;

/** Radius of the take-up reel after `pos` seconds of tape (mm). */
export function takeUpRadius(pos: number): number {
  return Math.sqrt(HUB_MM * HUB_MM + (SPEED_MM_S * TAPE_MM * Math.max(0, pos)) / Math.PI);
}

/** Radius of the supply reel when `pos` of a side of length `len` has been played (mm). */
export function supplyRadius(pos: number, len: number): number {
  return takeUpRadius(len - pos);
}

export function counterAt(pos: number): number {
  return (takeUpRadius(pos) - HUB_MM) / TAPE_MM / TURNS_PER_COUNT;
}

/** Counter shown on the deck: 000–999, relative to where you last pressed reset. */
export function counterDisplay(pos: number, zero: number): string {
  const n = Math.floor(counterAt(pos) - zero);
  return String(((n % 1000) + 1000) % 1000).padStart(3, '0');
}
