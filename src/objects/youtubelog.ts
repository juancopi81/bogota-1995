// What YouTube's player on the TV reports, kept as counts for the test: how
// long each program took to come on, and what the player said in between.
// Ads play as YouTube serves them; these say how it reports one: as another
// video, as the program standing still, or in fields the player doesn't send
// otherwise. Never a title or a video id: an ad can be picked for the visitor.

import type { Value } from '../research/record';

/** What the player sends while a program simply plays (seen on 27 October 2026). */
const FIELDS = new Set([
  'apiInterface',
  'availablePlaybackRates',
  'availableQualityLevels',
  'captions',
  'currentTime',
  'currentTimeLastUpdated_',
  'debugText',
  'duration',
  'mediaReferenceTime',
  'muted',
  'namespaces',
  'option',
  'options',
  'playbackQuality',
  'playbackRate',
  'playerMode',
  'playerState',
  'playlist',
  'playlistId',
  'playlistIndex',
  'preferredQuality',
  'progressState',
  'size',
  'sphericalProperties',
  'value',
  'videoBytesLoaded',
  'videoBytesTotal',
  'videoContentRect',
  'videoData',
  'videoEmbedCode',
  'videoInfoVisible',
  'videoLoadedFraction',
  'videoStartBytes',
  'videoUrl',
  'volume',
]);
const EVENTS = new Set(['initialDelivery', 'onReady', 'infoDelivery', 'apiInfoDelivery', 'alreadyInitialized', 'onStateChange', 'onError', 'onPlaybackQualityChange', 'onPlaybackRateChange', 'onVolumeChange', 'onApiChange']);

/** "Playing", but the program's clock hasn't moved for this long: something else is on. */
const STILL_MS = 1000;
/** How many loads, and steps per load, the state sequence keeps. */
const LOADS = 12;
const STEPS = 12;

interface Load {
  id: string;
  at: number;
  /** When the program itself came on. */
  on: number | null;
  other: boolean;
  seq: string[];
}

const name = (s: string) => (/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(s) ? s : '?');

export class YouTubeLog {
  private loads: Load[] = [];
  private state: number | null = null;
  private vid = '';
  private time: number | null = null;
  private movedAt = 0;
  private lastAt: number | null = null;
  private other = false;
  private still = false;
  private sOther = 0;
  private sStill = 0;
  private fails = 0;
  private ends = 0;
  private readonly modes = new Set<string>();
  private readonly unknown = new Set<string>();

  /** A player starts loading `id`. */
  load(id: string, now: number): void {
    this.loads.push({ id, at: now, on: null, other: false, seq: [] });
    this.state = null;
    this.vid = '';
    this.time = null;
    this.lastAt = null;
    this.other = false;
    this.still = false;
  }

  failed(): void {
    this.fails++;
  }

  ended(): void {
    this.ends++;
  }

  /** One message from the player. */
  message(event: string, info: Record<string, unknown>, now: number): void {
    const load = this.loads.at(-1);
    if (!load) return;
    if (!EVENTS.has(event)) this.unknown.add(name(event));
    for (const key of Object.keys(info)) if (!FIELDS.has(key)) this.unknown.add(name(key));
    const mode = info.playerMode;
    if (mode && typeof mode === 'object') for (const key of Object.keys(mode)) this.modes.add(name(key));

    // the time since the last message, as things stood then
    if (this.lastAt !== null && this.state === 1) {
      const dt = (now - this.lastAt) / 1000;
      if (this.other) this.sOther += dt;
      else if (this.still) this.sStill += dt;
    }
    this.lastAt = now;

    const state = typeof info.playerState === 'number' ? info.playerState : event === 'onStateChange' && typeof info.value === 'number' ? info.value : null;
    if (state !== null && state !== this.state) {
      this.state = state;
      // a fresh start: the program's clock gets a moment to move
      if (state === 1) this.movedAt = now;
    }
    const data = info.videoData as { video_id?: unknown } | undefined;
    if (data && typeof data.video_id === 'string' && data.video_id) this.vid = data.video_id;
    this.other = this.vid !== '' && this.vid !== load.id;
    if (this.other) load.other = true;
    let moved = false;
    if (typeof info.currentTime === 'number') {
      moved = this.time !== null && info.currentTime > this.time + 0.05;
      if (moved) this.movedAt = now;
      this.time = info.currentTime;
    }
    this.still = this.state === 1 && !this.other && now - this.movedAt > STILL_MS;
    if (load.on === null && this.state === 1 && !this.other && moved) load.on = now;

    const step = this.state === null ? '' : `${this.state}${this.other ? 'o' : ''}${this.still ? 's' : ''}`;
    if (step && load.seq.at(-1) !== step && load.seq.length < STEPS) load.seq.push(step);
  }

  fields(): Record<string, Value> {
    if (!this.loads.length) return { n_yt: 0 };
    const on = this.loads.filter((l) => l.on !== null);
    return {
      n_yt: this.loads.length,
      n_yt_on: on.length,
      s_yt_wait: Math.round(on.reduce((s, l) => s + (l.on! - l.at), 0) / 100) / 10,
      n_yt_other: this.loads.filter((l) => l.other).length,
      s_yt_other: Math.round(this.sOther),
      s_yt_still: Math.round(this.sStill),
      n_yt_fail: this.fails,
      n_yt_end: this.ends,
      yt_seq: this.loads
        .slice(0, LOADS)
        .map((l) => l.seq.join('>') || '–')
        .join(' '),
      yt_mode: [...this.modes].slice(0, 20).join(' '),
      yt_new: [...this.unknown].slice(0, 20).join(' '),
    };
  }
}
