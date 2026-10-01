// One animation loop for the whole room. Objects register a tick; each frame
// gets the time since the last frame (dt, seconds) and the world time (t).

import { clock } from './clock';

export type Tick = (dt: number, t: number) => void;

const ticks = new Set<Tick>();
let last = 0;
let running = false;

export function onTick(tick: Tick): () => void {
  ticks.add(tick);
  return () => ticks.delete(tick);
}

export function startLoop(): void {
  if (running) return;
  running = true;
  last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = clock.now();
    for (const tick of ticks) {
      try {
        tick(dt, t);
      } catch (error) {
        console.error(error);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Run a function at a world time (checked every frame). */
export function atWorldTime(t: number, fn: () => void): () => void {
  const off = onTick((_dt, now) => {
    if (now >= t) {
      off();
      fn();
    }
  });
  return off;
}
