import { describe, expect, it } from 'vitest';
import { Timeline } from '../src/broadcast/timeline';
import { SCHEDULES, onSchedule } from '../src/content/clips';
import { CHANNELS, timetable, type TvSegment } from '../src/content/tv';

const SIX = 1800;
/** The anthem recording (2:41) plus its two seconds of air. */
const ANTHEM = 163;
const channel = (n: number) => CHANNELS.find((c) => c.number === n)!;

/** A channel's day as the TV plans it: the timetable, the anthem at six, and something else where the timetable has nothing. */
function day(n: number, usable = (_: { id: string }) => true, ended = new Set<number>()) {
  return new Timeline<TvSegment>({
    from: -100,
    next: (start) => timetable(channel(n), start, SIX, ANTHEM, usable, ended) ?? { kind: 'scene', scene: 'paramo', lines: [], min: 30 },
    measure: (seg) => ({ dur: seg.kind === 'clip' ? seg.clip.dur : seg.kind === 'anthem' ? ANTHEM : (seg.min ?? 0), cues: [] }),
    hardBreak: { at: SIX, seg: () => ({ kind: 'anthem' }) },
  });
}

const on = (tl: Timeline<TvSegment>, t: number) => {
  const item = tl.at(t)!;
  return item.seg.kind === 'clip' ? { id: item.seg.clip.id, from: item.seg.clip.start + (t - item.start), start: item.start, end: item.end } : { kind: item.seg.kind, start: item.start, end: item.end };
};

describe('the TV timetable from 5:30', () => {
  it('starts Dejémonos de vainas on Canal A and Tentaciones on Cadena Uno right at 5:30, from the top', () => {
    expect(on(day(9), 0)).toMatchObject({ id: 'E_reJPjY4Fw', from: 0, start: 0 });
    expect(on(day(7), 0)).toMatchObject({ id: '92NxNiCDwZs', from: 0, start: 0 });
    // before 5:30, the channel's card
    expect(on(day(9), -50)).toMatchObject({ kind: 'scene' });
  });

  it('lands mid-episode when you tune in late, and plays each episode to its end', () => {
    expect(on(day(9), 600)).toMatchObject({ id: 'E_reJPjY4Fw', from: 600 });
    expect(on(day(9), 22 * 60 + 30).end).toBe(22 * 60 + 31);
    expect(on(day(7), 23 * 60 + 38).end).toBe(23 * 60 + 39);
  });

  it('runs the ads, Rock al Parque and more ads on Canal A up to six, then the news after the anthem', () => {
    const tl = day(9);
    const ads = ['Qv6BF5cz1WI', 'WpAJ8E8ZnyI', 'qkIQUUdeXJo', 'Mwwqc8vHE5A'];
    let t = 1351;
    for (const [i, id] of ads.entries()) {
      expect(on(tl, t + 1)).toMatchObject({ id, from: 1 });
      t += [19, 14, 26, 19][i];
    }
    expect(on(tl, t + 1)).toMatchObject({ id: '84DTd4OBC9Y' });
    expect(on(tl, t + 241)).toMatchObject({ id: 'J47UMyICIJU', from: 151, end: SIX });
    expect(on(tl, SIX + 1)).toMatchObject({ kind: 'anthem' });
    expect(on(tl, SIX + ANTHEM + 1)).toMatchObject({ id: 'c991HevT0RE', from: 1 });
  });

  it('pauses De pies a cabeza for the anthem at six and picks it up where it stopped', () => {
    const tl = day(7);
    expect(on(tl, 1500)).toMatchObject({ id: 'zxKV5Lfi1Xk', from: 6 });
    const before = tl.at(SIX - 1)!;
    expect(before.end).toBe(SIX);
    expect(before.cut).toBe(true);
    expect(on(tl, SIX + 1)).toMatchObject({ kind: 'anthem' });
    // 5:54:54 to six is 306 seconds of it; it goes on from there
    expect(on(tl, SIX + ANTHEM + 1)).toMatchObject({ id: 'zxKV5Lfi1Xk', from: 307 });
    const rest = tl.at(SIX + ANTHEM + 1)!;
    expect(rest.end - rest.start).toBe(34 * 60 + 30 - 306);
  });

  it('goes back to the usual running order when the timetable is over', () => {
    const end = SCHEDULES[7].reduce((s, c) => s + c.dur, 0) + ANTHEM;
    expect(onSchedule(SCHEDULES[7], end + 1, SIX, ANTHEM)).toBeNull();
    expect(on(day(7), end + 1)).toMatchObject({ kind: 'scene' });
  });

  it('fills a refused program with something else, and what follows keeps to the clock', () => {
    const tl = day(9, (clip) => clip.id !== 'E_reJPjY4Fw');
    expect(on(tl, 100)).toMatchObject({ kind: 'scene' });
    // Rock al Parque started at 5:53:49 on the timetable; at 5:55 it's 71 seconds in
    expect(on(tl, 1500)).toMatchObject({ id: '84DTd4OBC9Y', from: 71 });
  });

  it('shows the card for the rest of a program whose video ran out early', () => {
    const tl = day(9, () => true, new Set([0]));
    expect(on(tl, 700)).toMatchObject({ kind: 'scene' });
    expect(on(tl, 1352)).toMatchObject({ id: 'Qv6BF5cz1WI' });
  });

  it('runs straight through six when there is no anthem to play', () => {
    expect(onSchedule(SCHEDULES[7], SIX + 10, SIX, 0)).toMatchObject({ clip: { id: 'zxKV5Lfi1Xk', start: 316 } });
  });
});
