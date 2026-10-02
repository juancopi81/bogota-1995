// The street below the window: what passes and when.
//
// Traffic is simulated once, from a fixed seed, over the whole afternoon. Cars
// come in waves and keep their distance; in the far lane a buseta pulls over
// when somebody is waiting, and whoever was behind it stops too, and honks.
// Positions are kept every tenth of a second, so the little window in the
// room and the close-up always show the same buseta at the same moment, and
// its sound can follow it.

import { mulberry32, pick, type Rng } from '../util/rng';

export type VehicleKind = 'buseta' | 'taxi' | 'r4' | 'sprint' | 'car';
export type Honk = 'toot' | 'double' | 'impatient';

export const VIEW_W = 1600;
export const VEHICLE_LEN: Record<VehicleKind, number> = { buseta: 230, taxi: 130, r4: 124, sprint: 114, car: 140 };
/** How far beyond the view the lanes run: you hear a vehicle before you see it. */
export const LEAD = 700;
/** Seconds between kept positions. */
export const STEP = 0.1;
/** Where far-lane busetas pull over (their left edge): by the panadería, and by the urapán. */
export const STOP_SPOTS = [1086, 416];
/** How long the simulated afternoon lasts (seconds after 5:30). */
const END = 2 * 3600;

export interface Stop {
  /** The buseta's left edge while it waits. */
  x: number;
  /** When it comes to rest, and when it pulls away. */
  from: number;
  to: number;
}

export interface Vehicle {
  id: number;
  kind: VehicleKind;
  /** +1 left→right (the near lane), -1 right→left (the far lane). */
  dir: 1 | -1;
  /** World time of the first kept position. */
  t0: number;
  /** World time of the last kept position. */
  t1: number;
  /** The left edge (city-box units), every STEP seconds from t0. */
  xs: Float32Array;
  /** Painted destination board (busetas only). */
  route?: string;
  /** Body colors (busetas have their livery; cars are whatever). */
  colors: string[];
  honks: { t: number; kind: Honk }[];
  stop?: Stop;
}

// Route cards as they were painted and propped in the windshield: where it
// goes, and the way it takes.
const ROUTES = [
  'CHAPINERO · CL 72',
  'CARACAS · RESTREPO',
  'UNICENTRO · CRA 15',
  'LOURDES · LAS AGUAS',
  'SUBA · CALLE 80',
  'KENNEDY · 1o DE MAYO',
  'CENTRO · CRA 7a',
];

// Company liveries: body, band, pinstripe, nose. Most wear the one in the
// photo, white with an ochre band, a thin red line and a red-orange front.
const BUS_COLORS = [
  ['#f0ece1', '#c9982f', '#b3321f', '#d4552b'],
  ['#f0ece1', '#c9982f', '#b3321f', '#d4552b'],
  ['#f0ece1', '#c9982f', '#b3321f', '#d4552b'],
  ['#ece6d6', '#2f6d4f', '#d9a531', '#2f6d4f'],
  ['#e9e3d2', '#2f4f8a', '#b8412f', '#b8412f'],
];
const CAR_COLORS = ['#7d2b2b', '#2d4a6b', '#bdbbb4', '#3f5a3e', '#6e6258', '#1f2326'];
const R4_COLORS = ['#d7d3c4', '#9fb3c0', '#c9b98f', '#a83a2c', '#e6e3da', '#6f8a6a'];
const SPRINT_COLORS = ['#7d2b2b', '#2d4a6b', '#9a9c98', '#c9c4b5', '#b9862f'];

// ---------- the drivers: the intelligent driver model, Bogotá-flavored ----------

/** Acceleration and comfortable braking (units/s²), gap at rest (units), time headway (s). */
const ACC = 150;
const BRAKE = 200;
const GAP = 22;
const HEADWAY = 0.8;
const DT = 0.05;

function accel(v: number, v0: number, gap: number, closing: number): number {
  const want = GAP + Math.max(0, v * HEADWAY + (v * closing) / (2 * Math.sqrt(ACC * BRAKE)));
  return ACC * (1 - Math.pow(v / v0, 4) - Math.pow(want / Math.max(gap, 0.5), 2));
}

interface Plan {
  kind: VehicleKind;
  dir: 1 | -1;
  enter: number;
  v0: number;
  stopX?: number;
  wait?: number;
  colors: string[];
  route?: string;
  /** Where a taxi toots at someone on the sidewalk (its center), if it does. */
  tootAt?: number;
}

function kindOf(rng: Rng): VehicleKind {
  const r = rng();
  return r < 0.34 ? 'buseta' : r < 0.66 ? 'taxi' : r < 0.8 ? 'r4' : r < 0.9 ? 'sprint' : 'car';
}

/** The afternoon's arrivals: waves of one to four vehicles, a quiet spell, another wave. */
function plan(rng: Rng): Plan[] {
  const out: Plan[] = [];
  for (const dir of [1, -1] as const) {
    let t = dir === 1 ? -40 : -25;
    while (t < END) {
      const size = 1 + (rng() < 0.62 ? (rng() < 0.55 ? 1 : 0) : rng() < 0.6 ? 2 : 3);
      let enter = t;
      for (let k = 0; k < size; k++) {
        const kind = kindOf(rng);
        const v0 = kind === 'buseta' ? 170 + rng() * 50 : kind === 'taxi' ? 210 + rng() * 60 : 190 + rng() * 55;
        const p: Plan = {
          kind,
          dir,
          enter,
          v0,
          colors:
            kind === 'buseta'
              ? pick(rng, BUS_COLORS)
              : kind === 'taxi'
                ? ['#e9c21c']
                : [pick(rng, kind === 'r4' ? R4_COLORS : kind === 'sprint' ? SPRINT_COLORS : CAR_COLORS)],
          route: kind === 'buseta' ? pick(rng, ROUTES) : undefined,
        };
        // the first buseta of a far-lane wave often pulls over for someone
        if (dir === -1 && kind === 'buseta' && k === 0 && rng() < 0.55) {
          p.stopX = pick(rng, STOP_SPOTS) + Math.round((rng() - 0.5) * 30);
          p.wait = 5 + rng() * 4;
        }
        if (kind === 'taxi' && rng() < 0.22) p.tootAt = 260 + rng() * 1080;
        out.push(p);
        enter += 1.2 + rng() * 1.8;
      }
      t = enter + 14 + rng() * 34;
    }
  }
  return out.sort((a, b) => a.enter - b.enter);
}

interface Car {
  plan: Plan;
  len: number;
  /** Front bumper's distance along the lane. */
  s: number;
  v: number;
  entered: number;
  xs: number[];
  honks: { t: number; kind: Honk }[];
  stopS?: number;
  stop?: Stop;
  stoppedSince: number | null;
  tooted: boolean;
}

/** The left edge for a front bumper `s` along the lane. */
function leftEdge(dir: 1 | -1, s: number, len: number): number {
  return dir === 1 ? -LEAD + s - len : VIEW_W + LEAD - s;
}

function simulate(rng: Rng): Vehicle[] {
  const plans = plan(rng);
  const lanes: Record<1 | -1, Car[]> = { 1: [], [-1]: [] };
  // who's still to come, lane by lane, in order
  const queues: Record<1 | -1, Plan[]> = { 1: plans.filter((p) => p.dir === 1), [-1]: plans.filter((p) => p.dir === -1) };
  const heads: Record<1 | -1, number> = { 1: 0, [-1]: 0 };
  const done: Vehicle[] = [];
  let id = 0;
  // positions are kept on the STEP grid, so every vehicle samples at the same instants
  const keepEvery = Math.round(STEP / DT);
  const finish = (c: Car, dir: 1 | -1) =>
    done.push({
      id: id++,
      kind: c.plan.kind,
      dir,
      t0: c.entered,
      t1: c.entered + (c.xs.length - 1) * STEP,
      xs: Float32Array.from(c.xs),
      route: c.plan.route,
      colors: c.plan.colors,
      honks: c.honks,
      stop: c.stop,
    });

  for (let tick = Math.floor(plans[0].enter / STEP) * keepEvery; ; tick++) {
    const t = tick * DT;
    const onGrid = tick % keepEvery === 0;
    // let in whoever is due (on the grid), if there's room at the start of their lane
    if (onGrid) {
      for (const dir of [1, -1] as const) {
        const queue = queues[dir];
        const lane = lanes[dir];
        while (heads[dir] < queue.length && queue[heads[dir]].enter <= t) {
          const p = queue[heads[dir]];
          const last = lane[lane.length - 1];
          const len = VEHICLE_LEN[p.kind];
          if (last && last.s - last.len < GAP + len * 0.2) break;
          lane.push({
            plan: p,
            len,
            s: 0,
            v: last ? Math.min(p.v0, last.v + 10) : p.v0,
            entered: Math.round(t / STEP) * STEP,
            xs: [],
            honks: [],
            stopS: p.stopX === undefined ? undefined : VIEW_W + LEAD - p.stopX,
            stoppedSince: null,
            tooted: false,
          });
          heads[dir]++;
        }
      }
    }
    const waiting = heads[1] < queues[1].length || heads[-1] < queues[-1].length;
    if (!waiting && !lanes[1].length && !lanes[-1].length) break;

    for (const dir of [1, -1] as const) {
      const lane = lanes[dir];
      for (let i = 0; i < lane.length; i++) {
        const c = lane[i];
        const ahead = i > 0 ? lane[i - 1] : null;
        let a = accel(c.v, c.plan.v0, ahead ? ahead.s - ahead.len - c.s : 1e9, ahead ? c.v - ahead.v : 0);
        if (c.stop) {
          // at the stop until the wait is over, then off again like anyone else
          if (t < c.stop.to) a = 0;
        } else if (c.stopS !== undefined) {
          // pulling over: the stop is an obstacle to brake for
          a = Math.min(a, accel(c.v, c.plan.v0, c.stopS - c.s + GAP, c.v));
          if (c.v < 4 && c.stopS - c.s < 8) c.stop = { x: leftEdge(dir, c.s, c.len), from: t, to: t + (c.plan.wait ?? 6) };
        }
        c.v = c.stop && t < c.stop.to ? 0 : Math.max(0, c.v + a * DT);
        c.s += c.v * DT;
        if (ahead) c.s = Math.min(c.s, ahead.s - ahead.len - 2);

        // waiting behind a stopped buseta: taxis and cars lose patience
        if (c.v < 3 && ahead && ahead.v < 3 && c.plan.kind !== 'buseta') {
          if (c.stoppedSince === null) c.stoppedSince = t;
          const waited = t - c.stoppedSince;
          const honked = c.honks.filter((h) => h.kind === 'impatient').length;
          if ((honked === 0 && waited > 1.4) || (honked === 1 && waited > 4.2 && c.plan.kind === 'taxi')) c.honks.push({ t, kind: 'impatient' });
        } else if (c.v > 20) c.stoppedSince = null;
        // a taxi tooting at someone on the sidewalk, in case they want a ride
        const center = leftEdge(dir, c.s, c.len) + c.len / 2;
        if (c.plan.tootAt !== undefined && !c.tooted && (dir === 1 ? center >= c.plan.tootAt : center <= c.plan.tootAt)) {
          c.tooted = true;
          c.honks.push({ t, kind: 'double' });
        }
        if (onGrid) c.xs.push(leftEdge(dir, c.s, c.len));
      }
      // off the far end: done
      while (lane.length && lane[0].s - lane[0].len > VIEW_W + 2 * LEAD) finish(lane.shift()!, dir);
    }
  }
  return done.sort((a, b) => a.t0 - b.t0);
}

export const traffic: Vehicle[] = simulate(mulberry32(28101995));

// who's around, a minute at a time, so a frame only looks at a handful
const BUCKET = 60;
const buckets = new Map<number, Vehicle[]>();
for (const v of traffic) {
  for (let b = Math.floor(v.t0 / BUCKET); b <= Math.floor(v.t1 / BUCKET); b++) {
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(v);
  }
}

/** Where a vehicle's left edge is at world time t (city-box units). */
export function vehicleX(v: Vehicle, t: number): number {
  const f = (Math.min(Math.max(t, v.t0), v.t1) - v.t0) / STEP;
  const i = Math.min(v.xs.length - 2, Math.floor(f));
  if (i < 0) return v.xs[0];
  return v.xs[i] + (v.xs[i + 1] - v.xs[i]) * (f - i);
}

/** How fast it's going at t (units/s, always positive). */
export function vehicleSpeed(v: Vehicle, t: number): number {
  return Math.abs(vehicleX(v, t + STEP / 2) - vehicleX(v, t - STEP / 2)) / STEP;
}

/** Vehicles in the lanes at time t, heard or seen (including the stretch beyond the view). */
export function vehiclesNear(t: number): Vehicle[] {
  return (buckets.get(Math.floor(t / BUCKET)) ?? []).filter((v) => t >= v.t0 && t <= v.t1);
}

/** Vehicles you can see at world time t. */
export function vehiclesAt(t: number): Vehicle[] {
  return vehiclesNear(t).filter((v) => {
    const x = vehicleX(v, t);
    return x > -VEHICLE_LEN[v.kind] - 10 && x < VIEW_W + 10;
  });
}

/** Every buseta stop of the afternoon, for the people waiting for them. */
export const busStops: (Stop & { vehicle: number })[] = traffic.filter((v) => v.stop).map((v) => ({ ...v.stop!, vehicle: v.id }));
