// Rain on the outside of the window glass. Drops land and sit; one that lands
// on another joins it. Once a drop is heavy enough it runs down in a
// wandering rivulet, catching on the glass now and then, picking up the drops
// in its way and leaving a wet trail and a string of droplets behind, until
// it runs off the bottom or is too light to go on.

import type { Rng } from '../util/rng';

export interface GlassDrop {
  x: number;
  y: number;
  r: number;
  running: boolean;
  /** Running speed, px/s. */
  vy: number;
  /** Seconds it stays caught on the glass before running on. */
  caught: number;
  /** Which way it's heading as it runs (radians off straight down). */
  wander: number;
  /** How far it has run since it last left a droplet. */
  shed: number;
}

/** A drop this heavy starts to run; a running one stops when it's this light. */
export const RUN_AT = 3.3;
export const STOP_AT = 2.4;
/** Drops landing on the glass per second. */
const LANDING = 9;
const MAX_DROPS = 240;
/** On a crowded glass, how far away a landing drop still finds one to join. */
const CROWDED_REACH = 24;

export class GlassRain {
  readonly drops: GlassDrop[] = [];
  private landing = 0;

  constructor(
    readonly w: number,
    readonly h: number,
    private readonly rng: Rng,
  ) {
    for (let i = 0; i < 170; i++) this.land(rng() * w, rng() * h, 0.6 + Math.pow(rng(), 2.2) * 2.6);
  }

  /** A drop lands, or joins the one it falls on (on a crowded glass, the nearest one). */
  land(x: number, y: number, r = 0.6 + Math.pow(this.rng(), 3) * 2.8): void {
    const full = this.drops.length >= MAX_DROPS;
    let near: GlassDrop | null = null;
    let best = full ? CROWDED_REACH : 0;
    for (const e of this.drops) {
      const gap = Math.hypot(e.x - x, e.y - y) - e.r - r * 0.8;
      if (gap < best) {
        best = gap;
        near = e;
      }
    }
    if (near) {
      near.r = Math.hypot(near.r, r);
      return;
    }
    if (full) return;
    this.drops.push({ x, y, r, running: false, vy: 0, caught: 0, wander: 0, shed: 0 });
  }

  /**
   * Move everything on by dt. `onGlass` says where there's glass (none where
   * the window is open); `trail` gets each stretch a running drop covers.
   */
  step(dt: number, onGlass: (x: number, y: number) => boolean, trail?: (x0: number, y0: number, x1: number, y1: number, r: number) => void): void {
    const rng = this.rng;
    this.landing += dt * LANDING;
    while (this.landing >= 1) {
      this.landing--;
      const x = rng() * this.w;
      const y = rng() * this.h;
      if (onGlass(x, y)) this.land(x, y);
    }

    const gone = new Set<GlassDrop>();
    const droplets: GlassDrop[] = [];
    for (const d of this.drops) {
      if (gone.has(d)) continue;
      if (!onGlass(d.x, d.y)) {
        gone.add(d);
        continue;
      }
      if (!d.running) {
        if (d.r < RUN_AT) continue;
        d.running = true;
        d.caught = rng() * 0.4;
      }
      if (d.caught > 0) {
        d.caught -= dt;
        d.vy = 0;
        continue;
      }
      // heavier runs faster
      const top = 16 + (d.r - STOP_AT) * 20;
      d.vy = Math.min(top, d.vy + 70 * dt);
      const dy = d.vy * dt;
      const x0 = d.x;
      const y0 = d.y;
      // it wanders where the glass lets it, drifting back toward straight down
      d.wander = d.wander * Math.pow(0.9, dy) + (rng() - 0.5) * Math.sqrt(dy) * 0.5;
      d.x += Math.sin(d.wander) * dy * 0.6;
      d.y += dy;
      trail?.(x0, y0, d.x, d.y, d.r);
      if (rng() < dt * 0.9) d.caught = 0.08 + rng() * 0.45;
      // a little of it stays behind
      d.shed += dy;
      if (d.shed > 10 + rng() * 14 && y0 < this.h) {
        d.shed = 0;
        const r = 0.4 + rng() * 0.45;
        d.r = Math.sqrt(Math.max(0, d.r * d.r - r * r));
        droplets.push({ x: x0 + (rng() - 0.5), y: y0 - d.r * 0.4, r, running: false, vy: 0, caught: 0, wander: 0, shed: 0 });
      }
      // and it takes along what's in its way
      for (const e of this.drops) {
        if (e === d || gone.has(e)) continue;
        if (Math.abs(e.x - d.x) < d.r + e.r && Math.abs(e.y - d.y) < d.r + e.r && Math.hypot(e.x - d.x, e.y - d.y) < d.r + e.r * 0.6) {
          d.r = Math.hypot(d.r, e.r);
          gone.add(e);
        }
      }
      if (d.r < STOP_AT) {
        d.running = false;
        d.vy = 0;
      }
      // off the bottom (or the side) of the glass
      if (d.y - d.r > this.h || d.x < -d.r || d.x > this.w + d.r) gone.add(d);
    }
    if (gone.size) {
      for (let i = this.drops.length - 1; i >= 0; i--) if (gone.has(this.drops[i])) this.drops.splice(i, 1);
    }
    for (const p of droplets) if (this.drops.length < MAX_DROPS) this.drops.push(p);
  }
}

/**
 * One drop, drawn once and stamped everywhere: a small lens, so the bright
 * sky shows upside down in its lower half and the darker street in its upper
 * half, with a glint. At dusk the sky in it dims and the streetlights warm it.
 */
export function dropSprite(day: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d')!;
  const mix = (a: number[], b: number[]) => a.map((v, i) => Math.round(v * day + b[i] * (1 - day)));
  const [sr, sg, sb] = mix([232, 240, 246], [255, 205, 140]);
  const skyAlpha = 0.38 + 0.37 * day;
  g.save();
  g.beginPath();
  g.arc(16, 16, 15.5, 0, Math.PI * 2);
  g.clip();
  // the rim, darker where the lens bends the most
  const rim = g.createRadialGradient(16, 16, 9, 16, 16, 16);
  rim.addColorStop(0, 'rgba(30,38,46,0)');
  rim.addColorStop(0.75, 'rgba(30,38,46,0.28)');
  rim.addColorStop(1, 'rgba(30,38,46,0.55)');
  g.fillStyle = rim;
  g.fillRect(0, 0, 32, 32);
  // the street and the houses, upside down at the top
  const ground = g.createRadialGradient(16, 9, 1, 16, 9, 11);
  ground.addColorStop(0, 'rgba(40,44,48,0.4)');
  ground.addColorStop(1, 'rgba(40,44,48,0)');
  g.fillStyle = ground;
  g.fillRect(0, 0, 32, 32);
  // the sky at the bottom
  const sky = g.createRadialGradient(16, 23, 1, 16, 22, 11);
  sky.addColorStop(0, `rgba(${sr},${sg},${sb},${skyAlpha.toFixed(2)})`);
  sky.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
  g.fillStyle = sky;
  g.fillRect(0, 0, 32, 32);
  g.restore();
  // the glint
  const glint = g.createRadialGradient(11, 9, 0, 11, 9, 4);
  glint.addColorStop(0, `rgba(255,255,255,${(0.6 + 0.35 * day).toFixed(2)})`);
  glint.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glint;
  g.fillRect(0, 0, 32, 32);
  return c;
}
