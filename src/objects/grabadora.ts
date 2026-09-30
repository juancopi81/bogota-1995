// The grabadora: a mid-90s CD radio-cassette with a digital tuner, and its
// close-up. The radio steps from frequency to frequency (the static in
// between is still there); deck 2 records and plays, deck 1 just opens.

import { Radio, FM_RANGE, AM_RANGE } from './radio';
import { Deck, type Key } from './deck';
import { takeUpRadius, supplyRadius, counterDisplay } from './tape';
import { grabadoraSvg, lcdSvg, FUNC, VOLUME, GRILLE_L, GRILLE_R, CASSETTE_AT, CASSETTE_SCALE, type LcdState } from '../art/grabadora';
import { cassetteSvg, HUB_L, HUB_R } from '../art/cassette';
import { shownText } from '../content/lines';
import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';
import { svgPoint } from '../ui/svg';
import { kv } from '../world/store';
import { clamp } from '../util/rng';
import { setAttr, setText, toggleClass } from '../ui/dom';
import { glide } from '../audio/param';

type Func = 'tape' | 'AM' | 'FM';

const MM = 2.4; // cassette drawing scale: px per mm
/** One step of the digital tuner: 0.1 MHz on FM, 10 kHz on AM (the Americas' spacing). */
const STEP = { FM: 0.1, AM: 10 } as const;
/** Holding a TUNING button this long starts a search. */
const HOLD_TO_SEARCH = 450;
const SEARCH_EVERY = 70;

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
  private lastT = 0;
  private reelAngles = [0, 0];
  private slotKey = '';
  private deskKey = '';
  private lcdKey = '';
  private roomLed: SVGElement | null = null;
  private roomLcd: SVGElement | null = null;
  private roomTape: SVGElement | null = null;
  private readonly cones: HTMLElement[];
  private lastPump = '';
  private searching: { dir: 1 | -1; timer: number } | null = null;
  private door1Open = false;

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.radio = new Radio(engine);
    // a digital tuner sits on its grid
    this.radio.freq.FM = Math.round(this.radio.freq.FM / STEP.FM) * STEP.FM;
    this.radio.freq.AM = Math.round(this.radio.freq.AM / STEP.AM) * STEP.AM;

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
    this.deck.captionSource = () => {
      const c = this.radio.caption(this.lastT);
      return c ? { label: c.label, text: shownText(c.line) } : null;
    };
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
    this.cones = [GRILLE_L, GRILLE_R].map((g) => {
      const cone = document.createElement('div');
      cone.className = 'speaker-cone';
      Object.assign(cone.style, { left: `${g.cx - 50}px`, top: `${g.cy + 14 - 50}px` });
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
    this.roomLcd = roomSvg.querySelector('.room-lcd');
    this.roomTape = roomSvg.querySelector('.deck-cassette');
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

  /** The little electronic beep of the tuner's buttons. */
  private beep(): void {
    const ctx = this.engine.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 2400;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.018, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(g).connect(this.deck.mech);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** One step of the tuner. Past the end of the band it wraps round, like the real ones. */
  step(dir: 1 | -1): void {
    if (!this.radio.power) return;
    const band = this.radio.band;
    const [lo, hi] = band === 'FM' ? FM_RANGE : AM_RANGE;
    let f = Math.round((this.radio.freq[band] + dir * STEP[band]) / STEP[band]) * STEP[band];
    if (f > hi + 1e-6) f = lo;
    if (f < lo - 1e-6) f = hi;
    this.radio.tune(f);
  }

  /** Hold a TUNING button: step until a station comes in clearly. */
  private search(dir: 1 | -1): void {
    this.stopSearch();
    const tick = () => {
      this.step(dir);
      const dom = this.radio.dominant();
      if (dom && dom.strength > 0.9) this.stopSearch();
    };
    this.searching = { dir, timer: window.setInterval(tick, SEARCH_EVERY) };
  }

  private stopSearch(): void {
    if (this.searching) clearInterval(this.searching.timer);
    this.searching = null;
  }

  private wire(): void {
    const svg = this.svg;
    const $ = <T extends SVGElement = SVGGElement>(sel: string) => svg.querySelector<T>(sel)!;

    // TUNING ◄◄ ►►: a press is one step; held, the tuner searches
    for (const [sel, dir] of [
      ['#g-tune-down', -1],
      ['#g-tune-up', 1],
    ] as const) {
      const button = $(sel);
      let hold = 0;
      button.addEventListener('pointerdown', (e) => {
        button.setPointerCapture(e.pointerId);
        button.classList.add('down');
        this.beep();
        this.step(dir);
        hold = window.setTimeout(() => this.search(dir), HOLD_TO_SEARCH);
      });
      const release = () => {
        clearTimeout(hold);
        button.classList.remove('down');
        // a search keeps going on its own once started, like the real thing
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
    }
    // the wheel over the display steps too
    $('#g-lcd-bg').addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.stopSearch();
        this.step(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );

    // function switch: TAPE (radio off) / AM / FM
    const func = $('#g-func');
    const setFuncFromX = (x: number) => {
      const i = FUNC.positions.reduce((best, px, idx) => (Math.abs(px - x) < Math.abs(FUNC.positions[best] - x) ? idx : best), 0);
      const next = (['tape', 'AM', 'FM'] as Func[])[i];
      if (next !== this.func) {
        this.func = next;
        this.stopSearch();
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

    // the volume knob on top: drag up (or right) to turn it up, or use the wheel
    const vol = $('#g-vol');
    let volFrom: { x: number; y: number; v: number } | null = null;
    vol.addEventListener('pointerdown', (e) => {
      vol.setPointerCapture(e.pointerId);
      const p = svgPoint(svg, e.clientX, e.clientY);
      volFrom = { x: p.x, y: p.y, v: this.radio.volume };
    });
    vol.addEventListener('pointermove', (e) => {
      if (!volFrom) return;
      const p = svgPoint(svg, e.clientX, e.clientY);
      this.setVolume(volFrom.v + (p.x - volFrom.x - (p.y - volFrom.y)) / 160);
    });
    const endVol = () => (volFrom = null);
    vol.addEventListener('pointerup', endVol);
    vol.addEventListener('pointercancel', endVol);
    vol.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.setVolume(this.radio.volume + (e.deltaY < 0 ? 0.04 : -0.04));
      },
      { passive: false },
    );

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

    // deck 2's door: pushing it closed ejects; open, it shuts
    $('#g-door').addEventListener('pointerdown', () => {
      if (this.deck.door === 'open') this.deck.closeDoor();
      else this.deck.eject();
    });
    // deck 1 is empty: its door just opens and shuts
    $('#g-door1').addEventListener('pointerdown', () => {
      this.door1Open = !this.door1Open;
      play(this.engine.ctx, this.door1Open ? sfx.doorOpen(this.engine.ctx) : sfx.hook(this.engine.ctx), this.deck.mech, { gain: 0.7 });
    });
    // the cassette sticking out of deck 2: take it out
    $('#g-slot').addEventListener('pointerdown', (e) => {
      if (this.deck.door === 'open' && this.deck.cassette) {
        e.stopPropagation();
        this.deck.takeOut();
      }
    });
    // a cassette on the desk: in it goes (or, with its little arrow, turn it over)
    $('#g-desk').addEventListener('pointerdown', (e) => {
      const target = e.target as Element;
      const flip = target.closest<SVGGElement>('[data-flip]');
      const el = flip ?? target.closest<SVGGElement>('[data-cassette]');
      const id = flip ? flip.dataset.flip : el?.dataset.cassette;
      const c = this.deck.desk.find((d) => d.data.id === id);
      if (!c) return;
      if (flip || this.deck.cassette) this.deck.flip(c);
      else this.deck.load(c);
    });
    $('#g-reset').addEventListener('pointerdown', () => this.deck.resetCounter());

    window.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.stopSearch();
        this.beep();
        this.step(e.key === 'ArrowRight' ? 1 : -1);
      }
    });
  }

  // ---------- every frame ----------

  tick(dt: number, t: number): void {
    this.lastT = t;
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

  /** What the green display shows. */
  private lcd(): LcdState {
    const radio = this.radio;
    if (!radio.power) return { band: '', digits: 'tAPE', point: false, unit: '', stereo: false, bars: 0 };
    const dom = radio.dominant();
    const strength = dom?.strength ?? 0;
    const fm = radio.band === 'FM';
    const f = radio.freq[radio.band];
    return {
      band: radio.band,
      digits: fm ? String(Math.round(f * 10)).padStart(4) : String(Math.round(f)).padStart(4),
      point: fm,
      unit: fm ? 'MHz' : 'kHz',
      stereo: fm && strength > 0.8,
      bars: Math.round(strength * 4),
    };
  }

  private draw(dt: number): void {
    const svg = this.svg;
    const radio = this.radio;
    const deck = this.deck;

    // the display, redrawn only when it changes
    const lcd = this.lcd();
    const lcdKey = JSON.stringify(lcd);
    if (lcdKey !== this.lcdKey) {
      this.lcdKey = lcdKey;
      svg.querySelector('#g-lcd')!.innerHTML = lcdSvg(lcd);
    }
    setAttr(svg.querySelector('#g-vol-rot'), 'transform', `translate(${VOLUME.cx} ${VOLUME.cy}) rotate(${(-135 + radio.volume * 270).toFixed(1)})`);
    const fi = ['tape', 'AM', 'FM'].indexOf(this.func);
    setAttr(svg.querySelector('#g-func-thumb'), 'x', String(FUNC.positions[fi] - 14));
    toggleClass(svg.querySelector('#g-door1'), 'open', this.door1Open);

    const rec = deck.isRecording;
    setAttr(svg.querySelector('#g-led-rec'), 'fill', rec ? '#ff4a36' : '#3a1410');
    setAttr(this.roomLed, 'fill', rec ? '#ff4a36' : '#5a1a14');
    setAttr(this.roomLcd, 'fill', radio.power ? '#b7c9a0' : '#7d8a70');
    setAttr(this.roomTape, 'opacity', deck.cassette ? '1' : '0');

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

    // the cassette in deck 2, its reels turning
    const c = deck.cassette;
    const slotKey = c ? `${c.data.id}:${c.side}:${c.data.label}` : '';
    const slot = svg.querySelector<SVGGElement>('#g-slot')!;
    if (slotKey !== this.slotKey) {
      this.slotKey = slotKey;
      slot.innerHTML = c ? cassetteSvg(c.data) : '';
    }
    setAttr(slot, 'transform', `translate(${CASSETTE_AT.x} ${CASSETTE_AT.y - (deck.door === 'open' ? 24 : 0)}) scale(${CASSETTE_SCALE})`);
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

    // cassettes lying on the desk, each with a little arrow to turn it over
    const deskKey = deck.desk.map((d) => `${d.data.id}:${d.side}:${d.data.label}`).join('|');
    if (deskKey !== this.deskKey) {
      this.deskKey = deskKey;
      svg.querySelector('#g-desk')!.innerHTML = deck.desk
        .map((d, i) => {
          const x = 1090 + i * 220;
          const y = 792 + (i % 2) * 8;
          return `<g class="grab" transform="translate(${x} ${y}) rotate(${i % 2 ? 4 : -3}) scale(0.62)">${cassetteSvg(d.data)}</g>
          <g class="grab" data-flip="${d.data.id}" transform="translate(${x + 176} ${y + 38})">
            <circle r="17" fill="#f1ece0" stroke="#8b7a5c" stroke-width="1.5"/>
            <path d="M6.1 -5.1 A8 8 0 1 1 -2.7 -7.5" fill="none" stroke="#3d4044" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M0.1 -8.6 L-1.7 -4.7 L-3.8 -10.3 Z" fill="#3d4044"/>
            <text y="32" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#5d4a2e" letter-spacing="0.5">VOLTEAR</text>
          </g>`;
        })
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
