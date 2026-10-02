// What a visitor does in the room, kept as seconds and counts: time in each
// view, on each station and channel, on the phone, with the tape; the calls
// dialed, the request, the taping. Sampled on every frame the room is drawn,
// so a hidden tab isn't counted.

import type { Value } from './record';

/** What the room is doing at one moment, as far as the test cares. */
export interface Snapshot {
  /** 'room', or the close-up that's open. */
  view: string;
  /** The station you can hear, 'static', or null (radio off or silent). */
  radio: string | null;
  /** The channel while the TV is on. */
  tv: number | null;
  /** A real 1995 clip on the screen. */
  clip: boolean;
  /** The phone is off the hook. */
  phone: boolean;
  tape: 'play' | 'rec' | null;
}

const round = (s: number) => Math.round(s);

export class ActivityLog {
  private total = 0;
  private seconds: Record<string, number> = {};
  private counts: Record<string, number> = {};
  private channels = new Map<number, number>();
  private opens = new Map<string, number>();
  private calls: string[] = [];
  private request: { song: string; dedication: string } | null = null;
  reached6pm = false;

  sample(s: Snapshot, dt: number): void {
    this.total += dt;
    this.add(`view_${s.view}`, dt);
    if (s.radio) this.add(`radio_${s.radio}`, dt);
    if (s.tv !== null) {
      this.add('tv', dt);
      this.channels.set(s.tv, (this.channels.get(s.tv) ?? 0) + dt);
    }
    if (s.clip) this.add('tv_clip', dt);
    if (s.phone) this.add('phone', dt);
    if (s.tape) this.add(`tape_${s.tape}`, dt);
  }

  count(what: string): void {
    this.counts[what] = (this.counts[what] ?? 0) + 1;
  }

  opened(view: string): void {
    this.opens.set(view, (this.opens.get(view) ?? 0) + 1);
  }

  dialed(number: string): void {
    if (this.calls.length < 40) this.calls.push(number);
  }

  requested(song: string, dedication: string | null): void {
    this.request = { song, dedication: dedication ?? '' };
    this.count('request');
  }

  /** Seconds spent in the room so far. */
  get time(): number {
    return this.total;
  }

  fields(): Record<string, Value> {
    const out: Record<string, Value> = { s_total: round(this.total) };
    for (const [key, s] of Object.entries(this.seconds)) out[`s_${key}`] = round(s);
    for (const [key, n] of Object.entries(this.counts)) out[`n_${key}`] = n;
    out.tv_channels = [...this.channels].sort((a, b) => b[1] - a[1]).map(([ch, s]) => `${ch}:${round(s)}`).join(' ');
    out.opens = [...this.opens].map(([view, n]) => `${view}:${n}`).join(' ');
    out.calls = this.calls.join(' ');
    out.n_calls = this.calls.length;
    out.reached_6pm = this.reached6pm;
    if (this.request) {
      out.request_song = this.request.song;
      out.request_dedication = this.request.dedication;
    }
    return out;
  }

  private add(key: string, dt: number): void {
    this.seconds[key] = (this.seconds[key] ?? 0) + dt;
  }
}
