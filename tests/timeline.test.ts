import { describe, expect, it } from 'vitest';
import { Timeline } from '../src/broadcast/timeline';
import type { Segment } from '../src/broadcast/types';

const song = (id: string): Segment => ({ kind: 'song', songId: id });

function makeTimeline(anthem: boolean, len = 100) {
  let n = 0;
  return new Timeline({
    from: -250,
    next: () => song(`s${n++}`),
    measure: (seg) => ({ dur: seg.kind === 'anthem' ? 90 : len, cues: [] }),
    hardBreak: { at: 1800, seg: () => (anthem ? { kind: 'anthem' } : null) },
  });
}

describe('Timeline', () => {
  it('lands mid-segment at t = 0 and is contiguous', () => {
    const tl = makeTimeline(false);
    const now = tl.at(0)!;
    expect(now.start).toBeLessThan(0);
    expect(now.end).toBeGreaterThan(0);
    tl.ensure(1000);
    for (let i = 1; i < tl.items.length; i++) expect(tl.items[i].start).toBeCloseTo(tl.items[i - 1].end);
  });

  it('cuts whatever is on air at 6 p.m. for the anthem', () => {
    const tl = makeTimeline(true, 130);
    const anthem = tl.at(1800.5)!;
    expect(anthem.seg.kind).toBe('anthem');
    expect(anthem.start).toBe(1800);
    const before = tl.at(1799)!;
    expect(before.end).toBe(1800);
    expect(before.cut).toBe(true);
  });

  it('skips the break when there is no anthem recording', () => {
    const tl = makeTimeline(false, 130);
    expect(tl.at(1800.5)!.seg.kind).toBe('song');
  });

  it('inserts a request after the current segment and keeps the anthem', () => {
    const tl = makeTimeline(true, 130);
    const current = tl.at(1500)!;
    const [placed] = tl.rewrite(1500, [song('request')]);
    expect(placed.start).toBeCloseTo(current.end);
    expect(tl.at(placed.start + 1)!.seg).toMatchObject({ songId: 'request' });
    expect(tl.at(1800.5)!.seg.kind).toBe('anthem');
  });

  it('can keep a few segments before the inserted one', () => {
    const tl = makeTimeline(false);
    const current = tl.at(300)!;
    const [placed] = tl.rewrite(300, [song('request')], 1);
    expect(placed.start).toBeCloseTo(current.end + 100);
  });

  it('cuts the segment on air short and carries on from that moment', () => {
    const tl = makeTimeline(false, 100);
    const on = tl.at(30)!;
    tl.cutAt(30);
    expect(on.end).toBe(30);
    expect(on.cut).toBe(true);
    const next = tl.at(30.5)!;
    expect(next.start).toBe(30);
    expect(next.seg).not.toBe(on.seg);
    tl.ensure(600);
    for (let i = 1; i < tl.items.length; i++) expect(tl.items[i].start).toBeCloseTo(tl.items[i - 1].end);
  });

  it('can put something in right after the cut', () => {
    const tl = makeTimeline(false, 100);
    tl.cutAt(30, [{ kind: 'anthem' }]);
    const next = tl.at(30.5)!;
    expect(next.seg.kind).toBe('anthem');
    expect([next.start, next.end]).toEqual([30, 120]);
  });
});
