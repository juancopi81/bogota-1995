// The grabadora: radio + cassette deck in one silver box, and its close-up.

import { Radio } from './radio';
import { Deck, type Key } from './deck';
import { takeUpRadius, supplyRadius, counterDisplay } from './tape';
import { grabadoraSvg, fmX, amX, KNOB, FUNC, VOL, CASSETTE_AT } from '../art/grabadora';
import { cassetteSvg, HUB_L, HUB_R } from '../art/cassette';
import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';
import { svgPoint } from '../ui/svg';
import { kv } from '../world/store';
import { clamp } from '../util/rng';
import { setAttr, setText, toggleClass } from '../ui/dom';
import { glide } from '../audio/param';

type Func = 'tape' | 'AM' | 'FM';

const MM = 2.4; // cassette drawing scale: px per mm

export class Grabadora {
  readonly radio: Radio;
  readonly deck: Deck;
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly volumeGain: GainNode;
  private readonly radioGate: GainNode;
  private readonly tapeGate: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly level = new Float32Array(256);
  private func: Func;
  private knobAngle = 0;
  private reelAngles = [0, 0];
  private slotKey = '';
  private deskKey = '';
  private roomLed: SVGElement | null = null;
  private roomNeedle: SVGElement | null = null;
  private readonly cones: HTMLElement[];
  private lastPump = '';

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.radio = new Radio(engine);

    // speaker chain: radio or tape → volume → a boombox speaker's EQ → the radio's spot in the room
    this.radioGate = ctx.createGain();
    this.tapeGate = ctx.createGain();
    this.tapeGate.gain.value = 0;
    this.volumeGain = ctx.createGain();
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 85;
    const box = ctx.createBiquadFilter();
    box.type = 'peaking';
    box.frequency.value = 2400;
    box.gain.value = 3;
    box.Q.value = 0.8;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.radio.out.connect(this.radioGate).connect(this.volumeGain);
    this.volumeGain.connect(lowCut).connect(box).connect(engine.channel('radio').input);
    box.connect(this.analyser);

    this.deck = new Deck(engine, this.radio.out);
    this.deck.out.connect(this.tapeGate).connect(this.volumeGain);
    this.deck.mech.connect(engine.channel('radio').input);

    this.func = kv.get<Func>('grabadora.func', 'FM');
    this.radio.volume = kv.get('grabadora.volume', 0.42);
    this.applyFunc(false);

    this.el = document.createElement('div');
    this.el.className = 'closeup';
    this.el.id = 'cu-grabadora';
    this.el.innerHTML = grabadoraSvg();
    this.svg = this.el.querySelector('svg')!;
    this.cones = [385, 1215].map((cx) => {
      const cone = document.createElement('div');
      cone.className = 'speaker-cone';
      Object.assign(cone.style, { left: `${cx - 50}px`, top: `${510 - 50}px` });
      this.el.appendChild(cone);
      return cone;
    });
    this.wire();
  }

  async init(): Promise<void> {
    await this.deck.init();
  }

  /** Connect the little grabadora drawn in the room so it mirrors this one. */
  bindRoom(roomSvg: SVGSVGElement): void {
    this.roomLed = roomSvg.querySelector('.rec-led');
    this.roomNeedle = roomSvg.querySelector('.dial-needle');
  }

  // ---------- controls ----------

  private applyFunc(sound = true): void {
    if (this.func === 'tape') this.radio.setPower(false);
    else {
      this.radio.setBand(this.func);
      this.radio.setPower(true);
    }
    kv.set('grabadora.func', this.func);
    if (sound) play(this.engine.ctx, sfx.click(this.engine.ctx), this.deck.mech, { gain: 0.8 });
  }

  private setVolume(v: number): void {
    this.radio.volume = clamp(v, 0, 1);
    kv.set('grabadora.volume', this.radio.volume);
  }

  private wire(): void {
    const svg = this.svg;
    const $ = <T extends SVGElement = SVGGElement>(sel: string) => svg.querySelector<T>(sel)!;

    // tuning knob: turn it by dragging around it, or with the wheel
    const knob = $('#g-knob');
    let lastAngle: number | null = null;
    knob.addEventListener('pointerdown', (e) => {
      knob.setPointerCapture(e.pointerId);
      const p = svgPoint(svg, e.clientX, e.clientY);
      lastAngle = Math.atan2(p.y - KNOB.cy, p.x - KNOB.cx);
    });
    knob.addEventListener('pointermove', (e) => {
      if (lastAngle === null) return;
      const p = svgPoint(svg, e.clientX, e.clientY);
      const a = Math.atan2(p.y - KNOB.cy, p.x - KNOB.cx);
      let d = a - lastAngle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      lastAngle = a;
      this.turnKnob(d);
    });
    const endKnob = () => (lastAngle = null);
    knob.addEventListener('pointerup', endKnob);
    knob.addEventListener('pointercancel', endKnob);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.turnKnob(Math.sign(e.deltaY) * -0.12);
    };
    knob.addEventListener('wheel', wheel, { passive: false });
    svg.querySelector<SVGRectElement>('#g-needle')!.addEventListener('wheel', wheel, { passive: false });

    // function switch: CINTA / AM / FM
    const func = $('#g-func');
    const setFuncFromX = (x: number) => {
      const i = FUNC.positions.reduce((best, px, idx) => (Math.abs(px - x) < Math.abs(FUNC.positions[best] - x) ? idx : best), 0);
      const next = (['tape', 'AM', 'FM'] as Func[])[i];
      if (next !== this.func) {
        this.func = next;
        this.applyFunc();
      }
    };
    let funcDrag = false;
    func.addEventListener('pointerdown', (e) => {
      funcDrag = true;
      func.setPointerCapture(e.pointerId);
      setFuncFromX(svgPoint(svg, e.clientX, e.clientY).x);
    });
    func.addEventListener('pointermove', (e) => funcDrag && setFuncFromX(svgPoint(svg, e.clientX, e.clientY).x));
    func.addEventListener('pointerup', () => (funcDrag = false));

    // volume slider
    const vol = $('#g-vol');
    let volDrag = false;
    const setVolFromX = (x: number) => this.setVolume((x - VOL.x0) / (VOL.x1 - VOL.x0));
    vol.addEventListener('pointerdown', (e) => {
      volDrag = true;
      vol.setPointerCapture(e.pointerId);
      setVolFromX(svgPoint(svg, e.clientX, e.clientY).x);
    });
    vol.addEventListener('pointermove', (e) => volDrag && setVolFromX(svgPoint(svg, e.clientX, e.clientY).x));
    vol.addEventListener('pointerup', () => (volDrag = false));

    // piano keys
    for (const key of svg.querySelectorAll<SVGGElement>('.key')) {
      key.addEventListener('pointerdown', () => {
        const k = key.dataset.key as Key;
        const ok = this.deck.press(k);
        if (!ok) {
          key.classList.add('bounce');
          setTimeout(() => key.classList.remove('bounce'), 180);
        }
      });
    }

    // the door and the cassette in it
    $('#g-door').addEventListener('pointerdown', () => {
      if (this.deck.door === 'open') this.deck.closeDoor();
    });
    $('#g-slot').addEventListener('pointerdown', (e) => {
      if (this.deck.door === 'open' && this.deck.cassette) {
        e.stopPropagation();
        this.deck.takeOut();
      }
    });
    $('#g-desk').addEventListener('pointerdown', (e) => {
      const el = (e.target as Element).closest<SVGGElement>('[data-cassette]');
      if (!el) return;
      const c = this.deck.desk.find((d) => d.data.id === el.dataset.cassette);
      if (!c) return;
      if (this.deck.door === 'open' && !this.deck.cassette) this.deck.insert(c);
      else this.deck.flip(c);
    });
    $('#g-reset').addEventListener('pointerdown', () => this.deck.resetCounter());

    window.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') this.turnKnob(-0.08);
      if (e.key === 'ArrowRight') this.turnKnob(0.08);
    });
  }

  private turnKnob(radians: number): void {
    this.knobAngle += radians;
    const perTurn = this.radio.band === 'FM' ? 2.4 : 150;
    this.radio.tune(this.radio.freq[this.radio.band] + (radians / (2 * Math.PI)) * perTurn);
    // a faint friction tick as the string drags the needle
    if (Math.random() < Math.min(1, Math.abs(radians) * 3)) {
      play(this.engine.ctx, sfx.click(this.engine.ctx), this.deck.mech, { gain: 0.06, rate: 1.6 });
    }
  }

  // ---------- every frame ----------

  tick(dt: number, t: number): void {
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    this.deck.tick(dt);
    const tapeOn = this.deck.tapeAudible;
    this.radio.audible = !tapeOn;
    glide(this.radioGate.gain, tapeOn ? 0 : 1, now, 0.03);
    glide(this.tapeGate.gain, tapeOn ? 1 : 0, now, 0.03);
    glide(this.volumeGain.gain, this.radio.volume ** 2 * 1.4, now, 0.03);
    this.radio.tick(t);
    this.draw(dt);
  }

  private draw(dt: number): void {
    const svg = this.svg;
    const radio = this.radio;
    const deck = this.deck;

    const x = radio.band === 'FM' ? fmX(radio.freq.FM) : amX(radio.freq.AM);
    setAttr(svg.querySelector('#g-needle'), 'x', (x - 1.5).toFixed(1));
    setAttr(svg.querySelector('#g-knob-rot'), 'transform', `rotate(${((this.knobAngle * 180) / Math.PI).toFixed(1)})`);
    const fi = ['tape', 'AM', 'FM'].indexOf(this.func);
    setAttr(svg.querySelector('#g-func-thumb'), 'x', String(FUNC.positions[fi] - 14));
    setAttr(svg.querySelector('#g-vol-thumb'), 'x', (VOL.x0 + radio.volume * (VOL.x1 - VOL.x0) - 9).toFixed(1));

    const dom = radio.power ? radio.dominant() : null;
    setAttr(svg.querySelector('#g-led-tune'), 'fill', dom ? `rgba(120, 230, 110, ${(0.25 + dom.strength * 0.75).toFixed(2)})` : '#1f2a1c');
    const rec = deck.isRecording;
    setAttr(svg.querySelector('#g-led-rec'), 'fill', rec ? '#ff4a36' : '#3a1410');
    setAttr(this.roomLed, 'fill', rec ? '#ff4a36' : '#5a1a14');
    if (this.roomNeedle) {
      const roomX = 222 + ((x - 646) / (954 - 646)) * 72;
      setAttr(this.roomNeedle, 'x', roomX.toFixed(1));
    }

    // keys: which ones are held down
    for (const key of svg.querySelectorAll<SVGGElement>('.key')) {
      const k = key.dataset.key as Key;
      const down =
        (k === 'play' && (deck.transport === 'play' || deck.transport === 'rec')) ||
        (k === 'rec' && deck.transport === 'rec') ||
        (k === 'ff' && deck.transport === 'ff') ||
        (k === 'rew' && deck.transport === 'rew') ||
        (k === 'pause' && deck.paused);
      toggleClass(key, 'down', down);
    }

    const digits = counterDisplay(deck.counterPos, deck.counterZero);
    svg.querySelectorAll('.g-digit').forEach((d, i) => setText(d, digits[i]));
    toggleClass(svg.querySelector('#g-door'), 'open', deck.door === 'open');

    // the cassette in the deck, its reels turning
    const c = deck.cassette;
    const slotKey = c ? `${c.data.id}:${c.side}:${c.data.label}` : '';
    const slot = svg.querySelector<SVGGElement>('#g-slot')!;
    if (slotKey !== this.slotKey) {
      this.slotKey = slotKey;
      slot.innerHTML = c ? cassetteSvg(c.data) : '';
    }
    setAttr(slot, 'transform', `translate(${CASSETTE_AT.x} ${CASSETTE_AT.y - (deck.door === 'open' ? 26 : 0)})`);
    toggleClass(slot, 'grab', deck.door === 'open' && !!c);
    if (c) {
      const rTake = takeUpRadius(c.pos);
      const rSupply = supplyRadius(c.pos, c.length);
      const v = 47.6 * deck.reelSpeed;
      this.reelAngles[0] += ((v / rSupply) * dt * 180) / Math.PI;
      this.reelAngles[1] += ((v / rTake) * dt * 180) / Math.PI;
      setAttr(slot.querySelector('.pack-l'), 'r', (rSupply * MM).toFixed(1));
      setAttr(slot.querySelector('.pack-r'), 'r', (rTake * MM).toFixed(1));
      setAttr(slot.querySelector('.hub-l'), 'transform', `translate(${HUB_L.x} ${HUB_L.y}) rotate(${this.reelAngles[0].toFixed(1)})`);
      setAttr(slot.querySelector('.hub-r'), 'transform', `translate(${HUB_R.x} ${HUB_R.y}) rotate(${this.reelAngles[1].toFixed(1)})`);
    }

    // cassettes lying on the desk
    const deskKey = deck.desk.map((d) => `${d.data.id}:${d.side}:${d.data.label}`).join('|');
    if (deskKey !== this.deskKey) {
      this.deskKey = deskKey;
      svg.querySelector('#g-desk')!.innerHTML = deck.desk
        .map((d, i) => `<g class="grab" transform="translate(${1090 + i * 200} ${792 + (i % 2) * 8}) rotate(${i % 2 ? 4 : -3}) scale(0.62)">${cassetteSvg(d.data)}</g>`)
        .join('');
    }

    // the speaker cones breathe with the music
    this.analyser.getFloatTimeDomainData(this.level);
    let sum = 0;
    for (let i = 0; i < this.level.length; i++) sum += this.level[i] * this.level[i];
    const rms = Math.sqrt(sum / this.level.length);
    const pump = (1 + Math.min(0.08, rms * 0.45)).toFixed(3);
    if (pump !== this.lastPump) {
      this.lastPump = pump;
      for (const cone of this.cones) cone.style.transform = `scale(${pump})`;
    }
  }
}
