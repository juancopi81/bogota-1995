// The television: a tube that needs a second to warm up, a knob that clacks
// through twelve channels (three of them with something on), and rabbit ears
// you have to fiddle with. Or just give the cabinet a whack.

import { Timeline } from '../broadcast/timeline';
import type { Cue, Scheduled } from '../broadcast/types';
import { CHANNELS, type ChannelDef, type TvSegment } from '../content/tv';
import type { Clip } from '../content/clips';
import { dynamicLine } from '../content/lines';
import { tvSvg, SCREEN, CHANNEL_KNOB, VOLUME_KNOB, ANTENNA, channelAngle } from '../art/tv';
import { drawScene, drawAnthem, TV_W, TV_H } from './tvscenes';
import type { AudioEngine } from '../audio/engine';
import { library } from '../audio/library';
import { voices, lineDuration } from '../audio/voices';
import { sfx, play } from '../audio/sfx';
import { subtitles } from '../ui/subtitles';
import { svgPoint } from '../ui/svg';
import { light } from '../scene/light';
import { closeups } from '../scene/closeups';
import { clock, at } from '../world/clock';
import { kv } from '../world/store';
import { bus } from '../world/bus';
import { clamp, mulberry32 } from '../util/rng';
import { MAMA, mamaSays } from './house';
import { setAttr } from '../ui/dom';
import { glide } from '../audio/param';

const ANTHEM_AT = at(18, 0);

/** The light each kind of picture throws into the room: r, g, b, brightness. */
const GLOW: Record<string, [number, number, number, number]> = {
  snow: [175, 182, 200, 0.75],
  novela: [150, 105, 75, 0.35],
  'novela-close': [175, 130, 105, 0.45],
  presenta: [60, 70, 110, 0.2],
  'bumper-uno': [40, 80, 170, 0.45],
  'bumper-a': [200, 80, 50, 0.6],
  'bumper-tres': [215, 215, 200, 0.8],
  'ad-chocolate': [140, 85, 50, 0.45],
  'ad-blancor': [70, 120, 210, 0.6],
  'ad-casablanca': [230, 200, 190, 0.8],
  paramo: [160, 170, 155, 0.65],
  musical: [150, 90, 170, 0.5],
  anthem: [180, 170, 110, 0.65],
  clip: [160, 160, 170, 0.5],
};

/** One broadcast channel: its running order, and its sound when it's on. */
class Channel {
  readonly timeline: Timeline<TvSegment>;
  readonly out: GainNode;
  private playing = new Map<Scheduled<TvSegment>, { gain: GainNode; sources: AudioScheduledSourceNode[] }>();
  private active = false;

  constructor(
    private readonly ctx: AudioContext,
    readonly def: ChannelDef,
  ) {
    this.out = ctx.createGain();
    const rng = mulberry32(def.number * 31);
    let i = Math.floor(rng() * def.program.length);
    this.timeline = new Timeline<TvSegment>({
      from: -60 - rng() * 120,
      next: () => def.program[i++ % def.program.length],
      measure: (seg) => this.measure(seg),
      hardBreak: { at: ANTHEM_AT, seg: () => (library.anthem() ? { kind: 'anthem' } : null) },
    });
    bus.on('clock:skip', () => this.stopAll());
    bus.on('media:loaded', ({ kind }) => kind === 'anthem' && this.timeline.regenerateAfter(clock.now()));
  }

  private measure(seg: TvSegment): { dur: number; cues: Cue[] } {
    if (seg.kind === 'clip') return { dur: seg.clip.dur, cues: [] };
    if (seg.kind === 'anthem') return { dur: (library.anthem()?.duration ?? 60) + 2, cues: [] };
    const cues: Cue[] = [];
    let t = 1.2;
    for (const line of seg.lines) {
      const dur = lineDuration(line, 13);
      cues.push({ line, at: t, dur });
      t += dur + 0.6;
    }
    return { dur: Math.max(seg.min ?? 0, t + 1), cues };
  }

  setActive(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    if (!on) this.stopAll();
  }

  private stopAll(): void {
    const now = this.ctx.currentTime;
    for (const p of this.playing.values()) {
      glide(p.gain.gain, 0, now, 0.02);
      for (const s of p.sources) {
        try {
          s.stop(now + 0.1);
        } catch {
          /* already stopped */
        }
      }
      setTimeout(() => p.gain.disconnect(), 300);
    }
    this.playing.clear();
  }

  tick(t: number): Scheduled<TvSegment> | undefined {
    const item = this.timeline.at(t);
    if (!this.active || !item) return item;
    for (const [it, p] of this.playing) {
      if (it.end < t - 0.5) {
        p.gain.disconnect();
        this.playing.delete(it);
      }
    }
    if (!this.playing.has(item)) this.schedule(item);
    const next = this.timeline.after(item);
    if (next && next.start - t < 1.2 && !this.playing.has(next)) this.schedule(next);
    return item;
  }

  private schedule(item: Scheduled<TvSegment>): void {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.connect(this.out);
    const entry = { gain, sources: [] as AudioScheduledSourceNode[] };
    this.playing.set(item, entry);
    const start = clock.toCtx(item.start);
    const end = clock.toCtx(item.end);
    const play = (buffer: AudioBuffer, when: number, loop: boolean, level: number, until = end) => {
      if (!this.playing.has(item)) return;
      const n = ctx.currentTime;
      const offset = Math.max(0, n - when);
      if (!loop && offset >= buffer.duration) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      const g = ctx.createGain();
      g.gain.value = level;
      src.connect(g).connect(gain);
      src.start(Math.max(n, when), loop ? offset % buffer.duration : offset);
      src.stop(Math.max(n + 0.05, until));
      entry.sources.push(src);
    };
    const seg = item.seg;
    if (seg.kind === 'scene' && seg.bed) {
      const style = seg.bed;
      void library.whenBed(`tv${this.def.number}-${style}`, style).then((b) => play(b, start, true, 0.4));
    }
    if (seg.kind === 'anthem') {
      const anthem = library.anthem();
      if (anthem) play(anthem, start + 1, false, 1);
    }
    for (const cue of item.cues) {
      const v = voices.get(cue.line.id);
      if (v) play(v, start + cue.at, false, 1.1, start + cue.at + v.duration + 0.1);
    }
  }
}

/** Real clips play in an embedded YouTube player behind the tube's effects. */
class ClipScreen {
  private frame: HTMLIFrameElement | null = null;
  private current = '';

  constructor(
    private readonly parent: HTMLElement,
    private readonly before: HTMLElement,
  ) {}

  show(clip: Clip, offset: number): void {
    const key = `${clip.id}@${clip.start}`;
    if (this.frame && this.current === key) return;
    this.hide();
    const f = document.createElement('iframe');
    const start = Math.floor(clip.start + Math.max(0, offset));
    f.src = `https://www.youtube-nocookie.com/embed/${clip.id}?start=${start}&autoplay=1&controls=0&rel=0&playsinline=1&iv_load_policy=3&disablekb=1`;
    f.allow = 'autoplay; encrypted-media';
    f.className = 'tv-clip';
    Object.assign(f.style, { left: `${SCREEN.x}px`, top: `${SCREEN.y}px`, width: `${SCREEN.w}px`, height: `${SCREEN.h}px` });
    this.parent.insertBefore(f, this.before);
    this.frame = f;
    this.current = key;
  }

  hide(): void {
    this.frame?.remove();
    this.frame = null;
    this.current = '';
  }
}

export class Tv {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly screen: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly scene: HTMLCanvasElement;
  private readonly sg: CanvasRenderingContext2D;
  private readonly snow: HTMLCanvasElement;
  private readonly snowCtx: CanvasRenderingContext2D;
  private readonly snowImage: ImageData;
  private readonly channels = new Map<number, Channel>();
  private readonly chanGain: GainNode;
  private readonly staticGain: GainNode;
  private readonly volumeGain: GainNode;
  private readonly whine: GainNode;
  power = false;
  channel: number;
  volume: number;
  ears: [number, number];
  private warm = 0;
  private offAnim = 1;
  private slap = 0;
  private roll = 0;
  private rolling = 0;
  private roomCanvas: HTMLCanvasElement | null = null;
  private roomLed: SVGElement | null = null;
  private roomKnob: SVGElement | null = null;
  private frame = 0;
  private volumeHighSince: number | null = null;
  private nagged = false;
  private clips!: ClipScreen;

  constructor(private readonly engine: AudioEngine) {
    const ctx = engine.ctx;
    this.channel = kv.get('tv.channel', 7);
    this.volume = kv.get('tv.volume', 0.55);
    this.ears = kv.get<[number, number]>('tv.ears', [-44, 22]);

    // sound: the channel, the static, a small speaker, the volume knob
    this.chanGain = ctx.createGain();
    this.staticGain = ctx.createGain();
    this.staticGain.gain.value = 0;
    const staticFilter = ctx.createBiquadFilter();
    staticFilter.type = 'bandpass';
    staticFilter.frequency.value = 2800;
    staticFilter.Q.value = 0.4;
    engine.noiseSource('white', staticFilter);
    staticFilter.connect(this.staticGain);
    const speaker = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 170;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6500;
    this.volumeGain = ctx.createGain();
    this.volumeGain.gain.value = 0;
    this.chanGain.connect(speaker);
    this.staticGain.connect(speaker);
    speaker.connect(hp).connect(lp).connect(this.volumeGain).connect(engine.channel('tv').input);
    // the flyback whine of a CRT (young ears only)
    const whineOsc = ctx.createOscillator();
    whineOsc.frequency.value = 15625;
    this.whine = ctx.createGain();
    this.whine.gain.value = 0;
    whineOsc.connect(this.whine).connect(engine.channel('tv').input);
    whineOsc.start();

    for (const def of CHANNELS) {
      const ch = new Channel(ctx, def);
      ch.out.connect(this.chanGain);
      this.channels.set(def.number, ch);
    }

    this.el = document.createElement('div');
    this.el.className = 'closeup';
    this.el.id = 'cu-tv';
    this.el.innerHTML = tvSvg();
    this.svg = this.el.querySelector('svg')!;

    this.screen = document.createElement('canvas');
    this.screen.className = 'tv-screen';
    this.screen.width = TV_W;
    this.screen.height = TV_H;
    Object.assign(this.screen.style, { left: `${SCREEN.x}px`, top: `${SCREEN.y}px`, width: `${SCREEN.w}px`, height: `${SCREEN.h}px` });
    this.el.appendChild(this.screen);
    this.clips = new ClipScreen(this.el, this.screen);
    const glass = document.createElement('div');
    glass.className = 'tv-glass';
    Object.assign(glass.style, { left: `${SCREEN.x}px`, top: `${SCREEN.y}px`, width: `${SCREEN.w}px`, height: `${SCREEN.h}px` });
    this.el.appendChild(glass);
    this.g = this.screen.getContext('2d')!;

    this.scene = document.createElement('canvas');
    this.scene.width = TV_W;
    this.scene.height = TV_H;
    this.sg = this.scene.getContext('2d')!;
    this.snow = document.createElement('canvas');
    this.snow.width = 160;
    this.snow.height = 120;
    this.snowCtx = this.snow.getContext('2d')!;
    this.snowImage = this.snowCtx.createImageData(160, 120);

    this.wire();
  }

  bindRoom(roomWall: SVGSVGElement, roomCanvas: HTMLCanvasElement): void {
    this.roomCanvas = roomCanvas;
    this.roomLed = roomWall.querySelector('.tv-led');
    this.roomKnob = roomWall.querySelector('.tv-knob-mark');
  }

  // ---------- controls ----------

  private wire(): void {
    const svg = this.svg;
    const q = <T extends SVGElement = SVGGElement>(sel: string) => svg.querySelector<T>(sel)!;

    q('#tv-power').addEventListener('pointerdown', () => this.setPower(!this.power));

    // the channel knob: drag it round, click either side, or use the wheel
    const knob = q('#tv-channel');
    let dragFrom: number | null = null;
    knob.addEventListener('pointerdown', (e) => {
      knob.setPointerCapture(e.pointerId);
      const p = svgPoint(svg, e.clientX, e.clientY);
      dragFrom = Math.atan2(p.y - CHANNEL_KNOB.cy, p.x - CHANNEL_KNOB.cx);
    });
    knob.addEventListener('pointermove', (e) => {
      if (dragFrom === null) return;
      const p = svgPoint(svg, e.clientX, e.clientY);
      const a = Math.atan2(p.y - CHANNEL_KNOB.cy, p.x - CHANNEL_KNOB.cx);
      let d = ((a - dragFrom) * 180) / Math.PI;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (Math.abs(d) >= 22) {
        this.step(d > 0 ? 1 : -1);
        dragFrom = a;
      }
    });
    knob.addEventListener('pointerup', (e) => {
      const p = svgPoint(svg, e.clientX, e.clientY);
      const moved = dragFrom !== null && Math.abs(Math.atan2(p.y - CHANNEL_KNOB.cy, p.x - CHANNEL_KNOB.cx) - dragFrom) > 0.05;
      if (!moved) this.step(p.x >= CHANNEL_KNOB.cx ? 1 : -1);
      dragFrom = null;
    });
    knob.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.step(e.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );

    const vol = q('#tv-volume');
    let volFrom: number | null = null;
    vol.addEventListener('pointerdown', (e) => {
      vol.setPointerCapture(e.pointerId);
      volFrom = e.clientY;
    });
    vol.addEventListener('pointermove', (e) => {
      if (volFrom === null) return;
      this.setVolume(this.volume + (volFrom - e.clientY) / 180);
      volFrom = e.clientY;
    });
    vol.addEventListener('pointerup', () => (volFrom = null));
    vol.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.setVolume(this.volume - Math.sign(e.deltaY) * 0.05);
      },
      { passive: false },
    );

    // the rabbit ears: grab a rod and swing it
    const ear = (index: 0 | 1, el: SVGGElement) => {
      let dragging = false;
      el.addEventListener('pointerdown', (e) => {
        dragging = true;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const p = svgPoint(svg, e.clientX, e.clientY);
        let a = (Math.atan2(p.x - ANTENNA.cx, ANTENNA.cy - p.y) * 180) / Math.PI;
        a = index === 0 ? clamp(a, -85, 5) : clamp(a, -5, 85);
        this.ears[index] = a;
      });
      el.addEventListener('pointerup', () => {
        dragging = false;
        kv.set('tv.ears', this.ears);
      });
    };
    ear(0, q('#tv-ear-l'));
    ear(1, q('#tv-ear-r'));

    // a whack on the side of the cabinet
    q('#tv-cabinet').addEventListener('pointerdown', () => {
      play(this.engine.ctx, sfx.slap(this.engine.ctx), this.engine.channel('tv').input, { gain: 0.8 });
      this.slap = 1;
      this.rolling = 0;
      this.el.classList.remove('shake');
      void this.el.offsetWidth;
      this.el.classList.add('shake');
    });

    window.addEventListener('keydown', (e) => {
      if (!closeups.isOpen('tv')) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') this.step(1);
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') this.step(-1);
      if (e.key === ' ') {
        e.preventDefault();
        this.setPower(!this.power);
      }
    });
  }

  setPower(on: boolean): void {
    if (on === this.power) return;
    this.power = on;
    const ctx = this.engine.ctx;
    if (on) {
      play(ctx, sfx.degauss(ctx), this.engine.channel('tv').input, { gain: 0.5 });
      this.warm = 0;
      this.rolling = 1.5;
    } else {
      play(ctx, sfx.click(ctx), this.engine.channel('tv').input, { gain: 0.8, rate: 0.7 });
      this.offAnim = 0;
    }
    bus.emit('tv:power', { on });
  }

  private step(dir: number): void {
    this.channel = ((this.channel - 2 + dir + 12) % 12) + 2;
    kv.set('tv.channel', this.channel);
    play(this.engine.ctx, sfx.detent(this.engine.ctx), this.engine.channel('tv').input, { gain: 0.7 });
    this.rolling = Math.max(this.rolling, 0.4);
  }

  private setVolume(v: number): void {
    this.volume = clamp(v, 0, 1);
    kv.set('tv.volume', this.volume);
  }

  /** How well the current channel comes in (0 = snow). */
  private signal(t: number): number {
    const def = this.channels.get(this.channel)?.def;
    if (!def) return 0;
    const [l, r] = this.ears;
    const miss = (Math.abs(l - def.ideal[0]) + Math.abs(r - def.ideal[1])) / 150;
    const drift = Math.sin(t * 0.7 + def.number) * 0.04 + Math.sin(t * 2.3) * 0.02;
    return clamp(def.strength * (1 - miss) + 0.04 + this.slap * 0.25 + drift, 0, 1);
  }

  // ---------- every frame ----------

  tick(dt: number, t: number): void {
    const now = this.engine.ctx.currentTime;
    this.slap = Math.max(0, this.slap - dt / 14);
    if (this.power) this.warm = Math.min(1, this.warm + dt / 1.4);
    else this.offAnim = Math.min(1, this.offAnim + dt / 0.9);
    const q = this.power ? this.signal(t) : 0;
    // weak signal: the picture rolls now and then
    if (this.power && q < 0.35 && Math.random() < dt * 0.25) this.rolling = 1.2;
    this.rolling = Math.max(0, this.rolling - dt);
    if (this.rolling > 0) this.roll = (this.roll + dt * 380) % TV_H;
    else this.roll *= Math.max(0, 1 - dt * 8);

    let current: Scheduled<TvSegment> | undefined;
    for (const [number, ch] of this.channels) {
      const on = this.power && number === this.channel;
      ch.setActive(on);
      const item = ch.tick(t);
      if (on) current = item;
    }
    const hasChannel = this.channels.has(this.channel);
    const audible = this.power ? this.warm : 0;
    glide(this.chanGain.gain, hasChannel ? Math.pow(q, 0.8) * audible : 0, now, 0.04);
    glide(this.staticGain.gain, (hasChannel ? Math.pow(1 - q, 1.6) * 0.3 : 0.32) * audible, now, 0.04);
    glide(this.volumeGain.gain, this.volume ** 2 * 1.5, now, 0.04);
    glide(this.whine.gain, this.power ? 0.0025 : 0, now, 0.1);

    this.draw(t, current, q);
    this.subtitle(t, current, q);
    this.nag(t);
  }

  private subtitle(t: number, item: Scheduled<TvSegment> | undefined, q: number): void {
    if (!this.power || this.warm < 0.8 || q < 0.25 || this.volume < 0.05 || !item) {
      subtitles.set('tv', null);
      return;
    }
    const rel = t - item.start;
    const cue = item.cues.find((c) => rel >= c.at && rel < c.at + c.dur);
    const name = this.channels.get(this.channel)!.def.name;
    if (cue) subtitles.set('tv', { label: `TV · ${name} ${this.channel}`, line: cue.line, clarity: clamp((q - 0.25) / 0.5, 0, 1) });
    else if (item.seg.kind === 'anthem') subtitles.set('tv', { label: `TV · ${name} ${this.channel}`, line: dynamicLine('jugador', '♪ Himno Nacional de la República de Colombia') });
    else subtitles.set('tv', null);
  }

  /** Too loud for too long, and someone in the kitchen notices. */
  private nag(t: number): void {
    const loud = this.power && this.volume > 0.85;
    if (!loud) {
      this.volumeHighSince = null;
      return;
    }
    this.volumeHighSince ??= t;
    if (!this.nagged && t - this.volumeHighSince > 35) {
      this.nagged = true;
      mamaSays(MAMA.volumenTv);
    }
  }

  private draw(t: number, item: Scheduled<TvSegment> | undefined, q: number): void {
    const g = this.g;
    const W = this.screen.width;
    const H = this.screen.height;
    this.frame++;

    // knobs and ears
    setAttr(this.svg.querySelector('#tv-channel-rot'), 'transform', `rotate(${channelAngle(this.channel) + 90} ${CHANNEL_KNOB.cx} ${CHANNEL_KNOB.cy})`);
    setAttr(this.svg.querySelector('#tv-volume-rot'), 'transform', `rotate(${-135 + this.volume * 270} ${VOLUME_KNOB.cx} ${VOLUME_KNOB.cy})`);
    setAttr(this.svg.querySelector('#tv-ear-l'), 'transform', `translate(${ANTENNA.cx - 8} ${ANTENNA.cy}) rotate(${this.ears[0]})`);
    setAttr(this.svg.querySelector('#tv-ear-r'), 'transform', `translate(${ANTENNA.cx + 8} ${ANTENNA.cy}) rotate(${this.ears[1]})`);
    setAttr(this.svg.querySelector('#tv-led'), 'fill', this.power ? '#ff4a36' : '#3a1410');
    setAttr(this.roomLed, 'fill', this.power ? '#ff4a36' : '#3a1410');
    setAttr(this.roomKnob, 'transform', `rotate(${channelAngle(this.channel) + 90} 1293 346)`);

    // only draw the picture when someone can see it (the room, or the TV up close), at ~30 fps
    const visible = closeups.current === null || closeups.isOpen('tv');
    if (!visible || this.frame % 2 === 1) return;

    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.power && this.offAnim >= 1) {
      this.clips.hide();
      g.clearRect(0, 0, W, H);
      this.mirror(false);
      light.crt = 0;
      return;
    }
    if (!this.power) light.crt = 0;

    // the picture
    const sg = this.sg;
    const hasChannel = this.channels.has(this.channel);
    if (hasChannel && item) {
      if (item.seg.kind === 'scene') {
        const rel = t - item.start;
        const speaking = Math.max(0, item.cues.findIndex((c) => rel >= c.at && rel < c.at + c.dur + 0.6));
        drawScene(sg, item.seg.scene, rel, speaking);
      } else if (item.seg.kind === 'anthem') {
        drawAnthem(sg, t - item.start);
      } else {
        sg.fillStyle = '#000';
        sg.fillRect(0, 0, TV_W, TV_H);
      }
    }

    const clip = this.power && this.warm > 0.3 && hasChannel && item?.seg.kind === 'clip' ? item.seg.clip : null;
    if (clip && item) this.clips.show(clip, t - item.start);
    else this.clips.hide();
    if (clip) g.clearRect(0, 0, W, H);
    else {
      g.fillStyle = '#050606';
      g.fillRect(0, 0, W, H);
    }
    if (hasChannel && item && !clip) {
      g.imageSmoothingEnabled = true;
      const y = this.roll;
      g.globalAlpha = 1;
      g.drawImage(this.scene, 0, y, W, H);
      if (y > 0) {
        g.drawImage(this.scene, 0, y - H - 12, W, H);
        g.fillStyle = '#000';
        g.fillRect(0, y - 12, W, 12);
      }
      // ghosting and color loss when the signal is weak
      const weak = 1 - q;
      if (weak > 0.2) {
        g.globalAlpha = weak * 0.3;
        g.drawImage(this.scene, 6, y, W, H);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'saturation';
        g.fillStyle = `rgba(128,128,128,${Math.min(1, weak * 1.2).toFixed(2)})`;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
    }
    // snow
    const snowAmount = hasChannel ? Math.pow(1 - q, 1.3) * 0.95 : 1;
    if (snowAmount > 0.02) {
      const data = new Uint32Array(this.snowImage.data.buffer);
      for (let i = 0; i < data.length; i++) {
        const v = (Math.random() * 255) | 0;
        data[i] = (255 << 24) | (v << 16) | (v << 8) | v;
      }
      this.snowCtx.putImageData(this.snowImage, 0, 0);
      g.globalAlpha = snowAmount;
      g.imageSmoothingEnabled = false;
      g.drawImage(this.snow, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    // warming up / switching off
    if (this.power && this.warm < 1) {
      g.fillStyle = `rgba(0,0,0,${(1 - this.warm).toFixed(3)})`;
      g.fillRect(0, 0, W, H);
      if (this.warm < 0.25) {
        g.fillStyle = `rgba(230,240,255,${(0.25 - this.warm) * 2})`;
        g.fillRect(0, 0, W, H);
      }
    }
    if (!this.power) {
      // the picture collapses into a line, then a dot
      const k = this.offAnim;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      const lineH = Math.max(2, H * (1 - k * 3));
      const lineW = k < 0.35 ? W : W * Math.max(0.01, 1 - (k - 0.35) * 2.2);
      g.fillStyle = `rgba(235,242,255,${Math.max(0, 1 - k * 1.1).toFixed(3)})`;
      g.fillRect((W - lineW) / 2, (H - lineH) / 2, lineW, lineH);
    }

    this.mirror(true);
    this.glow(item, q);
  }

  /** The little screen in the room shows the same picture. */
  private mirror(on: boolean): void {
    const rc = this.roomCanvas;
    if (!rc) return;
    const c = rc.getContext('2d')!;
    if (!on) {
      c.clearRect(0, 0, rc.width, rc.height);
      return;
    }
    c.drawImage(this.screen, 0, 0, rc.width, rc.height);
  }

  /** The screen's light on the walls: each picture has its own color and brightness. */
  private glow(item: Scheduled<TvSegment> | undefined, q: number): void {
    if (!this.power) {
      light.crt = 0;
      return;
    }
    const hasChannel = this.channels.has(this.channel);
    const scene = !hasChannel || !item ? 'snow' : item.seg.kind === 'scene' ? item.seg.scene : item.seg.kind;
    const [r, g, b, level] = GLOW[scene] ?? GLOW.snow;
    const snow = hasChannel ? 1 - q : 1;
    light.crt = clamp(level * (1 - snow) + GLOW.snow[3] * snow, 0, 1) * this.warm * (0.9 + Math.random() * 0.1);
    light.crtColor = [Math.round(r * (1 - snow) + 170 * snow), Math.round(g * (1 - snow) + 180 * snow), Math.round(b * (1 - snow) + 205 * snow)];
  }
}
