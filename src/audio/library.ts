// Where broadcast audio comes from, in this order: your own files (loaded in
// the backstage, kept in this browser only), the room's own Creative Commons
// music (public/music/, standing in for 1995 songs you haven't loaded), and
// rendered placeholders.
//
// A full song is big once decoded (four minutes of stereo is ~85 MB), so files
// stay compressed until they're about to air, are decoded in mono, and only a
// few decoded songs are kept around.

import MusicWorker from './music.worker.ts?worker&inline';
import type { MusicJob } from './music.worker';
import houseFiles from 'virtual:house-music';
import { songShape, renderSong, renderJingle, renderBed, renderTeletype, type Style } from './music';
import { matchSong } from './matching';
import { readTags } from './tags';
import { SONGS, song } from '../content/songs';
import { HOUSE_ANTHEM, HOUSE_MUSIC, pickStandIn, bedsFor, type HouseTrack } from '../content/housemusic';
import { idb, kv } from '../world/store';
import { bus } from '../world/bus';
import { hash } from '../util/rng';

type JobKind = MusicJob['kind'];

/** Where the vocals probably start in a real song, for DJ talk over the intro. */
const DEFAULT_INTRO = 12;
/** How many decoded songs to keep. */
const KEEP_DECODED = 4;
const DURATIONS = 'library.durations';
const HOUSE_DURATIONS = 'library.houseDurations';

/**
 * The real audio a song slot carries: `yours:<song id>` (your file) or
 * `house:<track id>` (a house track standing in). Null means a placeholder.
 */
export type AudioKey = string | null;

interface House {
  track: HouseTrack;
  data: ArrayBuffer;
  duration: number;
}

class Library {
  private ctx!: BaseAudioContext;
  private worker: Worker | null = null;
  private jobs = new Map<number, (buffer: AudioBuffer) => void>();
  private nextJob = 1;
  private rendered = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer>>();
  /** Your songs (by song id), saved in IndexedDB, and how long each one is. */
  private yours = new Set<string>();
  private durations: Record<string, number> = kv.get(DURATIONS, {});
  /** Keep your anthem separate so concurrent startup loads cannot replace it. */
  private anthemBuffer: AudioBuffer | undefined;
  private bundledAnthem: AudioBuffer | undefined;
  private house = new Map<string, House>();
  /** How long each house file is, by track and file size: measured once, on the first visit. */
  private houseDurations: Record<string, number> = kv.get(HOUSE_DURATIONS, {});
  /** Decoded real songs, least recently used first. */
  private decoded = new Map<string, AudioBuffer>();
  private decoding = new Map<string, Promise<AudioBuffer | null>>();

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

  /** Your files from earlier visits. Only the anthem is decoded now; songs when they air. */
  async loadSaved(): Promise<void> {
    for (const id of await idb.keys('songs')) {
      if (id === 'anthem') {
        const data = await idb.get<ArrayBuffer>('songs', id);
        try {
          if (data) this.anthemBuffer = await this.ctx.decodeAudioData(data.slice(0));
        } catch {
          /* unreadable: no anthem */
        }
        continue;
      }
      // a song that left the list stays saved, but isn't used
      if (!SONGS.some((s) => s.id === id)) continue;
      this.yours.add(id);
      // saved before lengths were kept: measure it once
      if (!this.durations[id] && !(await this.decodeKey(`yours:${id}`))) this.yours.delete(id);
    }
  }

  /** The room's own music in public/music/ (it can't be fetched when the page is opened from disk). */
  async loadHouse(): Promise<void> {
    // Fetch everything at once, but decode one file at a time (a decoded song
    // takes tens of MB), and put each track on the air as soon as it's ready.
    // The anthem goes last: it isn't needed until 6:00.
    const order = [...houseFiles].sort((a, b) => Number(a === HOUSE_ANTHEM.file) - Number(b === HOUSE_ANTHEM.file));
    const fetched = order.map((file) =>
      fetch(`music/${encodeURIComponent(file)}`)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .catch(() => null),
    );
    for (const [i, file] of order.entries()) {
      try {
        const data = await fetched[i];
        if (!data) continue;
        if (file === HOUSE_ANTHEM.file) {
          this.bundledAnthem = await this.decode(data);
          bus.emit('media:loaded', { kind: 'anthem', id: 'anthem' });
          continue;
        }
        const match = matchSong({ path: file, tags: readTags(data) }, HOUSE_MUSIC);
        const track = HOUSE_MUSIC.find((t) => match?.target.kind === 'song' && t.id === match.target.id);
        if (!track || this.house.has(track.id)) continue;
        const key = `${track.id}:${data.byteLength}`;
        let duration = this.houseDurations[key];
        if (!duration) {
          const buffer = await this.decode(data);
          duration = buffer.duration;
          this.houseDurations[key] = duration;
          kv.set(HOUSE_DURATIONS, this.houseDurations);
          this.remember(`house:${track.id}`, buffer);
        }
        this.house.set(track.id, { track, data, duration });
        bus.emit('media:loaded', { kind: 'house', id: track.id });
      } catch {
        /* a file that won't load: play without it */
      }
    }
  }

  // ---------- decoding real songs ----------

  /** Decode to mono: the radio is one speaker away anyway, and it halves the memory. */
  private async decode(data: ArrayBuffer): Promise<AudioBuffer> {
    const full = await this.ctx.decodeAudioData(data.slice(0));
    if (full.numberOfChannels === 1) return full;
    const mono = this.ctx.createBuffer(1, full.length, full.sampleRate);
    const out = mono.getChannelData(0);
    const n = full.numberOfChannels;
    for (let c = 0; c < n; c++) {
      const ch = full.getChannelData(c);
      for (let i = 0; i < ch.length; i++) out[i] += ch[i] / n;
    }
    return mono;
  }

  private remember(key: string, buffer: AudioBuffer): void {
    this.decoded.delete(key);
    this.decoded.set(key, buffer);
    while (this.decoded.size > KEEP_DECODED) this.decoded.delete(this.decoded.keys().next().value!);
  }

  private cached(key: string): AudioBuffer | undefined {
    const buffer = this.decoded.get(key);
    if (buffer) this.remember(key, buffer);
    return buffer;
  }

  private decodeKey(key: string): Promise<AudioBuffer | null> {
    const ready = this.cached(key);
    if (ready) return Promise.resolve(ready);
    let job = this.decoding.get(key);
    if (!job) {
      job = (async () => {
        const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
        try {
          const data = kind === 'house' ? this.house.get(id)?.data : await idb.get<ArrayBuffer>('songs', id);
          if (!data) return null;
          const buffer = await this.decode(data);
          if (kind === 'yours' && this.durations[id] !== buffer.duration) {
            this.durations[id] = buffer.duration;
            kv.set(DURATIONS, this.durations);
          }
          this.remember(key, buffer);
          return buffer;
        } catch {
          return null;
        } finally {
          this.decoding.delete(key);
        }
      })();
      this.decoding.set(key, job);
    }
    return job;
  }

  // ---------- placeholders ----------

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

  private placeholder(songId: string): Promise<AudioBuffer> {
    return this.render(`song:${songId}`, 'song', song(songId).style, hash(songId));
  }

  // ---------- songs ----------

  isUploaded(id: string): boolean {
    return id === 'anthem' ? !!this.anthemBuffer : this.yours.has(id);
  }

  /** How long one of your files is (seconds), if it's loaded. */
  lengthOf(id: string): number | undefined {
    return id === 'anthem' ? this.anthem()?.duration : this.yours.has(id) ? this.durations[id] : undefined;
  }

  /** The house track that fills a 1995 song's slot on a station (none if you loaded the song). */
  standIn(songId: string, stationId: string): HouseTrack | null {
    if (this.yours.has(songId)) return null;
    return pickStandIn(song(songId), stationId, [...this.house.values()].map((h) => h.track));
  }

  /** What a song slot will carry, decided once when it's scheduled. */
  audioFor(songId: string, stationId: string): AudioKey {
    if (this.yours.has(songId)) return `yours:${songId}`;
    const stand = this.standIn(songId, stationId);
    return stand ? `house:${stand.id}` : null;
  }

  /** The house track behind an audio key, if it's one. */
  houseTrack(audio: AudioKey): HouseTrack | undefined {
    return audio?.startsWith('house:') ? this.house.get(audio.slice(6))?.track : undefined;
  }

  /** Length and intro of a song slot as it will air. */
  shape(songId: string, audio: AudioKey): { duration: number; intro: number } {
    const duration = !audio ? undefined : audio.startsWith('house:') ? this.house.get(audio.slice(6))?.duration : this.durations[songId];
    if (duration) return { duration, intro: Math.min(DEFAULT_INTRO, duration / 4) };
    return songShape(song(songId).style, hash(songId));
  }

  /** The audio of a song slot, if it's ready now (starts getting it ready if not). */
  song(songId: string, audio: AudioKey): AudioBuffer | undefined {
    if (audio) {
      const buffer = this.cached(audio);
      if (!buffer) void this.decodeKey(audio);
      return buffer;
    }
    const ready = this.rendered.get(`song:${songId}`);
    if (!ready) void this.placeholder(songId);
    return ready;
  }

  whenSong(songId: string, audio: AudioKey): Promise<AudioBuffer> {
    if (!audio) return this.placeholder(songId);
    return this.decodeKey(audio).then((b) => b ?? this.placeholder(songId));
  }

  /** A real recording by its key (your file or a house track), decoded; null if it won't decode. */
  whenAudio(audio: string): Promise<AudioBuffer | null> {
    return this.decodeKey(audio);
  }

  /** Get ready the songs about to air. */
  prefetch(slots: { songId: string; audio: AudioKey }[]): void {
    for (const { songId, audio } of slots) void this.whenSong(songId, audio);
  }

  // ---------- station sounds ----------

  whenJingle(stationId: string, style: Style): Promise<AudioBuffer> {
    return this.render(`jingle:${stationId}`, 'jingle', style, hash(stationId));
  }

  /** The bed under the announcers: a house instrumental if the station has one, or a placeholder. */
  bed(stationId: string): AudioBuffer | undefined {
    const beds = bedsFor(stationId, [...this.house.values()].map((h) => h.track));
    if (beds.length) return this.cached(`house:${beds[hash(stationId) % beds.length].id}`);
    return this.rendered.get(`bed:${stationId}`);
  }

  whenBed(stationId: string, style: Style): Promise<AudioBuffer> {
    const beds = bedsFor(stationId, [...this.house.values()].map((h) => h.track));
    const placeholder = () => this.render(`bed:${stationId}`, 'bed', style, hash(`${stationId}-bed`));
    if (!beds.length) return placeholder();
    return this.decodeKey(`house:${beds[hash(stationId) % beds.length].id}`).then((b) => b ?? placeholder());
  }

  whenTeletype(): Promise<AudioBuffer> {
    return this.render('teletype', 'teletype', 'pop', 1995);
  }

  peek(key: string): AudioBuffer | undefined {
    return this.rendered.get(key);
  }

  // ---------- the anthem ----------

  anthem(): AudioBuffer | undefined {
    return this.anthemBuffer ?? this.bundledAnthem;
  }

  // ---------- your files ----------

  async upload(id: string, data: ArrayBuffer): Promise<boolean> {
    try {
      if (id === 'anthem') this.anthemBuffer = await this.ctx.decodeAudioData(data.slice(0));
      else {
        const buffer = await this.decode(data);
        this.durations[id] = buffer.duration;
        kv.set(DURATIONS, this.durations);
        this.yours.add(id);
        this.remember(`yours:${id}`, buffer);
      }
      await idb.put('songs', id, data);
      bus.emit('media:loaded', { kind: id === 'anthem' ? 'anthem' : 'song', id });
      return true;
    } catch {
      return false;
    }
  }

  async forget(id: string): Promise<void> {
    if (id === 'anthem') this.anthemBuffer = undefined;
    else {
      this.yours.delete(id);
      this.decoded.delete(`yours:${id}`);
      delete this.durations[id];
      kv.set(DURATIONS, this.durations);
    }
    await idb.del('songs', id);
    bus.emit('media:loaded', { kind: id === 'anthem' ? 'anthem' : 'song', id });
  }

  /** The house tracks that loaded (for the credits). */
  get houseLoaded(): HouseTrack[] {
    return [...this.house.values()].map((h) => h.track);
  }

  get catalog() {
    return SONGS;
  }
}

export const library = new Library();
