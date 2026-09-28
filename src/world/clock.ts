// The world clock.
//
// World time is measured in seconds since the room opens: t = 0 is Saturday
// 28 October 1995, 5:30:00 p.m. in Bogotá. It runs at real speed and is driven
// by the AudioContext clock, so broadcast audio and schedules never drift apart.

import { bus } from './bus';

export const START_HOUR = 17;
export const START_MINUTE = 30;

/** Seconds from 5:30 p.m. to a given clock time that afternoon. */
export function at(hour: number, minute: number, second = 0): number {
  return (hour - START_HOUR) * 3600 + (minute - START_MINUTE) * 60 + second;
}

export class WorldClock {
  private ctx: AudioContext | null = null;
  private base = 0;
  private offset = 0;

  start(ctx: AudioContext): void {
    this.ctx = ctx;
    this.base = ctx.currentTime;
  }

  get started(): boolean {
    return this.ctx !== null;
  }

  /** World seconds since 5:30 p.m. */
  now(): number {
    return this.ctx ? this.ctx.currentTime - this.base + this.offset : 0;
  }

  /** The AudioContext time at which a world time happens (or happened). */
  toCtx(t: number): number {
    return this.base + t - this.offset;
  }

  /** Jump forward (backstage only). Broadcast players resync on the event. */
  skip(seconds: number): void {
    this.offset += seconds;
    bus.emit('clock:skip', { by: seconds });
  }
}

export const clock = new WorldClock();

export interface ClockParts {
  hour: number; // 0–23
  minute: number;
  second: number;
}

export function clockParts(t: number): ClockParts {
  const total = Math.floor(START_HOUR * 3600 + START_MINUTE * 60 + t);
  return {
    hour: Math.floor(total / 3600) % 24,
    minute: Math.floor(total / 60) % 60,
    second: total % 60,
  };
}

/** "5:37 p.m." */
export function formatTime(t: number): string {
  const { hour, minute } = clockParts(t);
  const h12 = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? 'a.m.' : 'p.m.';
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

const UNITS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta'];

/** Spanish words for 0–59. */
export function spanishNumber(n: number): string {
  if (n < 30) return UNITS[n];
  const tens = TENS[Math.floor(n / 10)];
  const unit = n % 10;
  return unit === 0 ? tens : `${tens} y ${UNITS[unit]}`;
}

/** How a radio announcer or the 117 line says the time: "las cinco y treinta y siete minutos". */
export function spokenTime(t: number): string {
  const { hour, minute } = clockParts(t);
  const h12 = ((hour + 11) % 12) + 1;
  const hourWord = h12 === 1 ? 'la una' : `las ${spanishNumber(h12)}`;
  if (minute === 0) return `${hourWord} en punto`;
  const minuteWord =
    minute === 1
      ? 'un minuto'
      : minute === 21
        ? 'veintiún minutos'
        : `${spanishNumber(minute).replace(/ uno$/, ' un')} minutos`;
  return `${hourWord} y ${minuteWord}`;
}

/**
 * How much afternoon light is left: 1 = the gray light of 5:30 p.m.,
 * 0 = night. Sunset in Bogotá in late October is around 5:43 p.m.;
 * the sky is dark by about 6:10.
 */
export function daylight(t: number): number {
  const from = at(17, 38);
  const to = at(18, 10);
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  const s = x * x * (3 - 2 * x);
  return 1 - s;
}
