import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => new Map<string, ArrayBuffer>());
vi.mock('../src/world/store', () => ({
  kv: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
  idb: {
    keys: async () => [...saved.keys()],
    get: async (_store: string, id: string) => saved.get(id),
    put: async (_store: string, id: string, data: ArrayBuffer) => { saved.set(id, data); },
    clear: async () => { saved.clear(); },
  },
}));

/** Lines written after the last recording session: subtitles until their take is in. Once it is, empty this list. */
const AWAITING_TAKES = ['llamada.andres.monedero', 'llamada.andres.monedas', 'llamada.andres.yaLlegue', 'llamada.andres.laGrabo'];
const DIR = join(process.cwd(), 'src/assets/voices');
const MANIFEST = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as {
  clips: { id: string; speaker: string; spoken_text: string; sha256: string; voice_id: string }[];
};
/** How many takes are bundled. */
const BUNDLED = MANIFEST.clips.length;

const data = (id: number) => new Uint8Array([id]).buffer;
const bundled = { duration: 3.04 } as AudioBuffer;
const uploaded = { duration: 2.5 } as AudioBuffer;
const decode = vi.fn<(bytes: ArrayBuffer) => Promise<AudioBuffer>>();
const fetchFile = vi.fn<(url: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>>();

beforeEach(() => {
  vi.resetModules();
  saved.clear();
  decode.mockReset().mockImplementation(async (bytes) => {
    const id = new Uint8Array(bytes)[0];
    if (id === 9) throw new Error('Unreadable recording');
    return id === 3 ? uploaded : bundled;
  });
  fetchFile.mockReset().mockImplementation(async () => ({ ok: true, arrayBuffer: async () => data(1) }));
  vi.stubGlobal('fetch', fetchFile);
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const { voices } = await import('../src/audio/voices');
  return { voices, ctx: { decodeAudioData: decode } as unknown as BaseAudioContext };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('included voices', () => {
  it('ships every fixed line with unchanged dialogue and verified audio', async () => {
    const { allLines } = await import('../src/content/lines');
    await import('../src/content/stations');
    await import('../src/content/phonebook');
    await import('../src/content/tv');
    await import('../src/content/calle');
    await import('../src/objects/house');
    const fixed = allLines();
    const dir = DIR;
    const manifest = MANIFEST;
    expect(fixed).toHaveLength(192);
    // every line waiting for a take is a real line, and every other line has its take
    for (const id of AWAITING_TAKES) expect(fixed.map((line) => line.id)).toContain(id);
    const recorded = fixed.filter((line) => !AWAITING_TAKES.includes(line.id));
    expect(manifest.clips.map((line) => line.id).sort()).toEqual(recorded.map((line) => line.id).sort());
    expect(readdirSync(dir).filter((file) => file.endsWith('.mp3')).sort()).toEqual(recorded.map((line) => `${line.id}.mp3`).sort());
    for (const line of recorded) {
      const clip = manifest.clips.find((clip) => clip.id === line.id)!;
      expect([clip.speaker, clip.spoken_text]).toEqual([line.who, line.text]);
      expect(createHash('sha256').update(readFileSync(join(dir, `${line.id}.mp3`))).digest('hex')).toBe(clip.sha256);
    }
    const actor = (id: string) => manifest.clips.find(clip => clip.id === id)!.voice_id;
    expect(actor('tv.novela.n1')).not.toBe(actor('tv.novela.n2'));
    expect(['n1', 'n3', 'n5', 'n7'].map(id => actor(`tv.novela.${id}`))).toEqual(Array(4).fill(actor('tv.novela.n1')));
    expect(['n2', 'n4', 'n6'].map(id => actor(`tv.novela.${id}`))).toEqual(Array(3).fill(actor('tv.novela.n2')));
  });

  it('loads the cast with empty browser storage and preserves the canonical line IDs', async () => {
    const { voices, ctx } = await setup();
    const { lineDuration } = await import('../src/audio/voices');
    await Promise.all([voices.loadBundled(ctx), voices.loadSaved(ctx)]);
    expect(voices.count()).toBe(BUNDLED);
    expect(voices.get('casa.onces')).toBe(bundled);
    expect(voices.get('llamada.andres.deParte')).toBe(bundled);
    expect(voices.get('radioactiva.introFlorecita')).toBe(bundled);
    expect(voices.get('llamada.abuelita.alo')).toBe(bundled);
    expect(voices.get('llamada.angie.hola')).toBe(bundled);
    expect(voices.get('tv.novela.n1')).toBe(bundled);
    expect(voices.get('tv.novela.n2')).toBe(bundled);
    expect(voices.get('calle.botella')).toBe(bundled);
    expect(voices.get('calle.botellaLarga')).toBe(bundled);
    expect(voices.get('')).toBeUndefined();
    expect(saved.size).toBe(0);
    expect(lineDuration({ id: 'casa.onces', who: 'mama', text: '¡A tomar onces!' })).toBeCloseTo(3.29);
  });

  it.each(['included', 'uploaded'] as const)('keeps uploaded recordings when %s finishes decoding first', async (first) => {
    saved.set('casa.onces', data(3));
    const includedGate = deferred<AudioBuffer>();
    const uploadedGate = deferred<AudioBuffer>();
    decode.mockImplementation((bytes) => new Uint8Array(bytes)[0] === 3 ? uploadedGate.promise : includedGate.promise);
    const { voices, ctx } = await setup();
    const includedLoad = voices.loadBundled(ctx);
    const savedLoad = voices.loadSaved(ctx);
    if (first === 'included') {
      includedGate.resolve(bundled);
      await includedLoad;
      expect(voices.get('casa.onces')).toBe(bundled);
      uploadedGate.resolve(uploaded);
    } else {
      uploadedGate.resolve(uploaded);
      await savedLoad;
      expect(voices.get('casa.onces')).toBe(uploaded);
      includedGate.resolve(bundled);
    }
    await Promise.all([includedLoad, savedLoad]);
    expect(voices.get('casa.onces')).toBe(uploaded);
    expect(voices.count()).toBe(BUNDLED);
  });

  it('restores the included take after clearing uploads', async () => {
    const { voices, ctx } = await setup();
    await voices.loadBundled(ctx);
    expect(await voices.add(ctx, 'casa.onces', data(3))).toBe(true);
    expect(voices.get('casa.onces')).toBe(uploaded);
    await voices.clear();
    expect(voices.get('casa.onces')).toBe(bundled);
    expect(voices.count()).toBe(BUNDLED);
    expect(saved.size).toBe(0);
  });

  it('uses the included take when a saved upload cannot be decoded', async () => {
    saved.set('casa.onces', data(9));
    const { voices, ctx } = await setup();
    await Promise.all([voices.loadSaved(ctx), voices.loadBundled(ctx)]);
    expect(voices.get('casa.onces')).toBe(bundled);
    expect(voices.count()).toBe(BUNDLED);
  });

  it.each(['missing', 'unreadable', 'offline'])('keeps other recordings and subtitle fallback when one clip is %s', async (failure) => {
    fetchFile.mockImplementation(async (url) => {
      const onces = url.includes('casa.onces');
      if (onces && failure === 'offline') throw new Error('Network unavailable');
      return { ok: !(onces && failure === 'missing'), arrayBuffer: async () => data(onces && failure === 'unreadable' ? 9 : 1) };
    });
    const { voices, ctx } = await setup();
    await voices.loadBundled(ctx);
    expect(voices.has('casa.onces')).toBe(false);
    expect(voices.has('llamada.andres.deParte')).toBe(true);
    expect(voices.count()).toBe(BUNDLED - 1);
  });
});
