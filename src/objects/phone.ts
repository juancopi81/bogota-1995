// The telephone: a rotary dial, a hook, a line, and a house on the other end.

import { PhoneLine } from './line';
import { HangUp, type CallApi, type CallScript, type Route } from './calls';
import { phoneSvg, DIAL, HANDSET, LIBRETA_INPUTS } from '../art/phone';
import {
  route,
  wrongNumberIncoming,
  andresCallsBack,
  EXTENSION,
  UNASSIGNED,
  type PhoneWorld,
} from '../content/phonebook';
import type { Line } from '../content/lines';
import type { AudioEngine } from '../audio/engine';
import { voices, lineDuration } from '../audio/voices';
import { sfx, play } from '../audio/sfx';
import { subtitles } from '../ui/subtitles';
import { dialogue } from '../ui/dialogue';
import { svgPoint } from '../ui/svg';
import { closeups } from '../scene/closeups';
import { clock } from '../world/clock';
import { flags, setName, SCHEDULE } from '../world/flags';
import { kv } from '../world/store';
import { bus } from '../world/bus';
import { MAMA, mamaSays } from './house';
import { setAttr, toggleClass } from '../ui/dom';

type LineState = 'idle' | 'dialtone' | 'dialing' | 'waiting' | 'ringback' | 'busy' | 'recording' | 'connected' | 'extension' | 'dead';

interface Incoming {
  script: CallScript;
  rings: number;
  nextRingAt: number;
  /** Your mother picks it up in the kitchen after this many rings (then waits for you). */
  momAnswersAfter: number | null;
  momAnswered: boolean;
  giveUpAt: number;
  nagged: boolean;
}

const RING_PERIOD = 5;
const RETURN_SPEED = 300; // degrees per second: ten pulses a second

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export class Phone {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  readonly line: PhoneLine;
  private readonly earGain: GainNode;
  private readonly leakGain: GainNode;
  hook: 'on' | 'off' = 'on';
  state: LineState = 'idle';
  private digits = '';
  private lastDigitAt = 0;
  private wheel = 0;
  private drag: { digit: number; last: number } | null = null;
  private returning: { pulses: number; emitted: number } | null = null;
  private autoDial: number | null = null;
  private call: { cancelled: boolean } | null = null;
  private incoming: Incoming | null = null;
  private fired = { wrong: false, andres: false, onces: false };
  private roomPhone: SVGGElement | null = null;
  private stateSince = 0;
  private cordFor: 'on' | 'off' | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly world: PhoneWorld,
  ) {
    const ctx = engine.ctx;
    this.line = new PhoneLine(engine);
    this.earGain = ctx.createGain();
    this.earGain.gain.value = 0;
    this.leakGain = ctx.createGain();
    this.leakGain.gain.value = 0;
    this.line.out.connect(this.earGain).connect(engine.channel('ear').input);
    this.line.out.connect(this.leakGain).connect(engine.channel('phone').input);

    this.el = document.createElement('div');
    this.el.className = 'closeup';
    this.el.id = 'cu-phone';
    this.el.innerHTML = phoneSvg();
    this.svg = this.el.querySelector('svg')!;
    this.addInputs();
    this.wire();
    this.draw(0);
  }

  bindRoom(roomPhoneSvg: SVGSVGElement): void {
    this.roomPhone = roomPhoneSvg.querySelector<SVGGElement>('[data-hot="phone"]');
  }

  // ---------- the libreta: your name, and a place to jot down numbers ----------

  private addInputs(): void {
    const make = (tag: 'input' | 'textarea', box: { x: number; y: number; w: number; h: number }, value: string, save: (v: string) => void) => {
      const el = document.createElement(tag);
      el.className = 'libreta-input';
      Object.assign(el.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      el.value = value;
      el.spellcheck = false;
      el.addEventListener('input', () => save(el.value));
      el.addEventListener('keydown', (e) => e.stopPropagation());
      this.el.appendChild(el);
      return el;
    };
    make('input', LIBRETA_INPUTS.name, flags.name, (v) => setName(v)).placeholder = 'su nombre';
    make('textarea', LIBRETA_INPUTS.notes, kv.get('libreta.notes', ''), (v) => kv.set('libreta.notes', v)).placeholder = '...';
  }

  // ---------- wiring ----------

  private wire(): void {
    const svg = this.svg;
    const handset = svg.querySelector<SVGGElement>('#ph-handset')!;
    handset.addEventListener('pointerdown', () => (this.hook === 'on' ? this.lift() : this.hangUp()));
    svg.querySelector<SVGGElement>('#ph-hooks')!.addEventListener('pointerdown', () => {
      if (this.hook === 'off') this.hangUp();
    });

    // the rotary dial: put a finger in a hole and drag it round to the stop
    for (const hole of svg.querySelectorAll<SVGCircleElement>('.hole')) {
      hole.addEventListener('pointerdown', (e) => {
        if (this.returning || this.drag || this.autoDial !== null) return;
        hole.setPointerCapture(e.pointerId);
        const p = svgPoint(svg, e.clientX, e.clientY);
        this.drag = { digit: Number(hole.dataset.digit), last: Math.atan2(p.y - DIAL.cy, p.x - DIAL.cx) };
      });
      hole.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const p = svgPoint(svg, e.clientX, e.clientY);
        const a = Math.atan2(p.y - DIAL.cy, p.x - DIAL.cx);
        let d = a - this.drag.last;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        this.drag.last = a;
        this.wheel = Math.max(0, Math.min(this.maxTurn(this.drag.digit), this.wheel + (d * 180) / Math.PI));
      });
      const release = () => {
        if (!this.drag) return;
        this.drag = null;
        this.release();
      };
      hole.addEventListener('pointerup', release);
      hole.addEventListener('pointercancel', release);
    }

    // typing digits dials them (the wheel turns by itself)
    window.addEventListener('keydown', (e) => {
      if (!closeups.isOpen('phone') || dialogue.open) return;
      if (/^[0-9]$/.test(e.key) && !this.returning && !this.drag && this.autoDial === null) this.autoDial = Number(e.key);
      if (e.key === ' ') {
        e.preventDefault();
        if (this.hook === 'on') this.lift();
        else this.hangUp();
      }
    });

    bus.on('closeup:open', ({ id }) => id === 'phone' && this.updateFocus());
    bus.on('closeup:close', ({ id }) => id === 'phone' && this.updateFocus());
  }

  private maxTurn(digit: number): number {
    return ((digit === 0 ? 10 : digit) + 1) * 30 + 4;
  }

  private release(): void {
    // pulses are counted on the way back; letting go early dials a smaller number
    const pulses = Math.max(0, Math.min(10, Math.floor((this.wheel + 8) / 30) - 1));
    this.returning = { pulses, emitted: 0 };
  }

  // ---------- the hook ----------

  lift(): void {
    if (this.hook === 'off') return;
    this.hook = 'off';
    play(this.engine.ctx, sfx.hook(this.engine.ctx), this.engine.channel('phone').input, { gain: 0.6 });
    this.line.setOpen(true);
    this.digits = '';
    const t = clock.now();
    if (this.incoming) {
      const inc = this.incoming;
      this.incoming = null;
      if (inc.momAnswered) this.line.click();
      this.setState('connected');
      void this.run(inc.script);
    } else if (t >= SCHEDULE.extension[0] && t < SCHEDULE.extension[1]) {
      this.setState('extension');
      void this.run(extensionScript);
    } else {
      this.setState('dialtone');
      this.line.setTone('dial');
    }
    this.updateFocus();
  }

  hangUp(): void {
    if (this.hook === 'on') return;
    this.hook = 'on';
    play(this.engine.ctx, sfx.hook(this.engine.ctx), this.engine.channel('phone').input, { gain: 0.7 });
    this.cancelCall();
    this.line.setOpen(false);
    this.digits = '';
    this.setState('idle');
    this.updateFocus();
  }

  private setState(state: LineState): void {
    this.state = state;
    this.stateSince = clock.now();
    bus.emit('phone:state', { state });
  }

  private updateFocus(): void {
    const open = closeups.isOpen('phone');
    const now = this.engine.ctx.currentTime;
    const atEar = open && this.hook === 'off';
    this.earGain.gain.setTargetAtTime(atEar ? 1 : 0, now, 0.05);
    this.leakGain.gain.setTargetAtTime(!open && this.hook === 'off' ? 0.08 : 0, now, 0.05);
    if (open) closeups.refocus(atEar ? 'ear' : 'phone');
  }

  // ---------- the exchange ----------

  private onDigit(digit: number): void {
    if (this.hook !== 'off' || (this.state !== 'dialtone' && this.state !== 'dialing')) return;
    if (this.state === 'dialtone') {
      this.line.setTone('none');
      this.setState('dialing');
    }
    this.digits += String(digit);
    this.lastDigitAt = clock.now();
    const complete = (this.digits[0] === '1' && this.digits.length === 3) || this.digits.length === 7;
    if (complete) {
      const number = this.digits;
      this.setState('waiting');
      this.line.relays(3 + Math.floor(Math.random() * 3));
      const token = this.call ?? { cancelled: false };
      this.call = token;
      void sleep(1.4 + Math.random() * 1.4).then(() => {
        if (token.cancelled || this.hook === 'on') return;
        this.call = null;
        void this.connect(route(number, clock.now(), this.world));
      });
    }
  }

  private async connect(r: Route): Promise<void> {
    switch (r.kind) {
      case 'busy':
        this.setState('busy');
        this.line.setTone('busy');
        return;
      case 'no-answer':
        this.setState('ringback');
        this.line.setTone('ringback');
        return;
      case 'unassigned': {
        // three rising tones, then the recording
        this.setState('recording');
        this.line.setTone('sit');
        const token = { cancelled: false };
        this.call = token;
        await sleep(2.1);
        if (token.cancelled || this.hook === 'on') return;
        this.call = null;
        this.line.setTone('none');
        await this.run(unassignedScript);
        return;
      }
      case 'service':
        this.setState('connected');
        await this.run(r.script);
        return;
      case 'answer': {
        this.setState('ringback');
        this.line.setTone('ringback');
        const token = { cancelled: false };
        this.call = token;
        await sleep(r.rings * 5.5 - 3.8);
        if (token.cancelled || this.hook === 'on') return;
        this.call = null;
        this.line.setTone('none');
        this.line.click();
        this.setState('connected');
        await this.run(r.script);
        return;
      }
    }
  }

  // ---------- running a call ----------

  private cancelCall(): void {
    if (this.call) this.call.cancelled = true;
    this.call = null;
    dialogue.cancel(new HangUp());
    this.line.stopVoices();
    subtitles.set('phone', null);
  }

  private async run(script: CallScript): Promise<void> {
    const token = { cancelled: false };
    this.call = token;
    const check = () => {
      if (token.cancelled) throw new HangUp();
    };
    const api: CallApi = {
      say: async (line: Line) => {
        check();
        const buffer = voices.get(line.id);
        if (buffer) this.line.voice(buffer);
        subtitles.set('phone', { label: 'Teléfono', line });
        await sleep(lineDuration(line, 13) + 0.15);
        check();
        subtitles.set('phone', null);
        await sleep(0.25);
        check();
      },
      pause: async (seconds) => {
        check();
        await sleep(seconds);
        check();
      },
      choose: async (options) => {
        check();
        const value = await dialogue.ask(options);
        check();
        await sleep(0.5);
        check();
        return value;
      },
      hangUp: async () => {
        check();
        this.line.click();
        this.line.setAmbience('none');
        await sleep(0.4);
        check();
        this.setState('busy');
        this.line.setTone('busy');
        throw new HangUp();
      },
      ambience: (kind) => this.line.setAmbience(kind),
      click: () => this.line.click(),
      now: () => clock.now(),
    };
    try {
      await script(api);
    } catch (error) {
      if (!(error instanceof HangUp) && !(error instanceof Error && error.message === 'cancelled')) console.error(error);
    } finally {
      if (this.call === token) this.call = null;
      if (token.cancelled) subtitles.set('phone', null);
    }
  }

  // ---------- incoming calls ----------

  private ring(script: CallScript, momAnswersAfter: number | null): void {
    const t = clock.now();
    this.incoming = { script, rings: 0, nextRingAt: t, momAnswersAfter, momAnswered: false, giveUpAt: t + 70, nagged: false };
  }

  private tickIncoming(t: number): void {
    // what's scheduled to happen this afternoon
    if (!this.fired.wrong && t >= SCHEDULE.wrongNumberRings) {
      this.fired.wrong = true;
      if (this.hook === 'on' && !this.incoming) this.ring(wrongNumberIncoming, null);
    }
    if (!this.fired.andres && flags.andresMessageAt !== null && !flags.andresTalked) {
      const due = Math.max(SCHEDULE.andresHome + 80, flags.andresMessageAt + 110);
      const inExtension = t >= SCHEDULE.extension[0] - 20 && t < SCHEDULE.extension[1] + 10;
      if (t >= due && !inExtension && this.hook === 'on' && !this.incoming) {
        this.fired.andres = true;
        this.ring(andresCallsBack, 7);
      }
    }
    if (!this.fired.onces && t >= SCHEDULE.onces) {
      this.fired.onces = true;
      mamaSays(MAMA.onces);
    }

    const inc = this.incoming;
    if (!inc) return;
    if (!inc.momAnswered && t >= inc.nextRingAt) {
      inc.rings++;
      inc.nextRingAt = t + RING_PERIOD;
      play(this.engine.ctx, sfx.bell(this.engine.ctx), this.engine.channel('phone').input, { gain: 0.55 });
      if (inc.rings === 4 && !inc.nagged) {
        inc.nagged = true;
        setTimeout(() => this.incoming === inc && !inc.momAnswered && mamaSays(MAMA.contesten), 1600);
      }
      if (inc.momAnswersAfter !== null && inc.rings > inc.momAnswersAfter) {
        // she got to the kitchen extension first
        inc.momAnswered = true;
        inc.giveUpAt = t + 40;
        setTimeout(() => this.incoming === inc && mamaSays(MAMA.telefono), 1800);
      } else if (inc.momAnswersAfter === null && inc.rings >= 8) {
        this.incoming = null; // they gave up
      }
    }
    if (inc.momAnswered && t >= inc.giveUpAt) {
      this.incoming = null;
      mamaSays(MAMA.noContesta);
    }
  }

  // ---------- every frame ----------

  tick(dt: number, t: number): void {
    this.line.scheduleAhead();
    this.tickIncoming(t);

    // the wheel: typed digits turn it forward; released, it runs back and pulses
    if (this.autoDial !== null) {
      const target = this.maxTurn(this.autoDial) - 4;
      this.wheel = Math.min(target, this.wheel + 620 * dt);
      if (this.wheel >= target) {
        this.autoDial = null;
        this.release();
      }
    }
    if (this.returning) {
      const r = this.returning;
      this.wheel = Math.max(0, this.wheel - RETURN_SPEED * dt);
      // a pulse each time the wheel passes a 30° step on its way home
      const passed = Math.max(0, r.pulses - Math.floor((this.wheel + 8) / 30) + 1);
      while (r.emitted < Math.min(r.pulses, passed)) {
        r.emitted++;
        if (this.hook === 'off') this.line.pulse();
        play(this.engine.ctx, sfx.pulse(this.engine.ctx), this.engine.channel('phone').input, { gain: 0.08, rate: 1.4 });
      }
      if (this.wheel <= 0) {
        this.returning = null;
        if (r.pulses > 0) this.onDigit(r.pulses % 10);
      }
    }

    // a line left open too long gives up on you
    if (this.hook === 'off') {
      if (this.state === 'dialtone' && t - this.stateSince > 25) {
        this.setState('busy');
        this.line.setTone('busy');
      }
      if (this.state === 'dialing' && t - this.lastDigitAt > 15) {
        this.setState('busy');
        this.line.setTone('busy');
      }
    }
    this.draw(t);
  }

  private draw(t: number): void {
    const svg = this.svg;
    setAttr(svg.querySelector('#ph-wheel'), 'transform', `rotate(${this.wheel.toFixed(2)} ${DIAL.cx} ${DIAL.cy})`);
    const up = this.hook === 'off';
    const hx = up ? HANDSET.x + 110 : 530;
    const hy = up ? HANDSET.y - 40 : 262;
    const rot = up ? -14 : 0;
    const handset = svg.querySelector('#ph-handset')!;
    setAttr(handset, 'transform', `translate(${hx} ${hy}) rotate(${rot}) scale(${up ? 1.04 : 1})`);
    for (const p of svg.querySelectorAll('.plunger')) setAttr(p, 'y', up ? '262' : '276');

    // the coiled cord from the handset down to the side of the phone
    if (this.cordFor !== this.hook) {
      this.cordFor = this.hook;
      this.drawCord(hx, hy, rot);
    }
    toggleClass(this.el, 'choosing', dialogue.open);

    // the little phone in the room
    if (this.roomPhone) {
      toggleClass(this.roomPhone, 'ringing', !!this.incoming && !this.incoming.momAnswered && t % RING_PERIOD < 1.1);
      toggleClass(this.roomPhone, 'off-hook', this.hook === 'off');
    }
  }

  private drawCord(hx: number, hy: number, rot: number): void {
    const a = rotateAround(-262, 30, rot, hx, hy);
    const b = { x: 236, y: 690 };
    const loops = 26;
    let d = '';
    for (let i = 0; i <= 360; i++) {
      const u = i / 360;
      const x = a.x + (b.x - a.x) * u + Math.cos(u * loops * 2 * Math.PI) * 11;
      const y = a.y + (b.y - a.y) * u + Math.sin(u * loops * 2 * Math.PI) * 11 + Math.sin(u * Math.PI) * 60;
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    setAttr(this.svg.querySelector('#ph-cord'), 'd', d);
  }
}

function rotateAround(x: number, y: number, deg: number, tx: number, ty: number) {
  const r = (deg * Math.PI) / 180;
  return { x: tx + x * Math.cos(r) - y * Math.sin(r), y: ty + x * Math.sin(r) + y * Math.cos(r) };
}

/** Your mother and tía Gloria on the kitchen extension. */
const extensionScript: CallScript = async (call) => {
  call.ambience('kitchen');
  await call.say(EXTENSION.m1);
  await call.say(EXTENSION.t1);
  await call.say(EXTENSION.m2);
  await call.say(EXTENSION.t2);
  await call.pause(1);
  await call.say(EXTENSION.m3);
  await call.pause(3);
  await call.say(EXTENSION.m4);
  await call.pause(2.5);
  await call.say(EXTENSION.t3);
  for (;;) await call.pause(5);
};

/** "El número que usted marcó no está asignado..." */
const unassignedScript: CallScript = async (call) => {
  call.ambience('none');
  for (let i = 0; i < 2; i++) {
    await call.pause(1.6);
    await call.say(UNASSIGNED.noExiste);
  }
  await call.hangUp();
};
