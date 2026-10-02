// The window up close: the city behind wet glass. Wipe the fog with your
// hand, open the sliding pane and let the street in.

import { CityView } from '../scene/cityview';
import { Street } from './street';
import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';
import { stage } from '../scene/stage';
import { P } from '../art/palette';
import { bus } from '../world/bus';
import { mulberry32 } from '../util/rng';
import { setAttr, toggleClass } from '../ui/dom';
import { daylight } from '../world/clock';
import { GlassRain, dropSprite } from '../scene/glassrain';

const OPEN = { x: 140, y: 40, w: 1320, h: 720 };
const TRANSOM = 214; // height of the fixed top band
const MID = OPEN.x + OPEN.w / 2;

export class WindowView {
  readonly el: HTMLElement;
  readonly street: Street;
  private readonly city: CityView;
  private readonly fog: HTMLCanvasElement;
  private readonly fogCtx: CanvasRenderingContext2D;
  /** Where your hand has wiped the glass (the fog creeps back as this fades). */
  private readonly wiped: HTMLCanvasElement;
  private readonly wipedCtx: CanvasRenderingContext2D;
  private readonly drops: HTMLCanvasElement;
  private readonly dropsCtx: CanvasRenderingContext2D;
  /** The wet trails the running drops leave, fading as the glass dries. */
  private readonly trails: HTMLCanvasElement;
  private readonly trailsCtx: CanvasRenderingContext2D;
  private readonly rain: GlassRain;
  private readonly pane: SVGGElement;
  private open = false;
  private paneX = 0;
  private sliding = false;
  private roomPane: SVGElement | null = null;
  private roomCurtain: SVGElement | null = null;
  private sprite: HTMLCanvasElement | null = null;
  private spriteDay = -1;
  private frame = 0;

  constructor(private readonly engine: AudioEngine) {
    this.street = new Street(engine);

    this.el = document.createElement('div');
    this.el.className = 'closeup';
    this.el.id = 'cu-window';

    this.city = new CityView('window', { externalRain: true });
    Object.assign(this.city.el.style, { left: `${OPEN.x}px`, top: `${OPEN.y}px`, width: `${OPEN.w}px`, height: `${OPEN.h}px` });
    this.el.appendChild(this.city.el);

    // raindrops on the outside of the glass, fog on the inside
    this.drops = document.createElement('canvas');
    this.drops.className = 'glass-layer';
    this.drops.width = OPEN.w / 2;
    this.drops.height = OPEN.h / 2;
    this.dropsCtx = this.drops.getContext('2d')!;
    this.fog = document.createElement('canvas');
    this.fog.className = 'glass-layer fog';
    this.fog.width = OPEN.w / 2;
    this.fog.height = OPEN.h / 2;
    this.fogCtx = this.fog.getContext('2d')!;
    this.wiped = document.createElement('canvas');
    this.wiped.width = this.fog.width;
    this.wiped.height = this.fog.height;
    this.wipedCtx = this.wiped.getContext('2d')!;
    for (const c of [this.drops, this.fog]) {
      Object.assign(c.style, { left: `${OPEN.x}px`, top: `${OPEN.y}px`, width: `${OPEN.w}px`, height: `${OPEN.h}px` });
      this.el.appendChild(c);
    }
    this.initFog();
    this.trails = document.createElement('canvas');
    this.trails.width = this.drops.width;
    this.trails.height = this.drops.height;
    this.trailsCtx = this.trails.getContext('2d')!;
    this.rain = new GlassRain(this.drops.width, this.drops.height, mulberry32(28));

    // the frame, curtains and sill drawn over it; the sliding pane is its own layer
    const frame = document.createElement('div');
    frame.className = 'fill';
    frame.innerHTML = frameSvg();
    this.el.appendChild(frame);
    this.pane = frame.querySelector<SVGGElement>('#w-pane')!;

    this.wire(frame);
  }

  bindRoom(roomWall: SVGSVGElement): void {
    this.roomPane = roomWall.querySelector('.pane-right');
    this.roomCurtain = roomWall.querySelector('.curtain-right');
  }

  /** The fog the glass settles back to: light at the top, heavier at the bottom, never hiding the street. */
  private initFog(): void {
    this.composeFog();
  }

  private composeFog(): void {
    const c = this.fogCtx;
    const { width: w, height: h } = this.fog;
    c.clearRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(226,231,233,0.3)');
    g.addColorStop(1, 'rgba(226,231,233,0.62)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.drawImage(this.wiped, 0, 0);
    c.restore();
    // where the pane has slid away there's no glass to fog up
    const clearX = this.glassFreeFrom();
    if (clearX < w) c.clearRect(clearX, TRANSOM / 2, w - clearX, h);
  }

  /** Where the open window begins, in glass-canvas units (the full width when it's shut). */
  private glassFreeFrom(): number {
    if (!this.open && this.paneX > -5) return this.fog.width;
    const openFrom = MID - OPEN.x + this.paneX;
    return (openFrom + OPEN.w / 2 - 20) / 2;
  }

  /** Whether a point on the glass canvas has glass in front of it. */
  private onGlass(x: number, y: number): boolean {
    return y < TRANSOM / 2 || x < this.glassFreeFrom();
  }

  private wire(frame: HTMLElement): void {
    // wiping the fog with the side of your hand
    let wiping = false;
    let last: { x: number; y: number } | null = null;
    const wipe = (e: PointerEvent) => {
      const p = stage.toLocal(e.clientX, e.clientY);
      const x = (p.x - OPEN.x) / 2;
      const y = (p.y - OPEN.y) / 2;
      const c = this.wipedCtx;
      const from = last ?? { x, y };
      const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 6));
      c.save();
      for (let i = 1; i <= steps; i++) {
        const px = from.x + ((x - from.x) * i) / steps;
        const py = from.y + ((y - from.y) * i) / steps;
        // nothing to wipe where the window is open
        if (!this.onGlass(px, py)) continue;
        const g = c.createRadialGradient(px, py, 4, px, py, 22);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(px - 22, py - 22, 44, 44);
      }
      c.restore();
      this.composeFog();
      last = { x, y };
    };
    this.el.addEventListener('pointerdown', (e) => {
      const target = e.target as Element;
      if (target.closest('#w-latch')) return;
      const p = stage.toLocal(e.clientX, e.clientY);
      if (p.x < OPEN.x || p.x > OPEN.x + OPEN.w || p.y < OPEN.y || p.y > OPEN.y + OPEN.h) return;
      wiping = true;
      last = null;
      this.el.setPointerCapture(e.pointerId);
      wipe(e);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (wiping) wipe(e);
      // the hand that wipes only shows over the glass
      const p = stage.toLocal(e.clientX, e.clientY);
      toggleClass(this.el, 'no-glass', !this.onGlass((p.x - OPEN.x) / 2, (p.y - OPEN.y) / 2));
    });
    this.el.addEventListener('pointerup', () => {
      wiping = false;
      last = null;
    });

    frame.querySelector('#w-latch')!.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.setOpen(!this.open);
    });
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.street.setOpen(open);
    play(this.engine.ctx, sfx.knock(this.engine.ctx), this.engine.channel('window').input, { gain: 0.5, rate: 1.4 });
    toggleClass(this.el, 'opened', open);
    bus.emit('window:open', { open });
  }

  tick(dt: number, t: number): void {
    this.street.tick(t);
    const visible = this.el.classList.contains('open');
    if (visible) this.city.update(dt, t);

    // the pane slides (in the close-up and in the room)
    const target = this.open ? -(OPEN.w / 2 - 20) : 0;
    this.sliding = Math.abs(target - this.paneX) > 0.5;
    this.paneX += (target - this.paneX) * Math.min(1, dt * 5);
    setAttr(this.pane, 'transform', `translate(${this.paneX.toFixed(1)} 0)`);
    const roomShift = (this.paneX / (OPEN.w / 2 - 20)) * 210;
    setAttr(this.roomPane, 'transform', `translate(${roomShift.toFixed(1)} 0)`);
    toggleClass(this.roomCurtain, 'breeze', this.open);

    if (!visible) return;
    this.drawGlass(dt, t);
  }

  private drawGlass(dt: number, t: number): void {
    const w = this.drops.width;
    const h = this.drops.height;
    const clearX = this.glassFreeFrom();

    // fog creeps back slowly as the wiped patches fade (not where the window is open)
    if (++this.frame % 8 === 0) {
      const wc = this.wipedCtx;
      wc.save();
      wc.globalCompositeOperation = 'destination-out';
      wc.fillStyle = 'rgba(0,0,0,0.04)';
      wc.fillRect(0, 0, w, h);
      wc.restore();
      this.composeFog();
    } else if (this.sliding) {
      // the open part follows the pane as it slides
      this.composeFog();
    }

    // the rain on the outside of the glass: drops sit, merge, and the heavy ones run down
    const tc = this.trailsCtx;
    if (this.frame % 8 === 4) {
      tc.save();
      tc.globalCompositeOperation = 'destination-out';
      tc.fillStyle = 'rgba(0,0,0,0.05)';
      tc.fillRect(0, 0, w, h);
      tc.restore();
    }
    // the wet trails catch the daylight; at dusk they barely show
    const day = daylight(t);
    tc.lineCap = 'round';
    tc.strokeStyle = `rgba(214,224,232,${(0.05 + 0.11 * day).toFixed(3)})`;
    this.rain.step(Math.min(dt, 0.05), (x, y) => this.onGlass(x, y), (x0, y0, x1, y1, r) => {
      tc.lineWidth = r * 0.9;
      tc.beginPath();
      tc.moveTo(x0, y0);
      tc.lineTo(x1, y1);
      tc.stroke();
    });
    if (clearX < w) tc.clearRect(clearX, TRANSOM / 2, w - clearX, h);

    // the sky in the drops dims at dusk
    if (!this.sprite || Math.abs(day - this.spriteDay) > 0.03) {
      this.sprite = dropSprite(day);
      this.spriteDay = day;
    }

    const d = this.dropsCtx;
    d.clearRect(0, 0, w, h);
    // the rain falling outside, then the trails and the drops on the glass
    this.city.drawRain(d, dt, w, h);
    d.drawImage(this.trails, 0, 0);
    for (const drop of this.rain.drops) {
      const stretch = drop.running && drop.caught <= 0 ? 1 + Math.min(0.45, drop.vy / 70) : 1;
      const dw = drop.r * 2.2;
      const dh = drop.r * 2.4 * stretch;
      d.drawImage(this.sprite, drop.x - dw / 2, drop.y - dh * 0.6, dw, dh);
    }
  }
}

function curtain(x: number, w: number): string {
  let s = `<rect x="${x}" y="0" width="${w}" height="840" fill="${P.curtain}"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${x + 8 + i * (w / 6)} 0 C ${x + 20 + i * (w / 6)} 300 ${x + i * (w / 6)} 600 ${x + 12 + i * (w / 6)} 840" stroke="${P.curtainDark}" stroke-width="${8 + (i % 3) * 3}" fill="none" opacity="0.5"/>`;
  return s;
}

function frameSvg(): string {
  const f = P.frame;
  const lowerY = OPEN.y + TRANSOM;
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" fill="${P.wall}" d="M0 0H1600V900H0Z M${OPEN.x} ${OPEN.y}V${OPEN.y + OPEN.h}H${OPEN.x + OPEN.w}V${OPEN.y}Z"/>
  <rect x="${OPEN.x - 22}" y="${OPEN.y - 22}" width="${OPEN.w + 44}" height="${OPEN.h + 44}" fill="none" stroke="${f}" stroke-width="30"/>
  <rect x="${OPEN.x}" y="${lowerY - 12}" width="${OPEN.w}" height="24" fill="${f}"/>
  <!-- the fixed left pane's frame -->
  <rect x="${MID - 14}" y="${lowerY}" width="18" height="${OPEN.h - TRANSOM}" fill="${f}"/>
  <!-- the sliding right pane -->
  <g id="w-pane">
    <rect x="${MID + 4}" y="${lowerY + 10}" width="${OPEN.w / 2 - 4}" height="${OPEN.h - TRANSOM - 10}" fill="#dfe8ee" opacity="0.06"/>
    <rect x="${MID + 4}" y="${lowerY}" width="16" height="${OPEN.h - TRANSOM}" fill="${f}"/>
    <rect x="${OPEN.x + OPEN.w - 14}" y="${lowerY}" width="14" height="${OPEN.h - TRANSOM}" fill="${f}"/>
    <g id="w-latch" class="grab">
      <rect x="${MID + 22}" y="${lowerY + 190}" width="22" height="90" rx="6" fill="#9b978d"/>
      <rect x="${MID + 27}" y="${lowerY + 200}" width="12" height="70" rx="4" fill="#bdb8ad"/>
      <rect x="${MID + 10}" y="${lowerY + 150}" width="60" height="170" fill="transparent"/>
    </g>
  </g>
  <!-- the sill with the sábila -->
  <rect x="${OPEN.x - 40}" y="${OPEN.y + OPEN.h + 14}" width="${OPEN.w + 80}" height="30" fill="#d8d1c3"/>
  <rect x="${OPEN.x - 40}" y="${OPEN.y + OPEN.h + 42}" width="${OPEN.w + 80}" height="10" fill="#b9b1a1"/>
  <g transform="translate(${OPEN.x + 60} ${OPEN.y + OPEN.h - 110}) scale(2.6)">
    <path d="M6 40 L10 24 H38 L42 40Z" fill="#a6553a"/>
    <rect x="8" y="20" width="32" height="6" fill="#8e452e"/>
    <path d="M24 22 C 18 6 10 -6 2 -14 C 14 -6 22 4 26 20Z" fill="#6e8f5c"/>
    <path d="M24 22 C 26 2 30 -10 40 -22 C 34 -6 30 8 28 22Z" fill="#7b9b66"/>
    <path d="M22 22 C 14 14 6 12 -4 12 C 8 8 16 12 24 20Z" fill="#62824f"/>
    <path d="M26 22 C 34 12 42 10 52 10 C 42 14 34 18 28 22Z" fill="#6e8f5c"/>
  </g>
  <g class="w-curtain-l">${curtain(-40, 170)}</g>
  <g class="w-curtain-r">${curtain(1470, 170)}</g>
</svg>`;
}
