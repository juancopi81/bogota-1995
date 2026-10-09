// When each of the room's own recordings is first needed, in world seconds,
// so they download in that order: the broadcasts' from their running orders,
// the rest from when they could first come up.

import type { Station } from '../broadcast/station';
import type { Scheduled } from '../broadcast/types';
import type { TvSegment } from '../content/tv';
import { at } from '../world/clock';
import { SCHEDULE } from '../world/flags';
import { library } from './library';

/** How far ahead the running orders are read (world seconds). */
export const AHEAD = 600;

/** Lines that aren't on a running order: when they could first come up. */
const UNSCHEDULED: [prefix: string, at: number][] = [
  ['llamada.andres.', SCHEDULE.andresEarly], // he calls from the monedero
  ['llamada.', 60], // anyone you might call
  ['casa.', 60], // your mother, from the kitchen
  ['calle.', 120], // the reciclador
];

export interface Needs {
  /** When a voice line (by id) is first needed. */
  voice: (id: string) => number;
  /** When a house track (by id, or 'anthem') is first needed. */
  house: (id: string) => number;
  /** The broadcast lines that air before world time `t`. */
  linesBefore: (t: number) => string[];
}

export function needs(radio: { station: Station; items: Scheduled[] }[], tv: Scheduled<TvSegment>[]): Needs {
  const voices = new Map<string, number>();
  const house = new Map<string, number>();
  const need = (map: Map<string, number>, key: string, t: number) => map.set(key, Math.min(map.get(key) ?? Infinity, t));
  // the running orders start before 5:30; what was over by then is never heard
  const lines = (item: Scheduled<unknown>) => {
    for (const cue of item.cues) if (cue.line.id && item.start + cue.at + cue.dur > 0) need(voices, cue.line.id, item.start + cue.at);
  };

  for (const { station, items } of radio) {
    const bed = library.bedTrack(station.def.id);
    for (const item of items) {
      lines(item);
      const seg = item.seg;
      const track = seg.kind === 'song' ? library.houseTrack(seg.audio ?? null) : seg.kind === 'talk' || seg.kind === 'ad' ? bed : undefined;
      if (track && item.end > 0) need(house, track.id, item.start);
    }
  }
  for (const item of tv) lines(item);

  return {
    voice: (id) => voices.get(id) ?? UNSCHEDULED.find(([prefix]) => id.startsWith(prefix))?.[1] ?? AHEAD + 300,
    house: (id) => house.get(id) ?? (id === 'anthem' ? at(18, 0) - AHEAD : AHEAD + 600),
    linesBefore: (t) => [...voices].filter(([, due]) => due < t).map(([id]) => id),
  };
}
