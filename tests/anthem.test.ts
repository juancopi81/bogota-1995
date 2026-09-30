import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOUSE_ANTHEM } from '../src/content/housemusic';

const saved = vi.hoisted(() => new Map<string, ArrayBuffer>());
vi.mock('../src/world/store', () => ({
  kv: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
  idb: {
    keys: async () => [...saved.keys()],
    get: async (_store: string, id: string) => saved.get(id),
    put: async (_store: string, id: string, data: ArrayBuffer) => { saved.set(id, data); },
    del: async (_store: string, id: string) => { saved.delete(id); },
  },
}));
vi.mock('../src/audio/music.worker.ts?worker&inline', () => ({ default: class {} }));
vi.mock('virtual:house-music', () => ({
  default: ['himno-nacional-de-colombia.mp3', 'los-sundayers-que-paciencia.mp3'],
}));

const data = (id: number) => new Uint8Array([id]).buffer;
const bundled = { numberOfChannels: 1, duration: 160.914 } as AudioBuffer;
const uploaded = { numberOfChannels: 1, duration: 95 } as AudioBuffer;
const song = { numberOfChannels: 1, duration: 173.12 } as AudioBuffer;
const decode = vi.fn<(bytes: ArrayBuffer) => Promise<AudioBuffer>>();
const fetchFile = vi.fn<(url: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>>();

beforeEach(() => {
  vi.resetModules();
  saved.clear();
  decode.mockReset().mockImplementation(async (bytes) => {
    const id = new Uint8Array(bytes)[0];
    if (id === 9) throw new Error('Unreadable recording');
    return id === 1 ? bundled : id === 3 ? uploaded : song;
  });
  fetchFile.mockReset().mockImplementation(async (url) => ({
    ok: true,
    arrayBuffer: async () => data(url.endsWith(HOUSE_ANTHEM.file) ? 1 : 2),
  }));
  vi.stubGlobal('fetch', fetchFile);
});
afterEach(() => vi.unstubAllGlobals());

async function setup() {
  const { library } = await import('../src/audio/library');
  library.init({ decodeAudioData: decode } as unknown as BaseAudioContext);
  return library;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('bundled anthem', () => {
  it('loads without uploads, notifies the broadcasters, and stays out of song rotation', async () => {
    const library = await setup();
    const { bus } = await import('../src/world/bus');
    const loaded = vi.fn();
    bus.on('media:loaded', loaded);
    await library.loadHouse();

    expect(library.anthem()).toBe(bundled);
    expect(library.lengthOf('anthem')).toBe(bundled.duration);
    expect(library.isUploaded('anthem')).toBe(false);
    expect(saved.has('anthem')).toBe(false);
    expect(library.houseLoaded.map((track) => track.id)).toEqual(['que-paciencia']);
    expect(loaded).toHaveBeenCalledWith({ kind: 'anthem', id: 'anthem' });

    const { Station } = await import('../src/broadcast/station');
    const { STATIONS } = await import('../src/content/stations');
    for (const def of STATIONS) {
      const item = new Station(def).timeline.at(1800.5)!;
      expect(item.seg.kind).toBe('anthem');
      expect(item.start).toBe(1800);
      expect(item.end - item.start).toBeCloseTo(bundled.duration + 1.5);
    }
  });

  it.each(['bundled', 'uploaded'] as const)('keeps the saved anthem when %s finishes decoding first', async (first) => {
    saved.set('anthem', data(3));
    const houseGate = deferred<AudioBuffer>();
    const savedGate = deferred<AudioBuffer>();
    decode.mockImplementation((bytes) => {
      const id = new Uint8Array(bytes)[0];
      return id === 1 ? houseGate.promise : id === 3 ? savedGate.promise : Promise.resolve(song);
    });
    const library = await setup();
    const houseLoad = library.loadHouse();
    const savedLoad = library.loadSaved();
    if (first === 'bundled') {
      houseGate.resolve(bundled);
      await houseLoad;
      expect(library.anthem()).toBe(bundled);
      savedGate.resolve(uploaded);
    } else {
      savedGate.resolve(uploaded);
      await savedLoad;
      expect(library.anthem()).toBe(uploaded);
      houseGate.resolve(bundled);
    }
    await Promise.all([houseLoad, savedLoad]);
    expect(library.anthem()).toBe(uploaded);
    expect(library.isUploaded('anthem')).toBe(true);
  });

  it('restores the bundled version after removing an uploaded anthem', async () => {
    const library = await setup();
    await library.loadHouse();
    expect(await library.upload('anthem', data(3))).toBe(true);
    expect(library.anthem()).toBe(uploaded);
    await library.forget('anthem');
    expect(library.anthem()).toBe(bundled);
    expect(library.isUploaded('anthem')).toBe(false);
    expect(saved.has('anthem')).toBe(false);
  });

  it('uses the bundled version when a saved recording is unreadable', async () => {
    saved.set('anthem', data(9));
    const library = await setup();
    await Promise.all([library.loadSaved(), library.loadHouse()]);
    expect(library.anthem()).toBe(bundled);
    expect(library.isUploaded('anthem')).toBe(false);
  });

  it.each(['missing', 'unreadable'])('still loads songs when the bundled anthem is %s', async (failure) => {
    fetchFile.mockImplementation(async (url) => ({
      ok: !url.endsWith(HOUSE_ANTHEM.file) || failure !== 'missing',
      arrayBuffer: async () => data(url.endsWith(HOUSE_ANTHEM.file) ? 9 : 2),
    }));
    const library = await setup();
    await library.loadHouse();
    expect(library.anthem()).toBeUndefined();
    expect(library.houseLoaded.map((track) => track.id)).toEqual(['que-paciencia']);
  });
});
