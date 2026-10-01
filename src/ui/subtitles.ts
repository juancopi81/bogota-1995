// Subtitles: what you can hear being said, one row per source.

import { SPEAKERS, shownText, type Line } from '../content/lines';

export type SubSource = 'phone' | 'radio' | 'tv' | 'tape' | 'house';

const ORDER: SubSource[] = ['house', 'tv', 'radio', 'tape', 'phone'];

export interface SubContent {
  /** Where it comes from, e.g. "Radio · Radioactiva 97.9". */
  label?: string;
  line: Line;
  /** 0–1: how clearly it can be heard (faint radio, bad reception). */
  clarity?: number;
  /** Name the speaker (phone, house) or just the source (radio, TV). */
  showWho?: boolean;
}

class Subtitles {
  private root: HTMLElement | null = null;
  private rows = new Map<SubSource, { el: HTMLElement; key: string }>();

  mount(parent: HTMLElement): void {
    this.root = document.createElement('div');
    this.root.id = 'subtitles';
    parent.appendChild(this.root);
  }

  set(source: SubSource, content: SubContent | null): void {
    if (!this.root) return;
    const existing = this.rows.get(source);
    if (!content) {
      if (existing) {
        existing.el.classList.add('leaving');
        const el = existing.el;
        setTimeout(() => el.remove(), 300);
        this.rows.delete(source);
      }
      return;
    }
    const text = shownText(content.line);
    const key = `${content.label ?? ''}|${content.line.id}|${text}`;
    const clarity = content.clarity ?? 1;
    if (existing && existing.key === key) {
      existing.el.style.opacity = String(0.35 + 0.65 * clarity);
      return;
    }
    if (existing) existing.el.remove();

    const el = document.createElement('div');
    el.className = `sub sub-${source}`;
    el.style.opacity = String(0.35 + 0.65 * clarity);
    const showWho = content.showWho ?? (source === 'phone' || source === 'house');
    const who = !showWho || content.line.who === 'jugador' ? '' : SPEAKERS[content.line.who]?.name ?? '';
    const meta = [content.label, who].filter(Boolean).join(' · ');
    el.innerHTML = `${meta ? `<span class="sub-meta"></span>` : ''}<span class="sub-text"></span>`;
    if (meta) el.querySelector('.sub-meta')!.textContent = meta;
    el.querySelector('.sub-text')!.textContent = text;
    this.rows.set(source, { el, key });

    // keep rows in a stable order
    const after = ORDER.slice(ORDER.indexOf(source) + 1)
      .map((s) => this.rows.get(s)?.el)
      .find((e) => e && e.parentElement === this.root);
    this.root.insertBefore(el, after ?? null);
  }

  clearAll(): void {
    for (const source of [...this.rows.keys()]) this.set(source, null);
  }
}

export const subtitles = new Subtitles();
