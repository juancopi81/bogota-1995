// A live view of the city: the drawing plus drifting clouds, rain, traffic
// and dusk. The room's little window and the window close-up each own one,
// and both are driven by the world clock so they always agree.

import { citySvg } from '../art/city';
import { daylight } from '../world/clock';
import { vehiclesAt, vehicleX, type Vehicle } from '../world/street';
import { mulberry32 } from '../util/rng';
import { setAttr } from '../ui/dom';

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
  private trafficLayer: SVGGElement;
  private shown = new Map<number, SVGGElement>();
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
    this.trafficLayer = document.createElementNS(SVG_NS, 'g');
    trafficSvg.appendChild(this.trafficLayer);
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
        g = vehicleGroup(v, 1 - daylight(t));
        this.trafficLayer.appendChild(g);
        this.shown.set(v.id, g);
      }
      const y = v.dir === 1 ? 842 : 796;
      setAttr(g, 'transform', `translate(${vehicleX(v, t).toFixed(1)} ${y})`);
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

/** A buseta, a yellow taxi or a car, in profile, drawn at the origin. */
function vehicleGroup(v: Vehicle, dark: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  // at dusk everything outside goes blue-gray, and the headlights come on
  const night = (hex: string) => mixNight(hex, dark * 0.7);
  const flip = v.dir === -1 ? ' transform="scale(-1 1) translate(-230 0)"' : '';
  if (v.kind === 'buseta') {
    const [body, band, line, nose] = v.colors.map(night);
    const [where, way = ''] = (v.route ?? '').split(' · ');
    // lettering stays readable when the bus drives the other way
    const unflip = (cx: number) => (flip ? ` transform="translate(${cx * 2} 0) scale(-1 1)"` : '');
    g.innerHTML = `<g${flip}>
      <rect x="4" y="-78" width="222" height="70" rx="10" fill="${body}"/>
      <path d="M196 -44 H 216 Q 226 -44 226 -34 V -14 Q 226 -8 220 -8 H 196Z" fill="${nose}"/>
      <rect x="4" y="-42" width="200" height="13" fill="${band}"/>
      <rect x="4" y="-27" width="222" height="2.5" fill="${line}"/>
      ${[20, 62, 104, 146].map((x) => `<rect x="${x}" y="-70" width="34" height="24" rx="3" fill="#39434a"/>`).join('')}
      <path d="M188 -70 H214 Q222 -70 222 -58 V-46 H188Z" fill="#48545c"/>
      <rect x="189" y="-68" width="31" height="13" fill="#f3efe2"/>
      <g${unflip(204.5)}>
        <text x="204.5" y="-62.4" font-size="4.4" text-anchor="middle" font-family="Anton, sans-serif" fill="#b3261e">${where}</text>
        <text x="204.5" y="-57" font-size="3.8" text-anchor="middle" font-family="Anton, sans-serif" fill="#1f3f7a">${way}</text>
      </g>
      <rect x="200" y="-10" width="30" height="6" fill="#2a2a2a"/>
      <circle cx="46" cy="-8" r="14" fill="#1d1f21"/><circle cx="46" cy="-8" r="6" fill="#7b7f83"/>
      <circle cx="182" cy="-8" r="14" fill="#1d1f21"/><circle cx="182" cy="-8" r="6" fill="#7b7f83"/>
      <rect x="224" y="-22" width="6" height="6" fill="#ffd27a"/>
      ${dark > 0.3 ? `<ellipse cx="262" cy="-16" rx="40" ry="9" fill="#ffe2a0" opacity="${(0.25 * dark).toFixed(2)}"/>` : ''}
    </g>`;
  } else {
    const color = night(v.colors[0]);
    const w = v.kind === 'taxi' ? 130 : 140;
    g.innerHTML = `<g${flip ? ` transform="scale(-1 1) translate(-${w} 0)"` : ''}>
      <path d="M6 -14 Q4 -34 22 -36 L 40 -54 Q 46 -60 58 -60 H 88 Q 98 -60 104 -52 L 116 -36 Q ${w - 4} -34 ${w - 4} -14Z" fill="${color}"/>
      <path d="M46 -52 H 64 V -38 H 34Z M70 -52 H 92 L 104 -38 H 70Z" fill="#39434a"/>
      ${v.kind === 'taxi' ? `<rect x="58" y="-66" width="20" height="7" fill="#f4e7a1"/><path d="M8 -26 H ${w - 6}" stroke="#222" stroke-width="3" stroke-dasharray="6 6"/>` : ''}
      <circle cx="32" cy="-12" r="11" fill="#1d1f21"/><circle cx="32" cy="-12" r="4" fill="#8a8e92"/>
      <circle cx="${w - 30}" cy="-12" r="11" fill="#1d1f21"/><circle cx="${w - 30}" cy="-12" r="4" fill="#8a8e92"/>
      <rect x="${w - 8}" y="-28" width="5" height="5" fill="#ffd27a"/>
      ${dark > 0.3 ? `<ellipse cx="${w + 30}" cy="-24" rx="34" ry="8" fill="#ffe2a0" opacity="${(0.25 * dark).toFixed(2)}"/>` : ''}
    </g>`;
  }
  return g;
}

function mixNight(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, t: number) => Math.round(c + (t - c) * k);
  const r = mix((n >> 16) & 255, 20);
  const g = mix((n >> 8) & 255, 28);
  const b = mix(n & 255, 48);
  return `rgb(${r},${g},${b})`;
}
