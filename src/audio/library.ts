// Where broadcast audio comes from: your own files (loaded in the backstage,
// kept in this browser only) or, until then, rendered placeholders.

import MusicWorker from './music.worker.ts?worker&inline';
import type { MusicJob } from './music.worker';
import { songShape, renderSong, renderJingle, renderBed, renderTeletype, type Style } from './music';
import { SONGS, song } from '../content/songs';
import { idb } from '../world/store';
import { bus } from '../world/bus';
import { hash } from '../util/rng';

type JobKind = MusicJob['kind'];

/** Where the vocals probably start in a real song, for DJ talk over the intro. */
const DEFAULT_INTRO = 12;

class Library {
  private ctx!: BaseAudioContext;
  private worker: Worker | null = null;
  private jobs = new Map<number, (buffer: AudioBuffer) => void>();
  private nextJob = 1;
  private rendered = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();
  private uploaded = new Map<string, AudioBuffer>();

  init(ctx: BaseAudioContext): void {
    this.ctx = ctx;
    try {
      this.worker = new MusicWorker();
      this.worker.onmessage = (e: MessageEvent<{ id: number; left: Float32Array; right: Float32Array; sampleRate: number }>) => {
        const { id, left, right, sampleRate } = e.data;
        const buffer = ctx.createBuffer(2, left.length, sampleRate);
        buffer.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
        buffer.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
        this.jobs.get(id)?.(buffer);
        this.jobs.delete(id);
      };
    } catch {
      this.worker = null;
    }
  }

  /** Load the files you saved in earlier visits. */
  async loadSaved(): Promise<void> {
    const keys = await idb.keys('songs');
    await Promise.all(
      keys.map(async (id) => {
        // a song that left the list stays saved, but isn't decoded
        if (id !== 'anthem' && !SONGS.some((s) => s.id === id)) return;
        const data = await idb.get<ArrayBuffer>('songs', id);
        if (!data) return;
        try {
          this.uploaded.set(id, await this.ctx.decodeAudioData(data.slice(0)));
        } catch {
          /* ignore unreadable files */
        }
      }),
    );
  }

  private render(key: string, kind: JobKind, style: Style, seed: number): Promise<AudioBuffer> {
    const done = this.rendered.get(key);
    if (done) return Promise.resolve(done);
    let promise = this.pending.get(key);
    if (!promise) {
      promise = new Promise<AudioBuffer>((resolve) => {
        const id = this.nextJob++;
        this.jobs.set(id, (buffer) => {
          this.rendered.set(key, buffer);
          this.pending.delete(key);
          resolve(buffer);
        });
        const job: MusicJob = { id, kind, style, seed };
        if (this.worker) this.worker.postMessage(job);
        else
          // no workers: render on the main thread, a moment later
          setTimeout(() => {
            const r = kind === 'song' ? renderSong(style, seed) : kind === 'jingle' ? renderJingle(style, seed) : kind === 'bed' ? renderBed(style, seed) : renderTeletype(seed);
            const buffer = this.ctx.createBuffer(2, r.left.length, r.sampleRate);
            buffer.copyToChannel(r.left as Float32Array<ArrayBuffer>, 0);
            buffer.copyToChannel(r.right as Float32Array<ArrayBuffer>, 1);
            this.jobs.get(id)?.(buffer);
          }, 0);
      });
      this.pending.set(key, promise);
    }
    return promise;
  }

  // ---------- songs ----------

  isUploaded(id: string): boolean {
    return this.uploaded.has(id);
  }

  /** Length and intro of a song as it will air. */
  shape(songId: string): { duration: number; intro: number } {
    const real = this.uploaded.get(songId);
    if (real) return { duration: real.duration, intro: Math.min(DEFAULT_INTRO, real.duration / 4) };
    return songShape(song(songId).style, hash(songId));
  }

  /** The audio for a song, if ready now (starts rendering it if not). */
  song(songId: string): AudioBuffer | undefined {
    const real = this.uploaded.get(songId);
    if (real) return real;
    const key = `song:${songId}`;
    const ready = this.rendered.get(key);
    if (!ready) void this.render(key, 'song', song(songId).style, hash(songId));
    return ready;
  }

  whenSong(songId: string): Promise<AudioBuffer> {
    const real = this.uploaded.get(songId);
    if (real) return Promise.resolve(real);
    return this.render(`song:${songId}`, 'song', song(songId).style, hash(songId));
  }

  // ---------- station sounds ----------

  whenJingle(stationId: string, style: Style): Promise<AudioBuffer> {
    return this.render(`jingle:${stationId}`, 'jingle', style, hash(stationId));
  }

  whenBed(stationId: string, style: Style): Promise<AudioBuffer> {
    return this.render(`bed:${stationId}`, 'bed', style, hash(`${stationId}-bed`));
  }

  whenTeletype(): Promise<AudioBuffer> {
    return this.render('teletype', 'teletype', 'pop', 1995);
  }

  peek(key: string): AudioBuffer | undefined {
    return this.rendered.get(key);
  }

  // ---------- the anthem ----------

  anthem(): AudioBuffer | undefined {
    return this.uploaded.get('anthem');
  }

  // ---------- uploads ----------

  async upload(id: string, data: ArrayBuffer): Promise<boolean> {
    try {
      const buffer = await this.ctx.decodeAudioData(data.slice(0));
      this.uploaded.set(id, buffer);
      await idb.put('songs', id, data);
      bus.emit('media:loaded', { kind: id === 'anthem' ? 'anthem' : 'song', id });
      return true;
    } catch {
      return false;
    }
  }

  async forget(id: string): Promise<void> {
    this.uploaded.delete(id);
    await idb.del('songs', id);
    bus.emit('media:loaded', { kind: id === 'anthem' ? 'anthem' : 'song', id });
  }

  /** Start rendering placeholders we are about to need. */
  prefetch(songIds: string[]): void {
    for (const id of songIds) if (!this.uploaded.has(id)) void this.whenSong(id);
  }

  get catalog() {
    return SONGS;
  }
}

export const library = new Library();
