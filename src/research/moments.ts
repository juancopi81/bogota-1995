// When the afternoon's designed moments come up, in world seconds after 5:30.
// The room opens at 5:30, so this is also how long a visitor has to stay to
// get there. For reading the visit log (scripts/visits.ts); the radio's times
// come from Radioactiva's running order, and tests/moments.test.ts checks them
// whenever the content changes.

import { at } from '../world/clock';
import { SCHEDULE } from '../world/flags';

/** Radioactiva gives its request number on air. */
export const REQUEST_NUMBER_AT = [507.5, 1231.6];
/** A request taken right after the first number airs after the song on air and an ad break. */
export const FIRST_REQUEST_AIRS = 852.9;

export interface Moment {
  at: number;
  what: string;
}

export const MOMENTS: Moment[] = [
  { at: SCHEDULE.andresEarly, what: 'Andrés calls from the monedero' },
  { at: SCHEDULE.wrongNumberRings, what: 'the wrong number rings' },
  { at: REQUEST_NUMBER_AT[0], what: 'Radioactiva first gives its request number' },
  { at: SCHEDULE.andresHome + 80, what: 'Andrés calls back from home, if he asked or got the message' },
  { at: FIRST_REQUEST_AIRS, what: 'the earliest a requested song can air' },
  { at: SCHEDULE.extension[0], what: 'Mamá on the kitchen extension' },
  { at: REQUEST_NUMBER_AT[1], what: 'the request number again' },
  { at: SCHEDULE.onces, what: 'onces' },
  { at: at(18, 0), what: 'the anthem' },
];
