import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The files fetched so far, in order, and how to finish each one. */
const started: string[] = [];
const finish = new Map<string, (ok: boolean) => void>();
const fetchFile = vi.fn((url: string) => {
  started.push(url);
  return new Promise((resolve) => finish.set(url, (ok) => resolve({ ok, arrayBuffer: async () => new TextEncoder().encode(url).buffer })));
});

beforeEach(() => {
  vi.resetModules();
  started.length = 0;
  finish.clear();
  fetchFile.mockClear();
  vi.stubGlobal('fetch', fetchFile);
});
afterEach(() => vi.unstubAllGlobals());

const settle = () => new Promise((r) => setTimeout(r, 0));
const text = (data: ArrayBuffer | null) => (data ? new TextDecoder().decode(data) : null);

async function queue(dues: Record<string, number>) {
  const { downloads } = await import('../src/audio/downloads');
  const got = Object.fromEntries(Object.entries(dues).map(([url, due]) => [url, downloads.get(url, due)]));
  await settle();
  return { downloads, got };
}

describe('downloads', () => {
  it('fetches four at a time, the soonest needed first', async () => {
    const { got } = await queue({ a: 50, b: 10, c: 40, d: 0, e: 30, f: 20 });
    expect(started).toEqual(['d', 'b', 'f', 'e']);
    finish.get('b')!(true);
    expect(text(await got.b)).toBe('b');
    await settle();
    expect(started).toEqual(['d', 'b', 'f', 'e', 'c']);
  });

  it('brings a waiting file forward when it is wanted sooner', async () => {
    const { downloads } = await queue({ a: 50, b: 10, c: 40, d: 0, e: 30, f: 20 });
    downloads.hurry('a', -1);
    finish.get('d')!(true);
    await settle();
    expect(started.at(-1)).toBe('a');
  });

  it('fetches a file once however often it is asked for, and gives null for one that is missing', async () => {
    const { downloads, got } = await queue({ a: 0 });
    const again = downloads.get('a', -5);
    finish.get('a')!(false);
    expect(await got.a).toBeNull();
    expect(await again).toBeNull();
    expect(fetchFile).toHaveBeenCalledTimes(1);
  });
});
