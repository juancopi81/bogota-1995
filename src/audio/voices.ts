// Recorded voices, keyed by line id. Loaded from the backstage into the
// browser (IndexedDB) and never uploaded anywhere.

import { idb } from '../world/store';
import { estimateSpeech, type Line } from '../content/lines';
import { bus } from '../world/bus';

class Voices {
  private buffers = new Map<string, AudioBuffer>();

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
    return id ? this.buffers.get(id) : undefined;
  }

  has(id: string): boolean {
    return this.buffers.has(id);
  }

  count(): number {
    return this.buffers.size;
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
