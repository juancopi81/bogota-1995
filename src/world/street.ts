// The street below the window: what passes and when.
//
// Traffic is a fixed, seeded schedule over the afternoon, so the little
// window in the room and the close-up always show the same buseta at the same
// moment, and its sound can be played exactly when it passes.

import { mulberry32, pick } from '../util/rng';

export type VehicleKind = 'buseta' | 'taxi' | 'car';

export interface Vehicle {
  id: number;
  kind: VehicleKind;
  /** World time when the vehicle enters the view. */
  t0: number;
  /** +1 left→right (the near lane), -1 right→left (the far lane). */
  dir: 1 | -1;
  /** City-box units per second. */
  speed: number;
  /** Painted destination board (busetas only). */
  route?: string;
  /** Body colors (busetas have stripes, cars are whatever). */
  colors: string[];
  honk: boolean;
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

export const VIEW_W = 1600;

function buildSchedule(): Vehicle[] {
  const rng = mulberry32(28101995);
  const out: Vehicle[] = [];
  let t = 4;
  let id = 0;
  while (t < 3 * 3600) {
    const roll = rng();
    const kind: VehicleKind = roll < 0.42 ? 'buseta' : roll < 0.75 ? 'taxi' : 'car';
    const dir: 1 | -1 = rng() < 0.55 ? 1 : -1;
    const speed = kind === 'buseta' ? 150 + rng() * 60 : 180 + rng() * 90;
    out.push({
      id: id++,
      kind,
      t0: t,
      dir,
      speed,
      route: kind === 'buseta' ? pick(rng, ROUTES) : undefined,
      colors: kind === 'buseta' ? pick(rng, BUS_COLORS) : kind === 'taxi' ? ['#e9c21c'] : [pick(rng, CAR_COLORS)],
      honk: kind !== 'car' && rng() < 0.4,
    });
    t += 14 + rng() * 38;
  }
  return out;
}

export const traffic: Vehicle[] = buildSchedule();

export const VEHICLE_LEN: Record<VehicleKind, number> = { buseta: 230, taxi: 130, car: 140 };

/** Where a vehicle's left edge is at world time t (city-box units). */
export function vehicleX(v: Vehicle, t: number): number {
  const d = (t - v.t0) * v.speed;
  return v.dir === 1 ? -VEHICLE_LEN[v.kind] + d : VIEW_W + d * -1;
}

/** Vehicles on screen at world time t. */
export function vehiclesAt(t: number): Vehicle[] {
  return traffic.filter((v) => {
    if (t < v.t0) return false;
    const x = vehicleX(v, t);
    return x > -VEHICLE_LEN[v.kind] - 10 && x < VIEW_W + 10;
  });
}

/** When a vehicle passes the middle of the view (loudest moment). */
export function passTime(v: Vehicle): number {
  return v.t0 + (VIEW_W / 2 + VEHICLE_LEN[v.kind] / 2) / v.speed;
}
