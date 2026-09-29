// Real 1995 television on Canal A, through YouTube embeds.
//
// Approved in the second interview (September 2026): Señal Memoria's own
// uploads from RTVC's archive, and ad breaks from 1995 that viewers taped off
// the air. See docs/clips-shortlist.md for what else was considered.
//
// None of these could be watched from the build environment (YouTube is
// blocked there), so starts and lengths are cautious guesses. If a clip ends
// before its slot does, Canal A shows its card until the next one; if YouTube
// refuses a clip, it's skipped.

export interface Clip {
  /** YouTube video id. */
  id: string;
  /** Where to start and how long to air it (seconds). */
  start: number;
  dur: number;
  /** Who uploaded it, as far as we know. */
  source: 'Señal Memoria' | 'fan upload';
  /** What it is, for us (never shown on screen). */
  note: string;
}

export const CLIPS: Clip[] = [
  {
    id: 'J47UMyICIJU',
    start: 0,
    dur: 150,
    source: 'fan upload',
    note: '«1995 Comerciales. Cadena UNO. Colombia»: an ad break taped off the air',
  },
  {
    id: '84DTd4OBC9Y',
    start: 0,
    dur: 240,
    source: 'Señal Memoria',
    note: '«Rock al parque 1995»: the closing of the first festival, May 1995 (same title as Señal Memoria’s piece; uploader not checked)',
  },
  {
    id: 'J47UMyICIJU',
    start: 150,
    dur: 150,
    source: 'fan upload',
    note: 'the same tape further on: the next break',
  },
  {
    id: 'c991HevT0RE',
    start: 0,
    dur: 150,
    source: 'Señal Memoria',
    note: '«Guerra de Bosnia en la TV colombiana (1995)»: Noticiero de las 7 on the war in Bosnia (uploader not checked)',
  },
];
