// The stage: a fixed 1600×900 world, scaled to fit the window (letterboxed).
// Every layer, canvas and control uses these stage coordinates.

export const STAGE_W = 1600;
export const STAGE_H = 900;

class Stage {
  readonly viewport: HTMLElement;
  readonly el: HTMLElement;
  scale = 1;

  constructor() {
    this.viewport = document.createElement('div');
    this.viewport.id = 'viewport';
    this.el = document.createElement('div');
    this.el.id = 'stage';
    this.viewport.appendChild(this.el);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.viewport);
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.scale = Math.min(w / STAGE_W, h / STAGE_H);
      const x = (w - STAGE_W * this.scale) / 2;
      const y = (h - STAGE_H * this.scale) / 2;
      this.el.style.transform = `translate(${x}px, ${y}px) scale(${this.scale})`;
    };
    fit();
    window.addEventListener('resize', fit);
  }

  /** Convert a pointer position to stage coordinates. */
  toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: (clientX - r.left) / this.scale, y: (clientY - r.top) / this.scale };
  }

  /** Convert a pointer position to coordinates local to an element inside the stage. */
  toElement(el: Element, clientX: number, clientY: number, viewW: number, viewH: number): { x: number; y: number } {
    const r = el.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * viewW, y: ((clientY - r.top) / r.height) * viewH };
  }
}

export const stage = new Stage();
