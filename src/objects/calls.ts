// How a phone call is written: an async script that talks to the line.
//
//   export const andres: CallScript = async (call) => {
//     await call.say(L.hola);
//     const polite = await call.choose([{ text: '¿Me hace el favor con Andrés?', value: true }, ...]);
//   };
//
// If you hang up in the middle, the script stops right there (every await
// throws HangUp, which the phone catches).

import type { Line } from '../content/lines';
import type { Ambience } from './line';

export class HangUp extends Error {
  constructor() {
    super('hung up');
  }
}

export interface Choice<T> {
  text: string;
  value: T;
}

export interface CallApi {
  /** The other end says a line (subtitle, or the recording if there is one). */
  say(line: Line): Promise<void>;
  /** Silence on the line. */
  pause(seconds: number): Promise<void>;
  /** What you say back. */
  choose<T>(options: Choice<T>[]): Promise<T>;
  /** They hang up: a click, then the busy tone. Ends the script. */
  hangUp(): Promise<never>;
  /** The sound of the other house behind the voices. */
  ambience(kind: Ambience): void;
  /** Somebody else picks up or puts down an extension. */
  click(): void;
  /** Coins drop into the monedero they're calling from. */
  coins(): void;
  /** World time now (seconds since 5:30 p.m.). */
  now(): number;
}

export type CallScript = (call: CallApi) => Promise<void>;

/** What the exchange does with a dialed number. */
export type Route =
  | { kind: 'answer'; rings: number; script: CallScript }
  | { kind: 'busy' }
  | { kind: 'no-answer' }
  | { kind: 'unassigned' }
  | { kind: 'service'; script: CallScript };
