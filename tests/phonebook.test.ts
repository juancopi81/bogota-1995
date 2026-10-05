import { describe, expect, it, vi } from 'vitest';
import type { PhoneWorld } from '../src/content/phonebook';

vi.mock('../src/world/store', () => ({
  kv: { get: (_key: string, fallback: unknown) => fallback, set: vi.fn() },
  idb: { keys: async () => [], get: async () => undefined, put: async () => undefined, clear: async () => undefined },
}));

const world: PhoneWorld = { hasRecordings: () => false, request: () => undefined };

describe('the libreta', () => {
  it('reaches Abuelita at the number written for her, after her seven slow rings', async () => {
    const { LIBRETA, formatNumber, route } = await import('../src/content/phonebook');
    const entry = LIBRETA.find((e) => e.name === 'Abuelita')!;
    expect(entry.number).toBe('2459505');
    expect(formatNumber(entry.number)).toBe('2 45 95 05');
    expect(route(entry.number, 0, world)).toMatchObject({ kind: 'answer', rings: 7 });
  });

  it('gives every number in it a different line from ours, the bakery and the radio', async () => {
    const { LIBRETA, OWN_NUMBER, PIZZERIA } = await import('../src/content/phonebook');
    const { REQUEST_LINE } = await import('../src/content/stations');
    const numbers = [...LIBRETA.map((e) => e.number), OWN_NUMBER, PIZZERIA, REQUEST_LINE];
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
