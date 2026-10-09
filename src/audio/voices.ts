// Recorded voices, keyed by line id. The included cast downloads in the
// background, the lines needed soonest first; your own recordings from the
// backstage take priority and stay in IndexedDB. How long each included take
// lasts is known from the build (see vite.config.ts), so the radio can plan
// around a line before it has arrived.

import lengths from 'virtual:voice-lengths';
import { idb } from '../world/store';
import { estimateSpeech, type Line } from '../content/lines';
import { bus } from '../world/bus';
import { downloads } from './downloads';

const files = import.meta.glob<string>('../assets/voices/*.mp3', { eager: true, query: '?url', import: 'default' });
const urls = new Map(Object.entries(files).map(([file, url]) => [file.split('/').pop()!.replace(/\.mp3$/, ''), url]));

/** A bundled file's bytes. The single-file builds inline them as data: URLs, which a strict page may not let us fetch. */
async function bytesOf(url: string, due: number): Promise<ArrayBuffer | null> {
  if (url.startsWith('data:')) {
    const raw = atob(url.slice(url.indexOf(',') + 1));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out.buffer;
  }
  return downloads.get(url, due);
}

class Voices {
  private buffers = new Map<string, AudioBuffer>();
  private bundled = new Map<string, AudioBuffer>();
  private ctx: BaseAudioContext | null = null;
  private loading = new Map<string, Promise<AudioBuffer | undefined>>();

  /**
   * Starts getting the included cast, the takes needed soonest first (`due`
   * says when, in world seconds). Resolves once every take has been tried.
   */
  loadBundled(ctx: BaseAudioContext, due: (id: string) => number = () => 0): Promise<void> {
    this.ctx = ctx;
    const ids = [...urls.keys()].sort((a, b) => due(a) - due(b));
    return Promise.all(ids.map((id) => this.fetch(id, due(id)))).then(() => undefined);
  }

  private fetch(id: string, due: number): Promise<AudioBuffer | undefined> {
    const url = urls.get(id);
    const ctx = this.ctx;
    if (!url || !ctx) return Promise.resolve(undefined);
    let job = this.loading.get(id);
    if (job) {
      // still waiting to download? then it's wanted sooner now
      downloads.hurry(url, due);
      return job;
    }
    job = (async () => {
      try {
        const data = await bytesOf(url, due);
        if (!data) return undefined;
        const buffer = await ctx.decodeAudioData(data);
        this.bundled.set(id, buffer);
        // its length was known all along: nothing to re-plan
        bus.emit('media:loaded', { kind: 'voice', id, planned: true });
        return buffer;
      } catch {
        /* unavailable recording: keep its subtitle */
        return undefined;
      }
    })();
    this.loading.set(id, job);
    return job;
  }

  /**
   * A line's recording once it's here (undefined if there's none, or it won't
   * load). Asking moves it to the front of the queue.
   */
  when(id: string): Promise<AudioBuffer | undefined> {
    const ready = this.get(id);
    return ready ? Promise.resolve(ready) : this.fetch(id, -Infinity);
  }

  /** Waits for these lines, but not longer than `ms`. */
  async ready(ids: string[], ms: number): Promise<void> {
    await Promise.race([Promise.all(ids.map((id) => this.when(id))), new Promise((r) => setTimeout(r, ms))]);
  }

  /** How long a line's recording lasts, known before it has downloaded. */
  length(id: string): number | undefined {
    return this.buffers.get(id)?.duration ?? lengths[id] ?? this.bundled.get(id)?.duration;
  }

  async loadSaved(ctx: BaseAudioContext): Promise<void> {
    const keys = await idb.keys('voices');
    await Promise.all(
      keys.map(async (id) => {
        const data = await idb.get<ArrayBuffer>('voices', id);
        if (!data) return;
        try {
          this.buffers.set(id, await ctx.decodeAudioData(data.slice(0)));
        } catch {
          /* unreadable file: ignore */
        }
      }),
    );
  }

  async add(ctx: BaseAudioContext, id: string, data: ArrayBuffer): Promise<boolean> {
    try {
      const buffer = await ctx.decodeAudioData(data.slice(0));
      this.buffers.set(id, buffer);
      await idb.put('voices', id, data);
      bus.emit('media:loaded', { kind: 'voice', id });
      return true;
    } catch {
      return false;
    }
  }

  get(id: string): AudioBuffer | undefined {
    return id ? this.buffers.get(id) ?? this.bundled.get(id) : undefined;
  }

  has(id: string): boolean {
    return !!this.get(id);
  }

  count(): number {
    return new Set([...this.bundled.keys(), ...this.buffers.keys()]).size;
  }

  async clear(): Promise<void> {
    this.buffers.clear();
    await idb.clear('voices');
  }
}

export const voices = new Voices();

/** How long a line lasts: its recording, or an estimate for the subtitle. */
export function lineDuration(line: Line, pace?: number): number {
  const length = line.id ? voices.length(line.id) : undefined;
  return length !== undefined ? length + 0.25 : estimateSpeech(line.text, pace);
}

/**
 * Says a line through `start` now if its recording is here, or as soon as it
 * arrives, joining partway through like a late listener (`offset` is how far
 * in). Nothing if it arrives after the line is over.
 */
export function speak(ctx: BaseAudioContext, id: string, start: (buffer: AudioBuffer, offset: number) => void): void {
  const ready = voices.get(id);
  if (ready) return start(ready, 0);
  const asked = ctx.currentTime;
  void voices.when(id).then((buffer) => {
    const offset = ctx.currentTime - asked;
    if (buffer && offset < buffer.duration) start(buffer, offset);
  });
}
