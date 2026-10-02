import { describe, expect, it } from 'vitest';
import { GlassRain, RUN_AT } from '../src/scene/glassrain';
import { mulberry32 } from '../src/util/rng';

const W = 660;
const H = 360;
const everywhere = () => true;

describe('the rain on the window glass', () => {
  it("keeps the glass wet and running for as long as you look: it never dries up or stalls", () => {
    const rain = new GlassRain(W, H, mulberry32(28));
    const seen = new Set<object>();
    const perMinute: number[] = [];
    let runs = 0;
    for (let s = 0; s < 5 * 60 * 30; s++) {
      rain.step(1 / 30, everywhere);
      for (const d of rain.drops) {
        if (d.running && !seen.has(d)) {
          seen.add(d);
          runs++;
        }
      }
      if (s % (60 * 30) === 60 * 30 - 1) {
        perMinute.push(runs);
        runs = 0;
        expect(rain.drops.length).toBeGreaterThan(150);
        expect(rain.drops.every((d) => d.y < H + d.r * 2 && d.x > -20 && d.x < W + 20)).toBe(true);
      }
    }
    for (const n of perMinute) expect(n).toBeGreaterThan(15);
  });

  it('runs heavy drops down, wandering a little, and leaves droplets behind', () => {
    const rain = new GlassRain(W, H, mulberry32(5));
    rain.drops.length = 0;
    rain.land(200, 40, RUN_AT + 1.5);
    const drop = rain.drops[0];
    const path: { x: number; y: number }[] = [];
    for (let s = 0; s < 30 * 4 && rain.drops.includes(drop); s++) {
      rain.step(1 / 30, everywhere);
      path.push({ x: drop.x, y: drop.y });
    }
    for (let i = 1; i < path.length; i++) expect(path[i].y).toBeGreaterThanOrEqual(path[i - 1].y);
    const last = path[path.length - 1];
    expect(last.y - 40).toBeGreaterThan(60);
    expect(Math.abs(last.x - 200)).toBeLessThan((last.y - 40) * 0.5);
    // the droplets it shed sit on its way down
    expect(rain.drops.filter((d) => d !== drop && !d.running && Math.abs(d.x - 200) < 40 && d.y < last.y).length).toBeGreaterThan(0);
  });

  it('joins drops that touch, keeping the water', () => {
    const rain = new GlassRain(W, H, mulberry32(9));
    rain.drops.length = 0;
    rain.land(100, 100, 2);
    rain.land(101, 101, 1.5);
    expect(rain.drops).toHaveLength(1);
    expect(rain.drops[0].r).toBeCloseTo(Math.hypot(2, 1.5));
  });

  it('keeps no drops where the window is open', () => {
    const rain = new GlassRain(W, H, mulberry32(3));
    const onGlass = (x: number, y: number) => y < 107 || x < 330;
    for (let s = 0; s < 30 * 20; s++) rain.step(1 / 30, onGlass);
    expect(rain.drops.some((d) => !onGlass(d.x, d.y))).toBe(false);
    expect(rain.drops.filter((d) => d.y < 107 && d.x > 330).length).toBeGreaterThan(10);
  });
});
