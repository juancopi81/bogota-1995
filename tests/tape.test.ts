import { describe, expect, it } from 'vitest';
import { blankCassette, counterAt, counterDisplay } from '../src/objects/tape';

describe('Cassette', () => {
  it('records and overwrites stretches of tape', () => {
    const c = blankCassette('t', 'TDK D60', '#ddd');
    c.write(10, 100, 'a');
    c.write(50, 20, 'b');
    const segs = c.segments();
    expect(segs.map((s) => [s.key, s.start, s.dur, s.offset])).toEqual([
      ['a', 10, 40, 0],
      ['b', 50, 20, 0],
      ['a', 70, 40, 60],
    ]);
  });

  it('erases a recording completely when you record over all of it', () => {
    const c = blankCassette('t', 'TDK D60', '#ddd');
    c.write(10, 5, 'a');
    c.write(0, 100, 'b');
    expect(c.segments().map((s) => s.key)).toEqual(['b']);
    expect(c.keys()).toEqual(new Set(['b']));
  });

  it('cannot record past the end of the side', () => {
    const c = blankCassette('t', 'TDK D60', '#ddd');
    const seg = c.write(1790, 60, 'a');
    expect(seg.dur).toBe(10);
  });

  it('flips sides, mirroring the position', () => {
    const c = blankCassette('t', 'TDK D60', '#ddd');
    c.pos = 300;
    c.flip();
    expect(c.side).toBe('B');
    expect(c.pos).toBe(1500);
    c.write(0, 10, 'b');
    expect(c.segments('A')).toEqual([]);
    expect(c.segments('B')).toHaveLength(1);
  });
});

describe('counter', () => {
  it('runs faster at the start of the tape than at the end', () => {
    const firstMinute = counterAt(60) - counterAt(0);
    const lastMinute = counterAt(1800) - counterAt(1740);
    expect(firstMinute).toBeGreaterThan(lastMinute * 1.5);
    expect(counterAt(1800)).toBeGreaterThan(380);
    expect(counterAt(1800)).toBeLessThan(480);
  });

  it('shows three digits relative to the reset point', () => {
    expect(counterDisplay(0, 0)).toBe('000');
    const z = counterAt(600);
    expect(counterDisplay(600, z)).toBe('000');
    // rewinding past the reset point wraps around below 000
    expect(Number(counterDisplay(0, z))).toBeGreaterThan(800);
  });
});
