// What a broadcast is made of.

import type { Line } from '../content/lines';
import type { Style } from '../audio/music';

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  /** Which kind of placeholder plays until you load the real file. */
  style: Style;
}

export type Segment =
  /** A song; `over` are DJ lines spoken over its intro. */
  | {
      kind: 'song';
      songId: string;
      /** The real audio it carries (your file, or a house track standing in); null for a placeholder. */
      audio?: string | null;
      over?: Line[];
      request?: { dedication: string | null };
    }
  /** The DJ (or the news anchor) talking over a music bed. */
  | { kind: 'talk'; lines: Line[] }
  /** A radio ad (cuña). */
  | { kind: 'ad'; lines: Line[] }
  /** The station's jingle and name. */
  | { kind: 'id'; lines: Line[] }
  /** A news bulletin over the teletype bed. */
  | { kind: 'news'; lines: Line[] }
  /** 6:00 p.m.: the national anthem (only if a recording has been loaded). */
  | { kind: 'anthem' }
  | { kind: 'silence'; dur: number };

/** A line placed in time inside its segment. */
export interface Cue {
  line: Line;
  /** Seconds from the start of the segment. */
  at: number;
  dur: number;
}

export interface Scheduled<S = Segment> {
  start: number;
  end: number;
  seg: S;
  cues: Cue[];
  /** True when the segment was cut short (by the 6 p.m. anthem). */
  cut?: boolean;
}
