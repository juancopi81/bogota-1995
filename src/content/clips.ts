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
  source: 'Señal Memoria' | 'Caracol Televisión' | 'fan upload';
  /** What it is, for us (never shown on screen). */
  note: string;
}

/**
 * Cadena Uno's own ad breaks: the same 1995 tape, a stretch at a time, in
 * place of the invented ads between the scenes of the telenovela on channel 7.
 */
export const AD_BREAKS: Clip[] = [0, 75, 150, 225].map((start) => ({
  id: 'J47UMyICIJU',
  start,
  dur: 75,
  source: 'fan upload',
  note: `«1995 Comerciales. Cadena UNO. Colombia», from ${start} s`,
}));

/** Canal A (channel 9): real 1995 television, one clip after another. */
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

// ---------------------------------------------------------------------------
// The programs on the air from 5:30, in full (approved in October 2026; the
// lengths were read off YouTube, and none of these copies has ad breaks of
// its own). Fan copies except Tentaciones, which is Caracol's own upload.
// ---------------------------------------------------------------------------

const ROCK_AL_PARQUE = CLIPS[1];
const BOSNIA = CLIPS[3];

/** «Tentaciones» (Caracol, about 1994–1998): a family, an angel and some devils. */
const TENTACIONES: Clip = { id: '92NxNiCDwZs', start: 0, dur: 23 * 60 + 39, source: 'Caracol Televisión', note: '«Tentaciones»: one full episode' };
/** «De pies a cabeza» (Cadena Uno, from 1993). */
const DE_PIES_A_CABEZA: Clip = { id: 'zxKV5Lfi1Xk', start: 0, dur: 34 * 60 + 30, source: 'fan upload', note: '«De pies a cabeza»: one full episode' };
/** «Dejémonos de vainas» (Coestrellas; Canal A, 1992–1998): the Vargas family. */
const DEJEMONOS: Clip = { id: 'E_reJPjY4Fw', start: 0, dur: 22 * 60 + 31, source: 'fan upload', note: '«Dejémonos de vainas»: one full episode' };

/** Four 1995 commercials, one after another: an ad break. */
const TANDA: Clip[] = [
  ['Qv6BF5cz1WI', 19],
  ['WpAJ8E8ZnyI', 14],
  ['qkIQUUdeXJo', 26],
  ['Mwwqc8vHE5A', 19],
].map(([id, dur]) => ({ id: id as string, start: 0, dur: dur as number, source: 'fan upload', note: 'a 1995 commercial' }));

/**
 * What Cadena Uno (7) and Canal A (9) air from 5:30 on, back to back. The
 * anthem at six pauses whatever is on, and it picks up after the anthem.
 * When the timetable runs out, each channel goes back to its usual running
 * order.
 */
export const SCHEDULES: Record<number, Clip[]> = {
  // Tentaciones at 5:30, a stretch of the 1995 Cadena Uno ads, then De pies a cabeza (paused at six)
  7: [TENTACIONES, { ...AD_BREAKS[0] }, DE_PIES_A_CABEZA],
  // Dejémonos de vainas at 5:30, an ad break, Rock al Parque, more ads up to six, the news after the anthem
  9: [DEJEMONOS, ...TANDA, ROCK_AL_PARQUE, { ...CLIPS[2], dur: 131 }, BOSNIA],
};

/**
 * Where a channel's timetable is at world time `t`: which program, from how
 * far into it, and for how long until the next one. The anthem (`anthem`
 * seconds long from `anthemAt`) pauses the timetable. Null before 5:30 and
 * once the timetable is over.
 */
export function onSchedule(schedule: Clip[], t: number, anthemAt: number, anthem: number): { index: number; clip: Clip } | null {
  if (t < 0) return null;
  const p = t >= anthemAt + anthem ? t - anthem : Math.min(t, anthemAt);
  let from = 0;
  for (let index = 0; index < schedule.length; index++) {
    const clip = schedule[index];
    const to = from + clip.dur;
    if (p < to) return { index, clip: { ...clip, start: clip.start + (p - from), dur: to - p } };
    from = to;
  }
  return null;
}
