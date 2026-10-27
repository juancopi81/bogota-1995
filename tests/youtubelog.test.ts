import { describe, expect, it } from 'vitest';
import { YouTubeLog } from '../src/objects/youtubelog';

const EP = '92NxNiCDwZs';
const data = (id: string) => ({ video_id: id, title: 'never kept', author: 'never kept' });

/** Messages every 250 ms, the way the player sends them, from `from` ms: `step(ms)` says what it reports then. */
function feed(log: YouTubeLog, from: number, to: number, step: (ms: number) => Record<string, unknown>): number {
  for (let ms = from; ms < to; ms += 250) log.message('infoDelivery', step(ms), ms);
  return to;
}

describe("YouTube's player on the TV", () => {
  it('times a program that simply plays, the way it did in Chrome on 27 October', () => {
    const log = new YouTubeLog();
    log.load(EP, 0);
    log.message('initialDelivery', { playerState: 3, currentTime: 0, duration: 1420, videoData: data(EP) }, 100);
    log.message('infoDelivery', { playerState: -1, currentTime: 60 }, 200);
    log.message('infoDelivery', { playerState: 3, currentTime: 60 }, 300);
    feed(log, 500, 5000, (ms) => ({ playerState: 1, currentTime: 60 + (ms - 500) / 1000 }));
    const f = log.fields();
    expect(f).toMatchObject({ n_yt: 1, n_yt_on: 1, n_yt_other: 0, s_yt_other: 0, s_yt_still: 0, yt_seq: '3>-1>3>1', yt_mode: '', yt_new: '' });
    expect(f.s_yt_wait).toBeCloseTo(0.8, 1);
  });

  it('counts an ad reported as another video, and the wait until the program comes on', () => {
    const log = new YouTubeLog();
    log.load(EP, 0);
    log.message('initialDelivery', { playerState: 3, videoData: data(EP) }, 100);
    // 15 s of "playing" something else, then the program
    let at = feed(log, 250, 15250, (ms) => ({ playerState: 1, currentTime: ms / 1000, videoData: data('anAdVideo1') }));
    at = feed(log, at, at + 3000, (ms) => ({ playerState: 1, currentTime: 60 + (ms - at) / 1000, videoData: data(EP) }));
    const f = log.fields();
    expect(f).toMatchObject({ n_yt_on: 1, n_yt_other: 1, s_yt_other: 15, s_yt_still: 0, yt_seq: '3>1o>1' });
    expect(f.s_yt_wait as number).toBeGreaterThan(15);
    expect(JSON.stringify(f)).not.toMatch(/anAdVideo1|never kept/);
  });

  it("counts an ad that leaves the program's clock standing still while the player says it plays", () => {
    const log = new YouTubeLog();
    log.load(EP, 0);
    log.message('initialDelivery', { playerState: 3, videoData: data(EP) }, 100);
    let at = feed(log, 250, 3250, (ms) => ({ playerState: 1, currentTime: 60 + (ms - 250) / 1000 }));
    // a break: still "playing", the clock stuck at 63 s for 10 s
    at = feed(log, at, at + 10000, () => ({ playerState: 1, currentTime: 63 }));
    feed(log, at, at + 2000, (ms) => ({ playerState: 1, currentTime: 63 + (ms - at) / 1000 }));
    const f = log.fields();
    expect(f.yt_seq).toBe('3>1>1s>1');
    expect(f.s_yt_still).toBeGreaterThanOrEqual(8);
    expect(f.s_yt_still).toBeLessThanOrEqual(10);
  });

  it("doesn't take a pause (the TV out of view) for an ad", () => {
    const log = new YouTubeLog();
    log.load(EP, 0);
    let at = feed(log, 0, 2000, (ms) => ({ playerState: 1, currentTime: ms / 1000, videoData: data(EP) }));
    at = feed(log, at, at + 20000, () => ({ playerState: 2, currentTime: 2 }));
    expect(log.fields()).toMatchObject({ s_yt_still: 0, s_yt_other: 0, yt_seq: '1>2' });
  });

  it("keeps the names of fields and events the player doesn't send while a program plays, and playerMode's keys", () => {
    const log = new YouTubeLog();
    log.load(EP, 0);
    log.message('infoDelivery', { playerState: 1, adState: 1, playerMode: { isAd: true }, 'odd key!': 1 }, 0);
    log.message('onAdStart', { value: 1 }, 100);
    expect(log.fields()).toMatchObject({ yt_mode: 'isAd', yt_new: 'adState ? onAdStart' });
  });

  it('counts loads, refusals and early ends, and says nothing when the TV never showed YouTube', () => {
    const log = new YouTubeLog();
    expect(log.fields()).toEqual({ n_yt: 0 });
    log.load(EP, 0);
    log.failed();
    log.load('zxKV5Lfi1Xk', 1000);
    log.ended();
    expect(log.fields()).toMatchObject({ n_yt: 2, n_yt_on: 0, s_yt_wait: 0, n_yt_fail: 1, n_yt_end: 1, yt_seq: '– –' });
  });
});
