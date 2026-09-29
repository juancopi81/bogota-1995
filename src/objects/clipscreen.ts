// Real 1995 clips on the TV, through an embedded YouTube player.
//
// The player sits behind the tube's canvas: while a clip loads, ends early or
// fails, the canvas covers it with the channel's card; once it plays, the
// canvas turns transparent except for snow and the scanlines.
//
// We talk to the player with YouTube's postMessage protocol (the same one its
// iframe API uses) without loading any script from YouTube: it tells us when
// the video really plays, and takes the TV's volume knob.
//
// Embeds only work when the room is served over http(s). From a file on disk
// YouTube refuses to play (no referrer), and a claude.ai artifact cannot frame
// other sites at all, so there the channels keep their invented programs.

import { CLIPS, type Clip } from '../content/clips';
import { SCREEN } from '../art/tv';
import { bus } from '../world/bus';

const ORIGIN = 'https://www.youtube-nocookie.com';

/** Built for a claude.ai artifact (`npm run build:artifact`): no embeds allowed. */
const ARTIFACT = import.meta.env.MODE === 'artifact';

/** Clips YouTube refused (removed, private, embedding disabled). */
const refused = new Set<string>();
/** Nothing plays at all (offline, blocked): forget clips for this visit. */
let dead = false;

/** Can this copy of the room show real clips right now? */
export function clipsPlayable(): boolean {
  if (ARTIFACT || dead || CLIPS.length === 0) return false;
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return false;
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** The approved clips (Canal A's, or the ad breaks) that still work. */
export function workingClips(list: Clip[] = CLIPS): Clip[] {
  return list.filter((c) => !refused.has(c.id));
}

type State = 'loading' | 'playing' | 'stopped' | 'failed';

interface PlayerInfo {
  playerState?: number;
  currentTime?: number;
  duration?: number;
}

export class ClipScreen {
  private frame: HTMLIFrameElement | null = null;
  private current = '';
  private clipId = '';
  private state: State = 'loading';
  private heard = false;
  private loadedAt = 0;
  private listenTimer = 0;
  private sentVolume = -1;
  private nudged = false;
  private counted = false;
  /** Called when a clip runs out before its slot does, so the channel can move on. */
  onEnded: (() => void) | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly before: HTMLElement,
  ) {
    window.addEventListener('message', (e) => this.onMessage(e));
  }

  /** Is the video itself on screen (so the canvas should let it through)? */
  get showing(): boolean {
    return this.frame !== null && this.state === 'playing';
  }

  show(clip: Clip, offset: number): void {
    const key = `${clip.id}@${clip.start}`;
    if (this.frame && this.current === key) {
      this.watch();
      return;
    }
    this.hide();
    const start = Math.floor(clip.start + Math.max(0, offset));
    const params = new URLSearchParams({
      start: String(start),
      end: String(Math.ceil(clip.start + clip.dur)),
      autoplay: '1',
      controls: '0',
      rel: '0',
      fs: '0',
      playsinline: '1',
      iv_load_policy: '3',
      disablekb: '1',
      enablejsapi: '1',
      origin: location.origin,
    });
    const f = document.createElement('iframe');
    f.src = `${ORIGIN}/embed/${clip.id}?${params}`;
    f.allow = 'autoplay; encrypted-media';
    // YouTube refuses to play without knowing which page embeds it
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = 'TV';
    f.tabIndex = -1;
    f.className = 'tv-clip';
    Object.assign(f.style, { left: `${SCREEN.x}px`, top: `${SCREEN.y}px`, width: `${SCREEN.w}px`, height: `${SCREEN.h}px`, visibility: 'hidden' });
    f.addEventListener('load', () => {
      this.loadedAt = performance.now();
      this.listen();
    });
    this.parent.insertBefore(f, this.before);
    this.frame = f;
    this.current = key;
    this.clipId = clip.id;
    this.state = 'loading';
    this.heard = false;
    this.loadedAt = 0;
    this.sentVolume = -1;
    this.nudged = false;
    this.counted = false;
  }

  hide(): void {
    if (!this.frame) return;
    clearInterval(this.listenTimer);
    this.frame.remove();
    this.frame = null;
    this.current = '';
  }

  /** Follow the TV's volume knob (0–1). */
  setVolume(v: number): void {
    if (!this.frame || !this.heard) return;
    const vol = Math.round(Math.max(0, Math.min(1, v)) * 100);
    const silent = this.sentVolume <= 0;
    if (vol === 0 ? silent && this.sentVolume === 0 : Math.abs(vol - this.sentVolume) < 2) return;
    this.sentVolume = vol;
    if (vol === 0) return this.command('mute');
    this.command('setVolume', [vol]);
    if (silent) this.command('unMute');
  }

  /** Keep an eye on a clip that's supposed to be playing. */
  private watch(): void {
    if (!this.frame || this.state === 'failed' || this.loadedAt === 0) return;
    const since = performance.now() - this.loadedAt;
    // it answered but won't start (autoplay blocked?): ask once more
    if (this.heard && this.state === 'loading' && since > 3000 && !this.nudged) {
      this.nudged = true;
      this.command('playVideo');
    }
    // it never answered: whatever is in there (an error page?) stays behind the card
    if (!this.heard && since > 8000 && !this.counted) {
      this.counted = true;
      this.gaveUp();
    }
  }

  private reveal(): void {
    this.state = 'playing';
    // back to inheriting: a closed close-up still hides it
    if (this.frame) this.frame.style.visibility = '';
  }

  private listen(): void {
    clearInterval(this.listenTimer);
    let tries = 0;
    const hello = () => {
      if (!this.frame || this.heard || ++tries > 40) return clearInterval(this.listenTimer);
      this.post({ event: 'listening', id: 1, channel: 'widget' });
    };
    hello();
    this.listenTimer = window.setInterval(hello, 250);
  }

  private post(message: object): void {
    try {
      this.frame?.contentWindow?.postMessage(JSON.stringify(message), ORIGIN);
    } catch {
      /* the frame went away */
    }
  }

  private command(func: string, args: unknown[] = []): void {
    this.post({ event: 'command', func, args, id: 1, channel: 'widget' });
  }

  private onMessage(e: MessageEvent): void {
    if (e.origin !== ORIGIN || !this.frame || e.source !== this.frame.contentWindow) return;
    let data: { event?: string; info?: unknown };
    try {
      data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }
    if (!data || typeof data !== 'object') return;
    this.heard = true;
    if (data.event === 'onError') return this.fail();
    let playerState: number | undefined;
    if (data.event === 'onStateChange' && typeof data.info === 'number') playerState = data.info;
    if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info && typeof data.info === 'object') {
      playerState = (data.info as PlayerInfo).playerState;
    }
    if (playerState === 1) this.reveal();
    else if (playerState === 0) this.stop();
  }

  /** The clip ran out before its slot did: the channel moves on (its card covers the gap). */
  private stop(): void {
    if (this.state === 'stopped') return;
    this.state = 'stopped';
    if (this.frame) this.frame.style.visibility = 'hidden';
    this.onEnded?.();
  }

  private fail(): void {
    this.state = 'failed';
    if (this.frame) this.frame.style.visibility = 'hidden';
    refused.add(this.clipId);
    bus.emit('tv:clips', { playable: clipsPlayable() && workingClips().length > 0 });
  }

  /**
   * The player loaded and never said a word: YouTube can't be reached from
   * here (offline, blocked), since even a refused video answers with an error.
   */
  private gaveUp(): void {
    dead = true;
    bus.emit('tv:clips', { playable: false });
  }
}
