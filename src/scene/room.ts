// The room: layered drawing, gentle parallax, clickable things, and the
// "lean in" zoom that opens a close-up.

import { wallSvg, floorSvg, phoneSvg, bedSvg, ROOM } from '../art/room';
import { CityView } from './cityview';
import { stage } from './stage';
import { onTick } from '../world/loop';
import type { CloseupId } from '../world/bus';

type HotId = CloseupId | 'switch';

interface Layer {
  el: HTMLElement;
  depth: number;
}

class RoomScene {
  readonly el: HTMLElement;
  readonly city: CityView;
  readonly wall: SVGSVGElement;
  readonly phoneLayer: SVGSVGElement;
  readonly tvCanvas: HTMLCanvasElement;
  private layers: Layer[] = [];
  private handlers = new Map<HotId, () => void>();
  private target = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };
  private zoomed = false;
  private hideTimer = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'room';

    // far: the city, framed by the window hole in the wall
    const view = this.layer('l-view', 0.25);
    this.city = new CityView('room', { simple: true, rainResolution: 360 });
    const pad = 28;
    Object.assign(this.city.el.style, {
      left: `${30 + ROOM.window.x - pad}px`,
      top: `${30 + ROOM.window.y - pad}px`,
      width: `${ROOM.window.w + pad * 2}px`,
      height: `${ROOM.window.h + pad * 2}px`,
    });
    view.el.appendChild(this.city.el);

    const floor = this.layer('l-floor', 0.8);
    floor.el.innerHTML = floorSvg();

    const wall = this.layer('l-wall', 0.8);
    wall.el.innerHTML = wallSvg();
    this.wall = wall.el.querySelector('svg')!;

    // the TV picture is a canvas laid over the drawn screen
    this.tvCanvas = document.createElement('canvas');
    this.tvCanvas.className = 'screen-canvas';
    this.tvCanvas.width = 276;
    this.tvCanvas.height = 224;
    Object.assign(this.tvCanvas.style, {
      left: `${30 + ROOM.tvScreen.x}px`,
      top: `${30 + ROOM.tvScreen.y}px`,
      width: `${ROOM.tvScreen.w}px`,
      height: `${ROOM.tvScreen.h}px`,
    });
    wall.el.appendChild(this.tvCanvas);

    const phone = this.layer('l-phone', 1.25);
    phone.el.innerHTML = phoneSvg();
    this.phoneLayer = phone.el.querySelector('svg')!;

    const bed = this.layer('l-bed', 2.2);
    bed.el.innerHTML = bedSvg();

    for (const svg of this.el.querySelectorAll('svg')) {
      svg.addEventListener('click', (e) => {
        const hot = (e.target as Element).closest<SVGElement>('.hot');
        const id = hot?.dataset.hot as HotId | undefined;
        if (id && !this.zoomed) this.handlers.get(id)?.();
      });
    }

    window.addEventListener('pointermove', (e) => {
      const p = stage.toLocal(e.clientX, e.clientY);
      this.target.x = (p.x / 1600 - 0.5) * 2;
      this.target.y = (p.y / 900 - 0.5) * 2;
    });

    onTick((dt, t) => {
      if (this.zoomed) return;
      const k = 1 - Math.exp(-dt * 3);
      this.current.x += (this.target.x - this.current.x) * k;
      this.current.y += (this.target.y - this.current.y) * k;
      for (const layer of this.layers) {
        const dx = -this.current.x * 9 * layer.depth;
        const dy = -this.current.y * 5 * layer.depth;
        layer.el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }
      if (!this.zoomed) this.city.update(dt, t);
    });
  }

  private layer(id: string, depth: number): Layer {
    const el = document.createElement('div');
    el.className = 'layer';
    el.id = id;
    this.el.appendChild(el);
    const layer = { el, depth };
    this.layers.push(layer);
    return layer;
  }

  onHot(id: HotId, handler: () => void): void {
    this.handlers.set(id, handler);
  }

  /** Lean in toward a spot of the room (stage coordinates). */
  zoomTo(rect: { x: number; y: number; w: number; h: number }): void {
    this.zoomed = true;
    // once the close-up covers the stage, stop drawing the room behind it
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.zoomed && (this.el.style.visibility = 'hidden'), 750);
    const scale = Math.min(3.2, Math.min(1600 / rect.w, 900 / rect.h) * 0.8);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const tx = (800 - cx) * scale;
    const ty = (450 - cy) * scale;
    this.el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    this.el.classList.add('away');
  }

  zoomOut(): void {
    this.zoomed = false;
    clearTimeout(this.hideTimer);
    this.el.style.visibility = '';
    this.el.style.transform = '';
    this.el.classList.remove('away');
  }

  get isZoomed(): boolean {
    return this.zoomed;
  }
}

export type { RoomScene };

let instance: RoomScene | null = null;

export function room(): RoomScene {
  if (!instance) instance = new RoomScene();
  return instance;
}
