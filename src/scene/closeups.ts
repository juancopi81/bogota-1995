// Opening and closing close-ups: the room leans in toward the object, the
// object's sound comes forward, and a way back appears.

import { room } from './room';
import { stage } from './stage';
import { bus, type CloseupId } from '../world/bus';
import type { AudioEngine, FocusId } from '../audio/engine';

interface Closeup {
  el: HTMLElement;
  /** Where the object is in the room, to zoom toward. */
  rect: { x: number; y: number; w: number; h: number };
  focus: FocusId;
  onOpen?: () => void;
  onClose?: () => void;
}

class Closeups {
  private registry = new Map<CloseupId, Closeup>();
  private currentId: CloseupId | null = null;
  private back!: HTMLButtonElement;
  private engine!: AudioEngine;

  mount(engine: AudioEngine): void {
    this.engine = engine;
    this.back = document.createElement('button');
    this.back.id = 'back';
    this.back.textContent = '← volver al cuarto';
    this.back.addEventListener('click', () => this.close());
    stage.el.appendChild(this.back);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  register(id: CloseupId, closeup: Closeup): void {
    this.registry.set(id, closeup);
    stage.el.appendChild(closeup.el);
    room().onHot(id, () => this.open(id));
  }

  /** The close-up that's open, or null when you're looking at the room. */
  get current(): CloseupId | null {
    return this.currentId;
  }

  isOpen(id: CloseupId): boolean {
    return this.currentId === id;
  }

  open(id: CloseupId): void {
    if (this.currentId === id) return;
    if (this.currentId) this.close();
    const c = this.registry.get(id);
    if (!c) return;
    this.currentId = id;
    room().zoomTo(c.rect);
    c.el.classList.add('open');
    this.back.classList.add('show');
    this.engine.setFocus(c.focus);
    c.onOpen?.();
    bus.emit('closeup:open', { id });
  }

  close(): void {
    const id = this.currentId;
    if (!id) return;
    const c = this.registry.get(id)!;
    this.currentId = null;
    c.el.classList.remove('open');
    this.back.classList.remove('show');
    room().zoomOut();
    this.engine.setFocus(null);
    c.onClose?.();
    bus.emit('closeup:close', { id });
  }

  /** Change the audio focus while a close-up stays open (the phone at your ear). */
  refocus(focus: FocusId): void {
    this.engine.setFocus(focus);
  }
}

export const closeups = new Closeups();
