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
}

const sets: OverlaySet[] = [];

export function addLightOverlays(parent: HTMLElement, tvAt: { x: number; y: number }, crtReach = 1): void {
  const make = (cls: string) => {
    const el = document.createElement('div');
    el.className = `light ${cls}`;
    parent.appendChild(el);
    return el;
  };
  const vignette = make('vignette');
  vignette.style.zIndex = '1';
  sets.push({ dusk: make('dusk'), bulb: make('bulb'), crt: make('crt'), tvAt, crtReach });
}

export function setBulb(on: boolean): void {
  light.bulb = on;
  kv.set('bulb', on);
  bus.emit('light:bulb', { on });
}

let last = '';
onTick((_dt, t) => {
  const dark = 1 - daylight(t);
  const duskAlpha = light.bulb ? 0.08 + dark * 0.1 : 0.2 + dark * 0.6;
  const [r, g, b] = light.crtColor;
  const flicker = light.crt > 0 ? 0.92 + Math.random() * 0.08 : 0;
  const crtAlpha = light.crt * (0.1 + dark * 0.55) * flicker;
  const key = `${duskAlpha.toFixed(3)}|${light.bulb}|${crtAlpha.toFixed(3)}|${r},${g},${b}`;
  if (key === last) return;
  last = key;
  for (const set of sets) {
    set.dusk.style.opacity = duskAlpha.toFixed(3);
    set.bulb.style.opacity = light.bulb ? '1' : '0';
    set.crt.style.opacity = (crtAlpha * set.crtReach).toFixed(3);
    set.crt.style.background = `radial-gradient(ellipse at ${set.tvAt.x / 16}% ${set.tvAt.y / 9}%, rgba(${r},${g},${b},0.9), rgba(${r},${g},${b},0.35) 30%, rgba(${r},${g},${b},0) 75%)`;
  }
});
