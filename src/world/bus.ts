// A tiny typed event bus so objects can react to each other without importing each other.

type Handler<T> = (payload: T) => void;

export class Emitter<E extends { [K in keyof E]: unknown }> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set!.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) (handler as Handler<E[K]>)(payload);
  }
}

export type WorldEvents = {
  /** The world clock jumped forward (backstage time skip). */
  'clock:skip': { by: number };
  /** A close-up view opened or closed. */
  'closeup:open': { id: CloseupId };
  'closeup:close': { id: CloseupId };
  /** The radio's audible output changed (tuning, band, power, volume). */
  'radio:changed': void;
  /** A song request was taken by a station's cabina. */
  'radio:request': { stationId: string; songId: string; dedication: string | null; from: string };
  /** A requested song started playing on air. */
  'radio:request-aired': { stationId: string; songId: string; dedication: string | null };
  /** The phone line state changed. */
  'phone:state': { state: string };
  /** A whole number was dialed. */
  'phone:dialed': { number: string };
  /** Recording started or stopped on the deck. */
  'tape:recording': { on: boolean };
  /**
   * A song, voice or the anthem is ready to play: one loaded in the backstage,
   * or one of the room's own. `planned` if its length was known from the build,
   * so nothing that's planned around it changes.
   */
  'media:loaded': { kind: 'song' | 'voice' | 'anthem' | 'house'; id: string; planned?: boolean };
  /** One of the room's own files turned out not to load here: plan without it. */
  'media:missing': { kind: 'anthem' | 'house'; id: string };
  /** The light switch. */
  'light:bulb': { on: boolean };
  /** The TV was switched on or off. */
  'tv:power': { on: boolean };
  /** Real clips turned out not to play here (or one of them was refused). */
  'tv:clips': { playable: boolean };
  /** The window was opened or closed. */
  'window:open': { open: boolean };
  /** How far Andrés's errand got: he rang from the monedero, you answered, he asked for the tape, and whether you'd taped it when he checked. */
  'story:andres': { step: 'rang' | 'answered' | 'asked' | 'taped' | 'not-taped' };
};

export type CloseupId = 'grabadora' | 'phone' | 'tv' | 'window' | 'clock';

export const bus = new Emitter<WorldEvents>();
