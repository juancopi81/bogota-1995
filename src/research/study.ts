// The test (docs/test-plan.md). It runs when the site is built with a sheet
// to send to (VITE_RESEARCH_URL), or locally with ?research, where answers go
// to the console. Opening the door, with the line under it in view, is the
// visitor's yes: from then on it keeps an anonymous log of the visit, and asks
// on the way out, or when the afternoon ends after the anthem.

import { bus } from '../world/bus';
import { at, clock } from '../world/clock';
import { onTick } from '../world/loop';
import { ActivityLog, type Snapshot } from './log';
import { VisitRecord, arrival, device, exitFields, exitMoodFields, visitor, type Value } from './record';
import { details, exit, needsComputer, phoneNote, thanks } from './screens';
import type { DoorChoice } from '../scene/entrance';
import { EXAMPLES, fetchMemories, type SharedMemory } from './memories';

const RESEARCH_URL = import.meta.env.VITE_RESEARCH_URL ?? '';
/** How often the record goes out while the visitor is in the room (seconds). */
const SEND_EVERY = 60;
/** After this long in the room, the way out glows once, so nobody has to hunt for it. */
const NUDGE_AFTER = 300;
/** The afternoon ends after the anthem. */
const ENDS_AT = at(18, 4);

const iso = () => new Date().toISOString();

export class Study {
  readonly on: boolean;
  readonly record = new VisitRecord(RESEARCH_URL);
  readonly log = new ActivityLog();
  private participating = false;
  private where: 'outside' | 'room' | 'asking' | 'done' = 'outside';
  private exitsShown = 0;
  private askedAtSix = false;
  private nudged = false;
  private sinceSend = 0;
  private memories: Promise<SharedMemory[]> | null = null;
  private shared = false;
  private more: () => Record<string, Value> = () => ({});

  constructor(
    private readonly params: URLSearchParams,
    private readonly host: HTMLElement,
    private readonly duck: (on: boolean) => void,
  ) {
    this.on = !!RESEARCH_URL || params.has('research');
    if (!this.on) return;
    document.body.classList.add('study');
    // it goes out from gate(), once it's known whether a phone got the note instead
    this.record.set(arrival(params, (import.meta.env.VITE_BUILD || 'dev').slice(0, 7)));
    // whatever hasn't gone out goes when the tab is hidden or closed
    addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && this.flush());
    addEventListener('pagehide', () => this.flush());
  }

  /** On a phone, the note asking for a computer instead of the room. True if the room shouldn't start. */
  gate(onAnyway: () => void): boolean {
    const gated = !this.params.has('anyway') && needsComputer();
    // one send, not two: two in a row can arrive out of order, and the later "load" would hide the gate
    if (this.on) {
      if (gated) this.record.set({ stage: 'gate' });
      this.record.send();
    }
    if (gated) phoneNote(onAnyway);
    return gated;
  }

  /** What's kept, from "Más detalles" under the door: how the visitor goes in from there, or back to the door. */
  details(): Promise<DoorChoice> {
    return details();
  }

  /**
   * The door opened. With the line under it in view, that's the visitor's yes,
   * unless they chose to go in without being kept: then only that is counted.
   */
  walkIn(logged: boolean): void {
    if (!this.on) return;
    if (!logged) {
      this.record.set({ stage: 'declined' });
      this.record.send();
      return;
    }
    this.participating = true;
    // only now, with their yes: the browser's id (for return visits), the screen, and how long the door took
    this.record.set({ stage: 'consent', t_consent: iso(), s_entrance: Math.round(performance.now() / 100) / 10, ...visitor(), ...device() });
    this.record.send();
  }

  /** The visitor is in the room: keep the log (and `more`, counts the room keeps itself), and show the way out. */
  inRoom(probe: () => Snapshot, more: () => Record<string, Value> = () => ({})): void {
    if (!this.on || !this.participating) return;
    this.more = more;
    this.where = 'room';
    this.record.set({ stage: 'room' });
    this.watch();

    const leave = document.createElement('button');
    leave.id = 'leave';
    leave.textContent = 'Terminar la visita';
    leave.addEventListener('click', () => void (this.where === 'done' ? this.thankAgain() : this.askExit('button')));
    this.host.appendChild(leave);

    // frames stop while the tab is hidden, so that time isn't counted
    onTick((dt) => {
      if (this.where !== 'room' && this.where !== 'done') return;
      this.log.sample(probe(), dt);
      if (clock.now() >= at(18, 0)) this.log.reached6pm = true;
      if (!this.nudged && this.log.time >= NUDGE_AFTER) {
        this.nudged = true;
        leave.classList.add('nudge');
      }
      this.sinceSend += dt;
      if (this.sinceSend >= SEND_EVERY) this.flush();
      if (this.where === 'room' && !this.askedAtSix && clock.now() >= ENDS_AT) {
        this.askedAtSix = true;
        void this.askExit('6pm');
      }
    });
  }

  /** Sends the record with the log as it stands. */
  flush(): void {
    if (!this.on) return;
    this.sinceSend = 0;
    if (this.participating && this.where !== 'outside') {
      this.record.set({ ...this.log.fields(), ...this.more(), min_room: Math.round((this.log.time / 60) * 10) / 10, exit_shown: this.exitsShown });
    }
    this.record.send();
  }

  private async askExit(reason: 'button' | '6pm'): Promise<void> {
    if (this.where === 'asking') return;
    const back = this.where;
    this.where = 'asking';
    this.exitsShown++;
    this.duck(true);
    this.flush();
    // what other visitors left, ready by the time they've answered
    this.memories ??= RESEARCH_URL ? fetchMemories(RESEARCH_URL) : Promise.resolve(import.meta.env.DEV ? EXAMPLES : []);
    const answers = await exit(reason, (mood) => {
      // the measure is in: keep it even if they don't finish the second step
      this.record.set({ ...exitMoodFields(mood, null), stage: 'exit' });
      this.flush();
    });
    if (answers) {
      // the log goes on if they stay, so keep how long they'd been inside when they answered
      this.record.set({ ...exitFields(answers, null), stage: 'done', exit_reason: reason, t_exit: iso(), min_at_exit: Math.round((this.log.time / 60) * 10) / 10 });
      this.flush();
      this.shared = !!answers.memory.trim() && answers.shareMemory;
      await thanks(this.memories, this.shared);
      this.where = 'done';
    } else {
      this.where = back;
    }
    this.duck(false);
  }

  private async thankAgain(): Promise<void> {
    this.where = 'asking';
    this.duck(true);
    this.flush();
    await thanks(this.memories ?? Promise.resolve([]), this.shared);
    this.where = 'done';
    this.duck(false);
  }

  private watch(): void {
    bus.on('closeup:open', ({ id }) => this.log.opened(id));
    bus.on('radio:request', ({ songId, dedication }) => this.log.requested(songId, dedication));
    bus.on('radio:request-aired', () => this.log.count('request_aired'));
    bus.on('tape:recording', ({ on }) => on && this.log.count('rec'));
    bus.on('phone:dialed', ({ number }) => this.log.dialed(number));
    bus.on('window:open', ({ open }) => open && this.log.count('window_open'));
    bus.on('light:bulb', () => this.log.count('light'));
    bus.on('tv:power', ({ on }) => on && this.log.count('tv_on'));
    bus.on('story:andres', ({ step }) => this.log.count(`andres_${step.replace('-', '_')}`));
  }
}
