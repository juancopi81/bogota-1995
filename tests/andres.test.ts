import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallApi, Choice } from '../src/objects/calls';
import type { PhoneWorld } from '../src/content/phonebook';

vi.mock('../src/world/store', () => ({
  kv: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
  idb: { keys: async () => [], get: async () => undefined, put: async () => undefined, clear: async () => undefined },
}));

class HungUp extends Error {}

/** A phone line that writes down what the other end says and answers with the choices given, in order (by their first words). */
function line(answers: string[], now = 0) {
  const said: string[] = [];
  const offered: string[][] = [];
  const events: string[] = [];
  const api: CallApi = {
    say: async (l) => void said.push(l.id),
    pause: async () => undefined,
    choose: async <T,>(options: Choice<T>[]) => {
      offered.push(options.map((o) => o.text));
      const want = answers.shift();
      const pick = want === undefined ? options[0] : options.find((o) => o.text.startsWith(want));
      if (!pick) throw new Error(`no choice starting "${want}" in ${JSON.stringify(options.map((o) => o.text))}`);
      return pick.value;
    },
    hangUp: async () => {
      events.push('hangUp');
      throw new HungUp();
    },
    ambience: (kind) => void events.push(`ambience:${kind}`),
    click: () => void events.push('click'),
    coins: () => void events.push('coins'),
    now: () => now,
  };
  return { api, said, offered, events };
}

const world = (taped: boolean): PhoneWorld => ({ hasRecordings: () => taped, request: () => undefined });

async function load() {
  vi.resetModules();
  const phonebook = await import('../src/content/phonebook');
  const { flags, SCHEDULE } = await import('../src/world/flags');
  const { bus } = await import('../src/world/bus');
  const steps: string[] = [];
  bus.on('story:andres', ({ step }) => steps.push(step));
  return { ...phonebook, flags, SCHEDULE, steps };
}

async function run(script: (call: CallApi) => Promise<void>, call: CallApi): Promise<void> {
  await script(call).catch((e) => {
    if (!(e instanceof HungUp)) throw e;
  });
}

const id = (name: string) => `llamada.andres.${name}`;

describe('Andrés and the tape', () => {
  beforeEach(() => vi.resetModules());

  it('calls early from a monedero in Unicentro, asks you to tape «Florecita rockera», and runs out of coins', async () => {
    const { andresFromMonedero, flags, SCHEDULE, steps } = await load();
    expect(SCHEDULE.andresEarly).toBeLessThan(120);
    const call = line(['¿Quiubo, Andrés?', 'Sí, de una']);
    await run(andresFromMonedero(world(false)), call.api);
    expect(call.said).toEqual(['monedero', 'queMas', 'grabadora', 'pedido', 'pilas', 'deUna', 'monedas'].map(id));
    expect(call.events.slice(0, 2)).toEqual(['ambience:street', 'coins']);
    expect(call.events.at(-1)).toBe('hangUp');
    // nothing on the tape yet, so you can't offer what you've recorded
    expect(call.offered[1].some((t) => t.startsWith('Ya tengo algo grabado'))).toBe(false);
    expect([flags.andresAsked, flags.andresToldRain, flags.andresTalkedHome]).toEqual([true, true, false]);
    expect(steps).toEqual(['answered', 'asked']);
  });

  it('calls again once he is home to ask whether you taped it', async () => {
    const { andresFromMonedero, andresCallsBack, flags, steps } = await load();
    await run(andresFromMonedero(world(false)), line([]).api);
    const call = line(['¡Quiubo! ¿Llegó bien?', 'Sí, ya la tengo']);
    await run(andresCallsBack(world(true)), call.api);
    // he doesn't ask twice or tell the Unicentro story again
    expect(call.said).toEqual(['yaLlegue', 'laGrabo', 'yaGrabo', 'chisme', 'colgar'].map(id));
    expect(flags.andresTalkedHome).toBe(true);
    expect(steps).toEqual(['answered', 'asked', 'taped']);
  });

  it("only lets you say you've taped it when there's something on the tape", async () => {
    const { andresFromMonedero, andresCallsBack, steps } = await load();
    await run(andresFromMonedero(world(false)), line([]).api);
    const call = line([]);
    await run(andresCallsBack(world(false)), call.api);
    expect(call.offered[1]).toEqual(['Todavía no la han puesto.']);
    expect(call.said).toContain(id('noImporta'));
    expect(steps.at(-1)).toBe('not-taped');
  });

  it('still asks for the favor when you reach him at home without the early call', async () => {
    const { route, flags, SCHEDULE } = await load();
    const r = route('2483107', SCHEDULE.andresHome + 30, world(false));
    expect(r.kind).toBe('answer');
    const call = line([], SCHEDULE.andresHome + 30);
    if (r.kind === 'answer') await run(r.script, call.api);
    expect(call.said).toEqual(['hola', 'deParte', 'momentico', 'grita', 'alo', 'queMas', 'grabadora', 'pedido', 'pilas', 'deUna', 'chisme', 'colgar'].map(id));
    expect(flags.andresAsked).toBe(true);
  });

  it('returns your message with the favor if he never got through from the monedero', async () => {
    const { andresCallsBack, flags } = await load();
    flags.andresMessageAt = 200;
    const call = line([]);
    await run(andresCallsBack(world(false)), call.api);
    expect(call.said.slice(0, 3)).toEqual(['meLlamo', 'queMas', 'grabadora'].map(id));
  });
});
