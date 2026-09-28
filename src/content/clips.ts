// Real 1995 television, via official YouTube embeds.
//
// Empty on purpose: candidates are proposed in docs/clips-shortlist.md and go
// in here only once approved. While this list is empty, Canal A shows its
// placeholder programming.

export interface Clip {
  /** YouTube video id. */
  id: string;
  /** Where to start and how long to air it (seconds). */
  start: number;
  dur: number;
  /** What it is, for us (never shown on screen). */
  note: string;
}

export const CLIPS: Clip[] = [];
