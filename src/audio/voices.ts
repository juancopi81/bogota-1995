// Recorded voices, keyed by line id. The included cast loads automatically;
// your own recordings from the backstage take priority and stay in IndexedDB.

import { idb } from '../world/store';
import { estimateSpeech, type Line } from '../content/lines';
import { bus } from '../world/bus';

const files = import.meta.glob<string>('../assets/voices/*.mp3', { eager: true, query: '?url', import: 'default' });

class Voices {
  private buffers = new Map<string, AudioBuffer>();
  private bundled = new Map<string, AudioBuffer>();

  async loadBundled(ctx: BaseAudioContext): Promise<void> {
    await Promise.all(Object.entries(files).map(async ([file, url]) => {
      const id = file.split('/').pop()!.replace(/\.mp3$/, '');
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        this.bundled.set(id, await ctx.decodeAudioData(await response.arrayBuffer()));
        bus.emit('media:loaded', { kind: 'voice', id });
      } catch {
        /* unavailable recording: keep its subtitle */
      }
    }));
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
  const buffer = voices.get(line.id);
  return buffer ? buffer.duration + 0.25 : estimateSpeech(line.text, pace);
}
