// Light: the gray afternoon fading to night, the ceiling bulb, and the TV's
// blue glow on the walls. Overlays on top of the room and every close-up.

import { daylight } from '../world/clock';
import { onTick } from '../world/loop';
import { bus } from '../world/bus';
import { kv } from '../world/store';

export interface LightState {
  bulb: boolean;
  /** 0–1 brightness of the TV picture, and its average color. */
  crt: number;
  crtColor: [number, number, number];
}

export const light: LightState = { bulb: false, crt: 0, crtColor: [150, 180, 220] };

interface OverlaySet {
  dusk: HTMLElement;
  bulb: HTMLElement;
  crt: HTMLElement;
  /** Where the TV is in this view (stage coords) for the glow's center. */
  tvAt: { x: number; y: number };
  /** How strongly the TV glow reaches this view. */
  crtReach: number;
  /** Skipped while hidden; refreshed when shown again. */
  stale?: boolean;
}

/** Close-ups are hidden with a class; the room with an inline style. */
function getComputedVisibility(el: HTMLElement): string {
  if (el.classList.contains('closeup')) return el.classList.contains('open') ? 'visible' : 'hidden';
  return el.style.visibility === 'hidden' ? 'hidden' : 'visible';
}

const sets: OverlaySet[] = [];

export function addLightOverlays(parent: HTMLElement, tvAt: { x: number; y: number }, crtReach = 1): void {
  const make = (cls: string) => {
    const el = document.createElement('div');
    el.className = `light ${cls}`;
    parent.appendChild(el);
    return el;
  };
  // the room gets a vignette; close-ups are framed enough already
  if (crtReach >= 1) make('vignette').style.zIndex = '1';
  const crt = make('crt');
  // only the room gets a true "light" blend for the TV glow; close-ups get a tint
  if (crtReach >= 1) crt.classList.add('room-glow');
  sets.push({ dusk: make('dusk'), bulb: make('bulb'), crt, tvAt, crtReach });
}

export function setBulb(on: boolean): void {
  light.bulb = on;
  kv.set('bulb', on);
  bus.emit('light:bulb', { on });
}

let last = '';
let frame = 0;
let flicker = 1;
onTick((_dt, t) => {
  const dark = 1 - daylight(t);
  const duskAlpha = light.bulb ? 0.06 + dark * 0.1 : 0.14 + dark * 0.62;
  const [r, g, b] = light.crtColor;
  // the tube's light wavers, but a few times a second is enough
  if (++frame % 5 === 0) flicker = 0.92 + Math.random() * 0.08;
  const crtAlpha = Math.min(1, light.crt * (0.3 + dark * 1.05) * flicker);
  const visibleStale = sets.some((s) => s.stale && s.dusk.parentElement && getComputedVisibility(s.dusk.parentElement) === 'visible');
  const key = `${duskAlpha.toFixed(3)}|${light.bulb}|${crtAlpha.toFixed(3)}|${r},${g},${b}`;
  if (key === last && !visibleStale) return;
  last = key;
  for (const set of sets) {
    if (set.dusk.parentElement && getComputedVisibility(set.dusk.parentElement) === 'hidden') {
      set.stale = true;
      continue;
    }
    set.stale = false;
    set.dusk.style.opacity = duskAlpha.toFixed(3);
    set.bulb.style.opacity = light.bulb ? '1' : '0';
    set.bulb.style.display = light.bulb ? '' : 'none';
    const crtOpacity = crtAlpha * set.crtReach;
    set.crt.style.opacity = crtOpacity.toFixed(3);
    set.crt.style.display = crtOpacity > 0.005 ? '' : 'none';
    set.crt.style.background = `radial-gradient(ellipse at ${set.tvAt.x / 16}% ${set.tvAt.y / 9}%, rgba(${r},${g},${b},0.9), rgba(${r},${g},${b},0.35) 30%, rgba(${r},${g},${b},0) 75%)`;
  }
});
