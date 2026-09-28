// What you say on the phone: two to four handwritten options. Click one (or
// press 1–4).

import { stage } from '../scene/stage';
import type { Choice } from '../objects/calls';

class Dialogue {
  private el!: HTMLElement;
  private pending: { reject: (e: unknown) => void } | null = null;

  mount(): void {
    this.el = document.createElement('div');
    this.el.id = 'dialogue';
    stage.el.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (!this.pending) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) this.el.querySelectorAll<HTMLButtonElement>('button')[n - 1]?.click();
    });
  }

  ask<T>(options: Choice<T>[]): Promise<T> {
    this.cancel();
    return new Promise<T>((resolve, reject) => {
      this.pending = { reject };
      this.el.innerHTML = '<div class="say">Usted dice</div>';
      options.forEach((option) => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.addEventListener('click', () => {
          this.pending = null;
          this.el.innerHTML = '';
          resolve(option.value);
        });
        this.el.appendChild(button);
      });
      document.body.classList.add('choosing');
    }).finally(() => document.body.classList.remove('choosing'));
  }

  /** Take the options away (you hung up). */
  cancel(reason: unknown = new Error('cancelled')): void {
    if (this.el) this.el.innerHTML = '';
    const p = this.pending;
    this.pending = null;
    p?.reject(reason);
  }

  get open(): boolean {
    return this.pending !== null;
  }
}

export const dialogue = new Dialogue();
