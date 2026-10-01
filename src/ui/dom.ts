// Write to the DOM only when something actually changed. Every write to an
// SVG makes the browser repaint it, and the room's SVGs are expensive.

const last = new WeakMap<Element, Map<string, string>>();

export function setAttr(el: Element | null | undefined, name: string, value: string | number): void {
  if (!el) return;
  const v = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value;
  let m = last.get(el);
  if (!m) {
    m = new Map();
    last.set(el, m);
  }
  if (m.get(name) === v) return;
  m.set(name, v);
  el.setAttribute(name, v);
}

export function setText(el: Element | null | undefined, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

export function toggleClass(el: Element | null | undefined, cls: string, on: boolean): void {
  if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}
