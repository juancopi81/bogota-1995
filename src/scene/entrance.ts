// The way in: the hallway outside your room, and your door with its sign.
// Knocking on it (a click, a tap, or Enter, since it has the focus) opens it
// onto the room; so does waking the dog. In the test, the line under the door
// says what's kept, and opening the door with it in view is the visitor's yes.

import { HALLWAY, doorLeaf, hallway } from '../art/hallway';

export type DoorChoice = 'enter' | 'unlogged' | 'back';

export interface EntranceOptions {
  /** The test's line under the door, or null outside the test. */
  notice: string | null;
  /** "Más detalles": how the visitor goes in from there, or back to the door. */
  details: () => Promise<DoorChoice>;
  /** The two knocks, as soon as the door is touched (the touch also lets sound play). */
  knock: () => void;
  /** The door is opening; `logged` is false if they chose not to be kept in "Más detalles". */
  enter: (logged: boolean) => void;
}

/** How long the knocks take before the door swings, and the swing before the room shows through. */
const KNOCKS_MS = 420;
const SWING_MS = 700;

export function entrance(host: HTMLElement, o: EntranceOptions): void {
  const { door, dog } = HALLWAY;
  const box = (r: { x: number; y: number; w: number; h: number }) => `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
  const el = document.createElement('div');
  el.id = 'entrance';
  el.innerHTML = `
    <svg class="hall" viewBox="0 0 1600 900" aria-hidden="true">${hallway()}</svg>
    <div class="leaf" style="${box(door)}"><svg viewBox="0 0 ${door.w} ${door.h}" aria-hidden="true">${doorLeaf()}</svg></div>
    <button type="button" class="door" style="${box(door)}" aria-label="Tocar la puerta y entrar"></button>
    <button type="button" class="dog-hit" style="${box(dog)}" tabindex="-1" aria-hidden="true"></button>
    <div class="place">Bogotá</div>
    <div class="date">Sábado 28 de octubre de 1995 · 5:30 p.m.</div>
    <div class="notice">Se recomienda usar audífonos${o.notice ? ` · ${o.notice} <button type="button" class="more">Más detalles</button>` : '.'}</div>`;
  host.appendChild(el);

  const knock = el.querySelector<HTMLButtonElement>('.door')!;
  let opened = false;
  const open = (logged: boolean) => {
    if (opened) return;
    opened = true;
    for (const b of el.querySelectorAll('button')) b.disabled = true;
    o.knock();
    el.classList.add('knock');
    setTimeout(() => el.classList.add('open'), KNOCKS_MS);
    setTimeout(() => {
      el.classList.add('gone');
      o.enter(logged);
    }, KNOCKS_MS + SWING_MS);
    setTimeout(() => el.remove(), KNOCKS_MS + SWING_MS + 2000);
  };
  knock.addEventListener('click', () => open(true));
  el.querySelector('.dog-hit')!.addEventListener('click', () => {
    el.classList.add('dog-up');
    open(true);
  });
  el.querySelector('.more')?.addEventListener('click', async () => {
    const choice = await o.details();
    if (choice === 'back') knock.focus({ preventScroll: true });
    else open(choice === 'enter');
  });
  el.addEventListener('keydown', (e) => e.key === 'Tab' && el.classList.add('keys'));
  knock.focus({ preventScroll: true });
}
