// A live view of the city: the drawing plus drifting clouds, rain, traffic
// and dusk. The room's little window and the window close-up each own one,
// and both are driven by the world clock so they always agree.

import { citySvg } from '../art/city';
import { recicladorSvg, vehicleSvg, walkerSvg } from '../art/sprites';
import { daylight } from '../world/clock';
import { VEHICLE_LEN, vehiclesAt, vehicleX } from '../world/street';
import { walkerFacing, walkerMoving, walkersAt, walkerX } from '../world/life';
import { mulberry32 } from '../util/rng';
import { setAttr } from '../ui/dom';

/** The far sidewalk, where people walk (their feet), and the two lanes (the road under the wheels). */
const SIDEWALK_Y = 739;
const LANE_Y = { 1: 842, [-1]: 796 } as const;

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Cloud {
  el: HTMLElement;
  x0: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export class CityView {
  readonly el: HTMLElement;
  private svg: SVGSVGElement;
  /** People on the far sidewalk, then the far lane, then the near lane: back to front. */
  private layers: { life: SVGGElement; far: SVGGElement; near: SVGGElement };
  private shown = new Map<number, SVGGElement>();
  private people = new Map<number, { g: SVGGElement; facing: SVGGElement; legs: SVGGElement[]; arm: SVGGElement | null; key: string }>();
  private clouds: Cloud[] = [];
  private rain: HTMLCanvasElement;
  private drops: Drop[] = [];
  private windows: { el: SVGRectElement; th: number; lit: boolean }[] = [];
  private lampGlows: SVGElement[];
  private lampPools: SVGElement[];
  private night: SVGElement;
  private monsLights: SVGElement;
  private lastDusk = -1;
  private width: number;
  private height: number;
  private readonly ownRain: boolean;

  constructor(
    id: string,
    opts: { simple?: boolean; rainResolution?: number; externalRain?: boolean } = {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'city';
    this.el.innerHTML = citySvg({ id, simple: opts.simple });
    this.svg = this.el.querySelector('svg')!;
    // passing vehicles live in their own layer so they don't repaint the whole city
    const trafficSvg = document.createElementNS(SVG_NS, 'svg');
    trafficSvg.setAttribute('viewBox', '0 0 1600 900');
    trafficSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    trafficSvg.classList.add('city-traffic');
    const layer = () => trafficSvg.appendChild(document.createElementNS(SVG_NS, 'g'));
    this.layers = { life: layer(), far: layer(), near: layer() };
    this.el.appendChild(trafficSvg);
    this.night = this.svg.querySelector('.night')!;
    this.monsLights = this.svg.querySelector('.mons-lights')!;
    this.lampGlows = [...this.svg.querySelectorAll<SVGElement>('.lamp-glow')];
    this.lampPools = [...this.svg.querySelectorAll<SVGElement>('.lamp-pool')];
    this.windows = [...this.svg.querySelectorAll<SVGRectElement>('.win')].map((el) => ({
      el,
      th: Number(el.dataset.th ?? 0.5),
      lit: false,
    }));

    // clouds drifting across the cerros
    const rng = mulberry32(id.length * 97 + 5);
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'cloud';
      const cloud: Cloud = {
        el,
        x0: rng() * 1.4 - 0.2,
        y: 0.18 + rng() * 0.28,
        w: 0.22 + rng() * 0.3,
        h: 0.06 + rng() * 0.08,
        speed: 0.004 + rng() * 0.006,
      };
      this.clouds.push(cloud);
      this.el.appendChild(el);
    }

    // rain streaks in front of everything (unless the owner draws them on its own glass layer)
    this.rain = document.createElement('canvas');
    const res = opts.rainResolution ?? 480;
    this.rain.width = res;
    this.rain.height = Math.round((res * 9) / 16);
    this.ownRain = !opts.externalRain;
    if (this.ownRain) this.el.appendChild(this.rain);
    const r2 = mulberry32(7);
    for (let i = 0; i < 170; i++) {
      this.drops.push({ x: r2(), y: r2(), len: 0.02 + r2() * 0.03, speed: 0.9 + r2() * 0.6 });
    }
    this.width = 1600;
    this.height = 900;
  }

  update(dt: number, t: number): void {
    this.updateDusk(t);
    this.updateClouds(t);
    this.updateTraffic(t);
    this.updateLife(t);
    if (this.ownRain) this.updateRain(dt);
  }

  /** Draw the falling rain onto someone else's canvas (the window's glass layer). */
  drawRain(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(222, 230, 236, 0.3)';
    ctx.lineWidth = Math.max(1, w / 800);
    ctx.beginPath();
    for (const d of this.drops) {
      d.y += d.speed * dt * 1.2;
      d.x += d.speed * dt * 0.08;
      if (d.y > 1.05) {
        d.y = -0.05;
        d.x = Math.random();
      }
      if (d.x > 1) d.x -= 1;
      const x = d.x * w;
      const y = d.y * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + d.len * w * 0.08, y + d.len * h * 1.8);
    }
    ctx.stroke();
  }

  private updateDusk(t: number): void {
    const dark = 1 - daylight(t);
    if (Math.abs(dark - this.lastDusk) < 0.004) return;
    this.lastDusk = dark;
    setAttr(this.night, 'opacity', (dark * 0.72).toFixed(3));
    for (const w of this.windows) {
      const lit = dark > w.th;
      if (lit !== w.lit) {
        w.lit = lit;
        setAttr(w.el, 'opacity', lit ? '0.92' : '0');
      }
    }
    // sodium lamps warm up slowly, pink first
    const lamp = Math.max(0, Math.min(1, (dark - 0.35) / 0.35));
    for (const g of this.lampGlows) setAttr(g, 'opacity', (lamp * 0.9).toFixed(3));
    for (const g of this.lampPools) setAttr(g, 'opacity', (lamp * 0.22).toFixed(3));
    setAttr(this.monsLights, 'opacity', Math.max(0, Math.min(1, (dark - 0.55) / 0.25)).toFixed(3));
  }

  private updateClouds(t: number): void {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    const dark = 1 - daylight(t);
    for (const c of this.clouds) {
      const x = ((((c.x0 + c.speed * t * 0.1) % 1.6) + 1.6) % 1.6) - 0.3;
      c.el.style.width = `${c.w * w}px`;
      c.el.style.height = `${c.h * h}px`;
      c.el.style.transform = `translate(${x * w}px, ${c.y * h}px)`;
      c.el.style.opacity = String(0.7 - dark * 0.45);
    }
  }

  private updateTraffic(t: number): void {
    const now = vehiclesAt(t);
    const keep = new Set(now.map((v) => v.id));
    for (const [id, g] of this.shown) {
      if (!keep.has(id)) {
        g.remove();
        this.shown.delete(id);
      }
    }
    for (const v of now) {
      let g = this.shown.get(v.id);
      if (!g) {
        g = document.createElementNS(SVG_NS, 'g');
        g.innerHTML = vehicleSvg(v, VEHICLE_LEN[v.kind], 1 - daylight(t));
        (v.dir === 1 ? this.layers.near : this.layers.far).appendChild(g);
        this.shown.set(v.id, g);
      }
      setAttr(g, 'transform', `translate(${vehicleX(v, t).toFixed(1)} ${LANE_Y[v.dir]})`);
    }
  }

  /** People on the far sidewalk: walking (two strides and a bob), standing, flagging a buseta. */
  private updateLife(t: number): void {
    const now = walkersAt(t).filter((w) => {
      const x = walkerX(w, t);
      return x > -160 && x < 1760;
    });
    const keep = new Set(now.map((w) => w.id));
    for (const [id, p] of this.people) {
      if (!keep.has(id)) {
        p.g.remove();
        this.people.delete(id);
      }
    }
    for (const w of now) {
      let p = this.people.get(w.id);
      if (!p) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.innerHTML = w.kind === 'reciclador' ? recicladorSvg(1 - daylight(t)) : walkerSvg(w, 1 - daylight(t));
        this.layers.life.appendChild(g);
        p = {
          g,
          facing: g.querySelector<SVGGElement>('.facing')!,
          legs: ['.legs-a', '.legs-b', '.legs-stand'].map((sel) => g.querySelector<SVGGElement>(sel)!),
          arm: g.querySelector<SVGGElement>('.arm-up'),
          key: '',
        };
        this.people.set(w.id, p);
      }
      const moving = walkerMoving(w, t);
      const pace = w.kind === 'runner' ? 5 : w.kind === 'reciclador' ? 2.2 : 3.2;
      const stride = moving ? Math.floor(t * pace) % 2 : 2;
      const facing = walkerFacing(w, t);
      const flag = !!w.flag && t >= w.flag[0] && t <= w.flag[1];
      const bob = moving ? -Math.abs(Math.sin(t * Math.PI * pace)) * 1.6 : 0;
      setAttr(p.g, 'transform', `translate(${walkerX(w, t).toFixed(1)} ${(SIDEWALK_Y + bob).toFixed(1)})`);
      const key = `${stride}|${facing}|${flag}`;
      if (key !== p.key) {
        p.key = key;
        p.legs.forEach((g, i) => (g.style.display = i === stride ? '' : 'none'));
        setAttr(p.facing, 'transform', facing === 1 ? '' : 'scale(-1 1)');
        if (p.arm) p.arm.style.display = flag ? '' : 'none';
      }
    }
  }

  private updateRain(dt: number): void {
    const ctx = this.rain.getContext('2d')!;
    const w = this.rain.width;
    const h = this.rain.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(222, 230, 236, 0.32)';
    ctx.lineWidth = Math.max(1, w / 800);
    ctx.beginPath();
    for (const d of this.drops) {
      d.y += d.speed * dt * 1.2;
      d.x += d.speed * dt * 0.08;
      if (d.y > 1.05) {
        d.y = -0.05;
        d.x = Math.random();
      }
      if (d.x > 1) d.x -= 1;
      const x = d.x * w;
      const y = d.y * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + d.len * w * 0.08, y + d.len * h * 1.8);
    }
    ctx.stroke();
  }

  get size(): { w: number; h: number } {
    return { w: this.width, h: this.height };
  }
}
