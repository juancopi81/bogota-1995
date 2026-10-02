import { describe, expect, it } from 'vitest';
import { busStops, traffic, VEHICLE_LEN, vehicleX, vehiclesAt, vehicleSpeed } from '../src/world/street';
import { PANADERIA_DOOR, recicladorCalls, RECICLADOR_ROUNDS, walkers, walkerX } from '../src/world/life';

describe('the traffic below the window', () => {
  it('never puts two vehicles of a lane on top of each other, and nothing rolls backwards', () => {
    for (let t = 0; t < 1200; t += 0.25) {
      for (const dir of [1, -1] as const) {
        const lane = vehiclesAt(t)
          .filter((v) => v.dir === dir)
          .map((v) => ({ v, x: vehicleX(v, t) }))
          .sort((a, b) => a.x - b.x);
        for (let i = 1; i < lane.length; i++) expect(lane[i - 1].x + VEHICLE_LEN[lane[i - 1].v.kind]).toBeLessThanOrEqual(lane[i].x + 0.5);
      }
    }
    for (const v of traffic.slice(0, 300)) {
      for (let i = 1; i < v.xs.length; i++) expect((v.xs[i] - v.xs[i - 1]) * v.dir).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('comes in waves: several vehicles a minute, with quiet spells in between', () => {
    const perMinute = Array.from({ length: 20 }, (_, m) => traffic.filter((v) => v.t0 >= m * 60 && v.t0 < (m + 1) * 60).length);
    const mean = perMinute.reduce((a, b) => a + b, 0) / perMinute.length;
    expect(mean).toBeGreaterThan(4);
    expect(mean).toBeLessThan(11);
    let quiet = 0;
    for (let t = 0; t < 600; t += 1) if (vehiclesAt(t).length === 0) quiet++;
    expect(quiet).toBeGreaterThan(20);
  });

  it('pulls busetas over for someone, and whoever is behind waits and honks', () => {
    const early = busStops.filter((s) => s.from > 0 && s.from < 1800);
    expect(early.length).toBeGreaterThanOrEqual(4);
    const queued = early.flatMap((s) =>
      traffic
        .filter((v) => v.dir === -1 && v.id !== s.vehicle && v.t0 < s.from && v.t1 > s.to && vehicleX(v, s.from + 2) > s.x && vehicleX(v, s.from + 2) < s.x + 700)
        .map((v) => ({ s, v })),
    );
    expect(queued.length).toBeGreaterThan(0);
    for (const { s, v } of queued) {
      // stopped behind the buseta, not through it
      expect(vehicleX(v, s.to - 0.5)).toBeGreaterThanOrEqual(s.x + VEHICLE_LEN.buseta);
      expect(vehicleSpeed(v, s.to - 0.5)).toBeLessThan(5);
    }
    expect(queued.some(({ s, v }) => v.honks.some((h) => h.kind === 'impatient' && h.t > s.from && h.t < s.to + 2))).toBe(true);
  });
});

describe('the people on the far sidewalk', () => {
  it('gets whoever waits on the buseta: they flag it as it comes, and are gone once it stops', () => {
    for (const s of busStops.filter((x) => x.from > 0 && x.from < 3600)) {
      const rider = walkers.find((w) => w.kind === 'rider' && w.flag && Math.abs(w.flag[0] + 5.5 - s.from) < 0.01)!;
      expect(rider).toBeDefined();
      expect(walkerX(rider, s.from - 6)).toBeCloseTo(s.x + 34, 0);
      expect(rider.t1).toBeGreaterThan(s.from);
      expect(rider.t1).toBeLessThan(s.from + 3);
    }
  });

  it('sends the reciclador by twice, calling out as he goes', () => {
    const rounds = walkers.filter((w) => w.kind === 'reciclador');
    expect(rounds.map((w) => Math.round(w.t0 / 60))).toEqual(RECICLADOR_ROUNDS.map((r) => Math.round((r.from - 3.5) / 60)));
    for (const w of rounds) {
      const calls = recicladorCalls.filter((c) => c.t >= w.t0 - 11 && c.t <= w.t1 + 11);
      expect(calls.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('lets customers into the panadería and out again with the bread', () => {
    const going = walkers.filter((w) => w.kind === 'customer' && !w.bread);
    const leaving = walkers.filter((w) => w.kind === 'customer' && w.bread);
    expect(going.length).toBeGreaterThan(5);
    for (const w of going) expect(w.path[w.path.length - 1].x).toBe(PANADERIA_DOOR);
    for (const w of leaving) expect(w.path[0].x).toBe(PANADERIA_DOOR);
  });
});
