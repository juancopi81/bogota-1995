// People on the far sidewalk, the afternoon's whole cast, from a fixed seed:
// passers-by under umbrellas, someone running with a newspaper over the head,
// customers going in and out of the panadería, whoever waits for a buseta
// (they flag it down and get on when it stops), and the reciclador with his
// cart, twice, calling "¡Botella, papel!".

import { mulberry32, pick, type Rng } from '../util/rng';
import { busStops, VIEW_W } from './street';
import { at } from './clock';

export type WalkerKind = 'walker' | 'runner' | 'customer' | 'rider' | 'reciclador';

export interface Walker {
  id: number;
  kind: WalkerKind;
  /** Where the feet are (city-box x), at key times; straight lines between them. */
  path: { t: number; x: number }[];
  t0: number;
  t1: number;
  coat: string;
  umbrella: string | null;
  /** Running with a newspaper over the head instead. */
  paper?: boolean;
  /** Coming out of the panadería with the bread. */
  bread?: boolean;
  /** An arm up to stop the buseta, between these times. */
  flag?: [number, number];
}

/** The panadería's door (the middle of the shopfront). */
export const PANADERIA_DOOR = 1240;
/** The reciclador's two rounds: when he comes into view, and which way he goes. */
export const RECICLADOR_ROUNDS: { from: number; dir: 1 | -1 }[] = [
  { from: at(17, 34, 30), dir: -1 },
  { from: at(17, 50, 20), dir: 1 },
];
const RECICLADOR_SPEED = 17;
/** He pushes the cart ahead of him: how far it reaches. */
export const CART_REACH = 116;
const END = 2 * 3600;
const OFF = 60;

const COATS = ['#3a4d6b', '#5a4a3c', '#7a2b2b', '#2f3a4a', '#6b6258', '#4a4a4a', '#3d5240', '#6b4a5a'];
const UMBRELLAS = ['#1d1e21', '#1d1e21', '#1d1e21', '#2f3a4a', '#a8322a', '#3d6e8c', '#4b5a3a'];

function look(rng: Rng): Pick<Walker, 'coat' | 'umbrella'> {
  return { coat: pick(rng, COATS), umbrella: rng() < 0.85 ? pick(rng, UMBRELLAS) : null };
}

function edge(dir: 1 | -1): number {
  return dir === 1 ? -OFF : VIEW_W + OFF;
}

function build(rng: Rng): Walker[] {
  const out: Omit<Walker, 'id' | 't0' | 't1'>[] = [];

  // passers-by, now and then
  for (let t = -50; t < END; t += 7 + rng() * 15) {
    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const r = rng();
    if (r < 0.1) {
      // running, a newspaper for an umbrella
      const v = 85 + rng() * 20;
      out.push({ kind: 'runner', path: [{ t, x: edge(dir === 1 ? 1 : -1) }, { t: t + (VIEW_W + 2 * OFF) / v, x: edge(dir === 1 ? -1 : 1) }], coat: pick(rng, COATS), umbrella: null, paper: true });
    } else if (r < 0.2) {
      // going to the panadería, and sometimes coming back out with the bread
      const v = 32 + rng() * 12;
      const from = edge(dir);
      const arrive = t + Math.abs(PANADERIA_DOOR - from) / v;
      const l = look(rng);
      out.push({ kind: 'customer', path: [{ t, x: from }, { t: arrive, x: PANADERIA_DOOR }], ...l });
      if (rng() < 0.7) {
        const leave = arrive + 40 + rng() * 80;
        const away: 1 | -1 = rng() < 0.5 ? 1 : -1;
        out.push({ kind: 'customer', path: [{ t: leave, x: PANADERIA_DOOR }, { t: leave + Math.abs(edge(away) - PANADERIA_DOOR) / v, x: edge(away) }], ...l, bread: true });
      }
    } else {
      const v = 30 + rng() * 16;
      out.push({ kind: 'walker', path: [{ t, x: edge(dir) }, { t: t + (VIEW_W + 2 * OFF) / v, x: edge(-dir as 1 | -1) }], ...look(rng) });
    }
  }

  // whoever waits for a buseta: out of the panadería for the stop beside it, from the corner for the other
  for (const stop of busStops) {
    if (stop.from > END) continue;
    const wait = stop.x + 34;
    const v = 34 + rng() * 10;
    const fromDoor = Math.abs(wait - PANADERIA_DOOR) < 260;
    const from = fromDoor ? PANADERIA_DOOR : edge(-1);
    const arrive = stop.from - (8 + rng() * 14);
    const start = arrive - Math.abs(wait - from) / v;
    out.push({
      kind: 'rider',
      path: [{ t: start, x: from }, { t: arrive, x: wait }, { t: stop.from + 1.6, x: wait }],
      ...look(rng),
      bread: fromDoor,
      flag: [stop.from - 5.5, stop.from + 0.5],
    });
  }

  // the reciclador, pushing his cart down the street
  for (const round of RECICLADOR_ROUNDS) {
    const from = round.dir === -1 ? VIEW_W + OFF + CART_REACH : -OFF - CART_REACH;
    const to = round.dir === -1 ? -OFF : VIEW_W + OFF;
    const start = round.from - OFF / RECICLADOR_SPEED;
    out.push({ kind: 'reciclador', path: [{ t: start, x: from }, { t: start + Math.abs(to - from) / RECICLADOR_SPEED, x: to }], coat: '#5a4a3c', umbrella: null });
  }

  return out
    .map((w) => ({ ...w, t0: w.path[0].t, t1: w.path[w.path.length - 1].t }))
    .sort((a, b) => a.t0 - b.t0)
    .map((w, id) => ({ ...w, id }));
}

export const walkers: Walker[] = build(mulberry32(1700));

/** Where someone's feet are at t. */
export function walkerX(w: Walker, t: number): number {
  const p = w.path;
  if (t <= p[0].t) return p[0].x;
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i].t) return p[i - 1].x + ((p[i].x - p[i - 1].x) * (t - p[i - 1].t)) / Math.max(1e-6, p[i].t - p[i - 1].t);
  }
  return p[p.length - 1].x;
}

/** Which way someone faces at t (the way they walk; standing, the way they came). */
export function walkerFacing(w: Walker, t: number): 1 | -1 {
  const p = w.path;
  let facing: 1 | -1 = p[1].x >= p[0].x ? 1 : -1;
  for (let i = 1; i < p.length; i++) {
    if (p[i].x !== p[i - 1].x) facing = p[i].x > p[i - 1].x ? 1 : -1;
    if (t <= p[i].t) break;
  }
  return facing;
}

/** Whether someone is walking (not standing still) at t. */
export function walkerMoving(w: Walker, t: number): boolean {
  const p = w.path;
  for (let i = 1; i < p.length; i++) if (t <= p[i].t) return p[i].x !== p[i - 1].x;
  return false;
}

/** People on the sidewalk at t. */
export function walkersAt(t: number): Walker[] {
  return walkers.filter((w) => t >= w.t0 && t <= w.t1);
}

/** When the reciclador calls out, and where he is then (heard a little before and after he's in view). */
export const recicladorCalls: { t: number; x: number }[] = (() => {
  const rng = mulberry32(31);
  const out: { t: number; x: number }[] = [];
  for (const w of walkers.filter((x) => x.kind === 'reciclador')) {
    for (let t = w.t0 - 10; t < w.t1 + 10; t += 12 + rng() * 6) out.push({ t, x: walkerX(w, Math.min(Math.max(t, w.t0), w.t1)) });
  }
  return out.sort((a, b) => a.t - b.t);
})();
