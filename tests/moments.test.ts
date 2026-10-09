import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/world/store', () => ({
  kv: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
  idb: { keys: async () => [], get: async () => undefined },
}));
vi.mock('../src/audio/music.worker.ts?worker&inline', () => ({ default: class { postMessage() {} } }));

async function radioactiva() {
  const { library } = await import('../src/audio/library');
  // the room's own music, planned from the build, as on the site
  library.init({ decodeAudioData: vi.fn() } as unknown as BaseAudioContext);
  const { Station } = await import('../src/broadcast/station');
  const { STATIONS } = await import('../src/content/stations');
  const def = STATIONS.find((s) => s.id === 'radioactiva')!;
  return { station: () => new Station(def), announce: new Set(def.requestLine!.announce.map((l) => l.id)) };
}

describe("the afternoon's moments, for reading the visit log", () => {
  it("match when Radioactiva gives its request number, and when a request can first air", async () => {
    const { REQUEST_NUMBER_AT, FIRST_REQUEST_AIRS } = await import('../src/research/moments');
    const { station, announce } = await radioactiva();
    const timeline = station().timeline;
    timeline.ensure(1800);
    const number = timeline.items.filter((i) => i.end > 0 && i.start < 1800 && i.cues.some((c) => announce.has(c.line.id)));
    // if this fails, the running order changed: update src/research/moments.ts
    expect(number.map((i) => i.start)).toEqual(REQUEST_NUMBER_AT.map((t) => expect.closeTo(t, 0)));
    expect(station().request(number[0].end + 60, 'florecita-rockera', null).start).toBeCloseTo(FIRST_REQUEST_AIRS, 0);
  });

  it('come in the order they happen', async () => {
    const { MOMENTS } = await import('../src/research/moments');
    expect(MOMENTS.map((m) => m.at)).toEqual([...MOMENTS.map((m) => m.at)].sort((a, b) => a - b));
  });
});
