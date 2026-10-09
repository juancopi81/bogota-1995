// One visit, as the test records it: where the visitor got to, their answers
// and what they did in the room, kept as flat fields (one column each in the
// sheet). Every send carries the whole record, so a lost one costs nothing.

import { kv } from '../world/store';
import { MOOD, TRAIT, nostalgiaScore } from './questions';

export type Value = string | number | boolean;

export interface Payload {
  v: 1;
  visit: string;
  fields: Record<string, Value>;
}

export interface DoorAnswers {
  lived: string;
  age: string;
  mood: Record<string, number>;
}

export interface ExitAnswers {
  mood: Record<string, number>;
  memory: string;
  /** They let other visitors read it (once it's been read and approved). */
  shareMemory: boolean;
  triggers: string[];
  returnIntent: string | null;
  trait: Record<string, number>;
  feedback: string;
}

const LIMITS: Record<string, number> = { memory: 2000, feedback: 1000 };

export function uid(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sends a visit to the sheet. Fire and forget: the next send carries everything anyway. */
export function post(url: string, payload: Payload): void {
  const body = JSON.stringify(payload);
  try {
    void fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: body.length < 60_000,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    }).catch(() => undefined);
  } catch {
    /* offline or blocked */
  }
}

export class VisitRecord {
  readonly id = uid();
  readonly fields: Record<string, Value> = {};
  /** The last payload sent (or, without a sheet, logged). */
  last: Payload | null = null;
  private sentKey = '';

  constructor(private readonly url: string) {}

  set(values: Record<string, Value | null | undefined>): void {
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === undefined) continue;
      this.fields[key] = typeof value === 'string' && LIMITS[key] ? value.slice(0, LIMITS[key]) : value;
    }
  }

  /** Sends the record if anything changed since the last send. */
  send(): void {
    const key = JSON.stringify(this.fields);
    if (key === this.sentKey) return;
    this.sentKey = key;
    this.last = { v: 1, visit: this.id, fields: { ...this.fields, updated: new Date().toISOString() } };
    if (this.url) post(this.url, this.last);
    else console.info('[research]', this.last);
  }
}

/** A random id for this browser, to count return visits. Kept only once the visitor agrees. */
export function visitor(): { visitor: string; visit_n: number } {
  const id = kv.get<string | null>('research.visitor', null) ?? uid();
  const n = kv.get('research.visits', 0) + 1;
  kv.set('research.visitor', id);
  kv.set('research.visits', n);
  return { visitor: id, visit_n: n };
}

export function device(): Record<string, Value> {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    /* no time zone */
  }
  return { dev_w: innerWidth, dev_h: innerHeight, dev_touch: navigator.maxTouchPoints > 0, dev_lang: navigator.language, dev_tz: tz };
}

/**
 * All that's kept before the visitor says yes (and all that's kept if they
 * enter without taking part): when, which version of the room, and which ad
 * or link brought them. Nothing about them or their computer.
 */
export function arrival(params: URLSearchParams, build: string): Record<string, Value> {
  return { stage: 'load', t_load: new Date().toISOString(), build, ...referral(params) };
}

/** Which ad (or link) brought the visitor, from the utm_ parameters. */
export function referral(params: URLSearchParams): Record<string, Value> {
  return { ref_source: params.get('utm_source') ?? '', ref_campaign: params.get('utm_campaign') ?? '', ref_content: params.get('utm_content') ?? '' };
}

export function doorFields(a: DoorAnswers): Record<string, Value | null> {
  const out: Record<string, Value | null> = { lived_1995: a.lived, age_1995: a.age };
  for (const item of MOOD) out[`pre_${item.id}`] = a.mood[item.id] ?? null;
  out.pre_nostalgia = nostalgiaScore(a.mood);
  return out;
}

/** The six phrases at the exit, and how nostalgia changed since the door. */
export function exitMoodFields(mood: Record<string, number>, preNostalgia: number | null): Record<string, Value | null> {
  const out: Record<string, Value | null> = {};
  for (const item of MOOD) out[`post_${item.id}`] = mood[item.id] ?? null;
  const post = nostalgiaScore(mood);
  out.post_nostalgia = post;
  out.change = post !== null && preNostalgia !== null ? Math.round((post - preNostalgia) * 100) / 100 : null;
  return out;
}

export function exitFields(a: ExitAnswers, preNostalgia: number | null): Record<string, Value | null> {
  const out = exitMoodFields(a.mood, preNostalgia);
  out.memory = a.memory.trim();
  out.memory_share = out.memory ? a.shareMemory : null;
  out.triggers = a.triggers.join(' ');
  out.return_intent = a.returnIntent;
  for (const item of TRAIT) out[`trait_${item.id}`] = a.trait[item.id] ?? null;
  out.feedback = a.feedback.trim();
  return out;
}
