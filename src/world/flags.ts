// What happened this afternoon. Fresh on every visit (the afternoon starts
// over), except your name, which you wrote in the libreta.

import { kv } from './store';
import type { Dedication } from '../content/stations';

export const flags = {
  /** Written inside the libreta's cover. */
  name: kv.get<string>('name', ''),
  /** When you left a message with Andrés's mother. */
  andresMessageAt: null as number | null,
  andresCalls: 0,
  andresTalked: false,
  /** Andrés asked you to tape "Florecita rockera" for him. */
  andresAsked: false,
  angieCalls: 0,
  angieTalked: false,
  cabinaCalls: 0,
  request: null as { songId: string; dedication: Dedication; at: number } | null,
  requestAiredAt: null as number | null,
  abuelitaTalked: false,
};

export function setName(name: string): void {
  flags.name = name.trim().slice(0, 24);
  kv.set('name', flags.name);
}

/** When things happen in the other houses. */
export const SCHEDULE = {
  /** A señora calls looking for the bakery. */
  wrongNumberRings: 330,
  /** Angie's sister is on the phone until then. */
  angieBusyUntil: 600,
  /** Andrés gets home from Unicentro. */
  andresHome: 720,
  /** Your mother is on the kitchen extension with tía Gloria. */
  extension: [900, 1085] as [number, number],
  /** The cabina's line is busy for the first few tries. */
  cabinaBusyTries: 2,
  /** "¡A tomar onces!" */
  onces: 1500,
};
