import { expect, it, vi } from 'vitest';
import { StationPlayer } from '../src/broadcast/player';
import type { Station } from '../src/broadcast/station';
import type { Scheduled } from '../src/broadcast/types';

const toCtx = vi.hoisted(() => vi.fn<(t: number) => number>());
vi.mock('../src/world/clock', () => ({ clock: { toCtx } }));
vi.mock('../src/world/bus', () => ({ bus: { on: vi.fn(), emit: vi.fn() } }));
vi.mock('../src/broadcast/station', () => ({ JINGLE_SECONDS: 3.2 }));
vi.mock('../src/audio/voices', () => ({ voices: { get: () => undefined } }));
vi.mock('../src/audio/library', () => ({
  library: { song: () => ({ duration: 180 }) },
}));

it.each([
  { name: 'entering mid-song', t: 0, start: -120, end: 60, cut: false },
  { name: 'joining during the final fade', t: 59.9, start: -120, end: 60, cut: false },
  { name: 'skipping to just before the anthem', t: 1795, start: 1689, end: 1800, cut: true },
])('plays bundled music without negative automation times when $name', ({ t, start, end, cut }) => {
  const now = 0.1;
  toCtx.mockImplementation((worldTime) => now + worldTime - t);
  const automation: number[] = [];
  const automate = (_value: number, time: number) => {
    if (!Number.isFinite(time) || time < 0) throw new RangeError('Invalid audio time');
    automation.push(time);
  };
  const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const ctx = {
    currentTime: now,
    createGain: () => ({
      connect: vi.fn(),
      gain: { setValueAtTime: automate, linearRampToValueAtTime: automate },
    }),
    createBufferSource: () => source,
  } as unknown as AudioContext;
  const item: Scheduled = {
    start, end, cut, cues: [],
    seg: { kind: 'song', songId: 'matador', audio: 'house:que-paciencia' },
  };
  const station = {
    def: { id: 'radioactiva' },
    timeline: { at: () => item, after: () => undefined },
  } as unknown as Station;
  const player = new StationPlayer(ctx, station);
  player.setActive(true);

  expect(() => player.tick(t)).not.toThrow();
  expect(automation.length).toBeGreaterThan(0);
  expect(source.start).toHaveBeenCalledOnce();
  expect(source.start.mock.calls[0][0]).toBe(now);
  expect(source.start.mock.calls[0][1]).toBeCloseTo(t - start);
});
