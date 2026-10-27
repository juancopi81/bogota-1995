// End-to-end: the real 1995 television. From 5:30, Cadena Uno and Canal A air
// full episodes, ads and clips on a timetable, paused by the anthem at six.
//
// So the runs don't depend on what YouTube serves, a stand-in player answers
// for www.youtube-nocookie.com: it speaks the same postMessage protocol as
// the real one (listening → initialDelivery / infoDelivery with the video's
// id and clock, onError, commands). Four runs:
//   1. the player plays: it shows as soon as it's there, follows the volume
//      knob, pauses when the TV goes out of view and picks up when it's back;
//   2. an ad first: the player shows it (another video), and the test's
//      counts say so;
//   3. one clip is refused: Canal A cuts to the next one and skips it after;
//   4. the player never answers (YouTube unreachable): Canal A goes back to
//      its invented programs.
// Needs the dev server on :5173.
import { chromium } from 'playwright';

const FAKE_PLAYER = (mode) => `<!doctype html><html><body style="margin:0;background:#468">
<script>
  window.commands = [];
  const id = location.pathname.split('/').pop();
  const say = (m) => parent.postMessage(JSON.stringify({ ...m, id: 1, channel: 'widget' }), '*');
  let started = false;
  let state = -1;
  let time = Number(new URLSearchParams(location.search).get('start') || 0);
  // an ad first, if asked: 1.5 s of another video, "playing"
  let ad = ${JSON.stringify(mode)} === 'ad' ? 6 : 0;
  const tick = () => {
    if (ad > 0) {
      ad--;
      say({ event: 'infoDelivery', info: { playerState: 1, currentTime: (6 - ad) / 4, videoData: { video_id: 'someAdVideo', title: 'an ad' } } });
      return;
    }
    if (state === 1) time += 0.25;
    say({ event: 'infoDelivery', info: { playerState: state, currentTime: time, videoData: { video_id: id, title: 'the program' } } });
  };
  addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.event === 'listening' && !started) {
      started = true;
      if (${JSON.stringify(mode)} === 'refuse') return say({ event: 'onError', info: 150 });
      say({ event: 'initialDelivery', info: { playerState: -1, duration: 600, videoData: { video_id: id } } });
      say({ event: 'onReady', info: null });
      setTimeout(() => (state = 1), 300);
      setInterval(tick, 250);
    }
    if (m.event === 'command') {
      window.commands.push(m.func + ':' + JSON.stringify(m.args));
      if (m.func === 'pauseVideo') state = 2;
      if (m.func === 'playVideo') state = 1;
      if (m.func === 'seekTo') time = m.args[0];
    }
  });
</script></body></html>`;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function run(label, modeFor) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const mode = modeFor(id);
    if (mode === 'silent') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>nothing</title>' });
    return route.fulfill({ contentType: 'text/html', body: FAKE_PLAYER(mode) });
  });
  await page.goto('http://localhost:5173/?skip&open=tv');
  await page.waitForFunction(() => window.room1995?.clock.started, null, { timeout: 20000 }); // the room opens once its voices and music are in
  await page.waitForTimeout(800);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => {
    const tv = window.room1995.tv;
    tv.channel = 9;
    tv.ears = [-18, 58];
    tv.setPower(true);
  });
  const onAir = () =>
    ev(() => {
      const c = window.room1995.clock;
      const item = window.room1995.tv.channels.get(9).timeline.at(c.now());
      return { kind: item.seg.kind, scene: item.seg.scene ?? null, clip: item.seg.clip?.id ?? null, start: item.start, end: item.end, now: c.now() };
    });
  // jump to the start of the next clip
  const toNextClip = async () => {
    for (let i = 0; i < 6; i++) {
      const it = await onAir();
      if (it.kind === 'clip' && it.now - it.start < 2) return it;
      await ev((to) => window.room1995.clock.skip(to), it.end - it.now + 0.05);
      await page.waitForTimeout(150);
    }
    return onAir();
  };
  const frameState = () =>
    ev(() => {
      const f = document.querySelector('.tv-clip');
      return f ? { src: f.src.replace(/\?.*/, ''), visible: f.style.visibility, video: window.room1995.tv.showingVideo } : null;
    });

  console.log(`\n== ${label}`);
  const first = await toNextClip();
  console.log('on air:', first.kind, first.clip);
  await page.waitForTimeout(1500);
  console.log('player:', JSON.stringify(await frameState()));
  return { page, ev, onAir, toNextClip, frameState, errors };
}

const youtube = (ev) => ev(() => window.room1995.tv.youtube);

// 1. everything plays
{
  const { page, ev, onAir, frameState, errors } = await run('the player plays', () => 'play');
  const player = page.frames().find((f) => f.url().includes('youtube-nocookie'));
  const shown = await frameState();
  console.log('commands so far:', JSON.stringify(await player.evaluate(() => window.commands)));
  await ev(() => (window.room1995.tv.volume = 0.2));
  await page.waitForTimeout(400);
  console.log('after turning it down:', JSON.stringify(await player.evaluate(() => window.commands.slice(-2))));
  // out of view it pauses; back up close, it picks up where the channel is
  await ev(() => window.room1995.closeups.close());
  await page.waitForTimeout(400);
  const away = { ...(await frameState()), last: await player.evaluate(() => window.commands.at(-1)) };
  await page.waitForTimeout(2000);
  await ev(() => window.room1995.closeups.open('tv'));
  await page.waitForTimeout(500);
  const back = { ...(await frameState()), last: await player.evaluate(() => window.commands.slice(-2)) };
  console.log('away:', JSON.stringify(away), '| back:', JSON.stringify(back));
  const counts = await youtube(ev);
  console.log('counts:', JSON.stringify(counts));
  if (shown.visible !== '' || !shown.video || away.video || away.last !== 'pauseVideo:[]' || !back.video || !/^seekTo/.test(back.last[0]) || back.last[1] !== 'playVideo:[]') throw new Error('the player should show, pause out of view, and pick up');
  if (counts.n_yt < 1 || counts.n_yt_on < 1 || counts.n_yt_other !== 0 || JSON.stringify(counts).includes('the program')) throw new Error('the counts are off');
  // over to Cadena Uno and back: Canal A's player waits, paused, and isn't loaded again
  const loads = counts.n_yt;
  await ev(() => {
    const tv = window.room1995.tv;
    tv.channel = 7;
    tv.ears = [-34, 38];
  });
  await page.waitForTimeout(1500);
  const onSeven = await ev(() => [...document.querySelectorAll('.tv-clip')].map((f) => `${f.src.replace(/\?.*/, '').split('/').pop()}:${f.style.visibility || 'shown'}`));
  const nineMeanwhile = await player.evaluate(() => window.commands.at(-1));
  await ev(() => {
    const tv = window.room1995.tv;
    tv.channel = 9;
    tv.ears = [-18, 58];
  });
  await page.waitForTimeout(800);
  const backOnNine = { frames: await ev(() => document.querySelectorAll('.tv-clip').length), last: await player.evaluate(() => window.commands.slice(-2)), loads: (await youtube(ev)).n_yt - loads };
  console.log('on 7:', onSeven.join(' '), '| 9 meanwhile:', nineMeanwhile, '| back on 9:', JSON.stringify(backOnNine));
  if (onSeven.length !== 2 || nineMeanwhile !== 'pauseVideo:[]' || backOnNine.frames !== 2 || backOnNine.loads !== 1 || !/^seekTo/.test(backOnNine.last[0]) || backOnNine.last[1] !== 'playVideo:[]') throw new Error('each channel should keep its player');
  // the tape runs out before the slot does: the channel moves on
  const before = await onAir();
  await player.evaluate(() => parent.postMessage(JSON.stringify({ event: 'onStateChange', info: 0, id: 1, channel: 'widget' }), '*'));
  await page.waitForTimeout(300);
  const after = await onAir();
  console.log('after it ended:', JSON.stringify(await frameState()), '→ on air:', after.kind, after.scene ?? after.clip, `(clip cut after ${(after.start - before.start).toFixed(1)} s)`);
  // the afternoon's timetable on both channels, 5:30 to after the anthem (decoded last, a few seconds in)
  await page.waitForFunction(() => !!window.room1995.library.anthem(), null, { timeout: 30000 });
  const grid = await ev(() => {
    const clock = (t) => { const s = Math.round(t) + 30 * 60; return `5:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`.replace(/^5:(6\d)/, (_, m) => `6:${String(m - 60).padStart(2, '0')}`); };
    return Object.fromEntries([7, 9].map((n) => {
      const tl = window.room1995.tv.channels.get(n).timeline;
      tl.ensure(2100);
      return [n, tl.items.filter((x) => x.end > 0 && x.start < 2100).map((x) => `${clock(x.start)} ${x.seg.kind === 'clip' ? `${x.seg.clip.id}@${Math.round(x.seg.clip.start)}` : x.seg.scene ?? x.seg.kind}`)];
    }));
  });
  console.log('Cadena Uno:', grid[7].join(' | '));
  console.log('Canal A:', grid[9].join(' | '));
  const at = (n, prefix) => grid[n].find((x) => x.startsWith(prefix));
  if (!at(7, '5:30:00 92NxNiCDwZs@0') || !at(7, '6:00:00 anthem') || !grid[7].some((x) => /^6:0\d:\d\d zxKV5Lfi1Xk@306/.test(x))) throw new Error('Cadena Uno is off its timetable');
  if (!at(9, '6:00:00 anthem') || !grid[9].some((x) => / c991HevT0RE@0$/.test(x))) throw new Error('Canal A is off its timetable');
  if (errors.length) console.log('ERRORS', errors);
  await page.close();
}

// 2. an ad first
{
  const { page, ev, errors } = await run('an ad first', () => 'ad');
  await page.waitForTimeout(2500);
  const counts = await youtube(ev);
  console.log('counts:', JSON.stringify(counts), '| showing:', await ev(() => window.room1995.tv.showingVideo));
  if (counts.n_yt_other < 1 || counts.n_yt_on < 1 || counts.s_yt_wait < 1.4 || !/1o>1/.test(counts.yt_seq) || /someAdVideo|an ad/.test(JSON.stringify(counts))) throw new Error('the ad should show and be counted, without its name');
  if (errors.length) console.log('ERRORS', errors);
  await page.close();
}

// 3. Rock al Parque is refused
{
  const { page, ev, onAir, errors } = await run('one clip is refused', (id) => (id === '84DTd4OBC9Y' ? 'refuse' : 'play'));
  // let Canal A run through ten segments, a jump at a time
  for (let i = 0; i < 10; i++) {
    const it = await onAir();
    await ev((to) => window.room1995.clock.skip(to), it.end - it.now + 0.05);
    await page.waitForTimeout(700);
  }
  const aired = await ev(() => {
    const c = window.room1995.clock;
    return window.room1995.tv.channels
      .get(9)
      .timeline.items.filter((x) => x.start < c.now() && x.seg.kind === 'clip')
      .map((x) => `${x.seg.clip.id}${x.cut ? ` (cut after ${(x.end - x.start).toFixed(1)} s)` : ''}`);
  });
  console.log('clips aired:', aired.join(' → '));
  if (errors.length) console.log('ERRORS', errors);
  await page.close();
}

// 4. YouTube is unreachable
{
  const { page, onAir, errors } = await run('the player never answers', () => 'silent');
  await page.waitForTimeout(9000);
  const it = await onAir();
  console.log('after 9 s of silence:', it.kind, it.scene);
  const kinds = await page.evaluate(() => {
    const c = window.room1995.clock;
    const tl = window.room1995.tv.channels.get(9).timeline;
    tl.ensure(c.now() + 900);
    return tl.items.filter((x) => x.start > c.now()).slice(0, 6).map((x) => x.seg.scene ?? x.seg.kind);
  });
  console.log('coming up:', kinds.join(', '));
  if (errors.length) console.log('ERRORS', errors);
  await page.close();
}

await browser.close();
