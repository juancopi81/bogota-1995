// End-to-end: Canal A airs the approved real clips.
//
// YouTube can't be reached from the build environment, so a stand-in player
// answers for www.youtube-nocookie.com: it speaks the same postMessage
// protocol as the real one (listening → initialDelivery / infoDelivery,
// onError, commands). Three runs:
//   1. the player plays: the video shows and follows the volume knob;
//   2. one clip is refused: Canal A cuts to the next one and skips it after;
//   3. the player never answers (YouTube unreachable): Canal A goes back to
//      its invented programs.
// Needs the dev server on :5173.
import { chromium } from 'playwright';

const FAKE_PLAYER = (mode) => `<!doctype html><html><body style="margin:0;background:#468">
<script>
  window.commands = [];
  const id = location.pathname.split('/').pop();
  const say = (m) => parent.postMessage(JSON.stringify({ ...m, id: 1, channel: 'widget' }), '*');
  addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.event === 'listening') {
      if (${JSON.stringify(mode)} === 'refuse') return say({ event: 'onError', info: 150 });
      say({ event: 'initialDelivery', info: { playerState: -1, duration: 600 } });
      say({ event: 'onReady', info: null });
      setTimeout(() => say({ event: 'infoDelivery', info: { playerState: 1, currentTime: 0 } }), 300);
    }
    if (m.event === 'command') window.commands.push(m.func + ':' + JSON.stringify(m.args));
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

// 1. everything plays
{
  const { page, ev, onAir, frameState, errors } = await run('the player plays', () => 'play');
  const player = page.frames().find((f) => f.url().includes('youtube-nocookie'));
  console.log('commands so far:', JSON.stringify(await player.evaluate(() => window.commands)));
  await ev(() => (window.room1995.tv.volume = 0.2));
  await page.waitForTimeout(400);
  console.log('after turning it down:', JSON.stringify(await player.evaluate(() => window.commands.slice(-2))));
  // the tape runs out before the slot does: the channel moves on
  const before = await onAir();
  await player.evaluate(() => parent.postMessage(JSON.stringify({ event: 'onStateChange', info: 0, id: 1, channel: 'widget' }), '*'));
  await page.waitForTimeout(300);
  const after = await onAir();
  console.log('after it ended:', JSON.stringify(await frameState()), '→ on air:', after.kind, after.scene ?? after.clip, `(clip cut after ${(after.start - before.start).toFixed(1)} s)`);
  // Cadena Uno airs the real 1995 ads between the scenes of its telenovela
  const uno = await ev(() => {
    const c = window.room1995.clock;
    const tl = window.room1995.tv.channels.get(7).timeline;
    tl.ensure(c.now() + 1200);
    return tl.items.filter((x) => x.start > c.now()).slice(0, 12).map((x) => (x.seg.kind === 'clip' ? `ADS@${x.seg.clip.start}` : x.seg.scene ?? x.seg.kind));
  });
  console.log('channel 7 coming up:', uno.join(', '));
  if (errors.length) console.log('ERRORS', errors);
  await page.close();
}

// 2. Rock al Parque is refused
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

// 3. YouTube is unreachable
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
