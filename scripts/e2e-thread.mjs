// End-to-end: call the Radioactiva cabina, request a song with a dedication,
// wait for it to air, record it, rewind, play it back.
// Needs the dev server on :5173.  Usage: node scripts/e2e-thread.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/?skip&open=phone');
await page.waitForFunction(() => window.room1995?.clock.started, null, { timeout: 20000 }); // the room opens once its voices and music are in
await page.waitForTimeout(800);
const state = () => page.evaluate(() => ({ state: window.room1995.phone.state, choices: [...document.querySelectorAll('#dialogue button')].map((b) => b.textContent) }));
const waitChoices = async (ms = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await state();
    if (s.choices.length) return s.choices;
    if (s.state === 'busy') return null;
    await page.waitForTimeout(250);
  }
  return null;
};
const dial = async (number) => {
  for (const d of number) {
    await page.keyboard.press(d);
    await page.waitForFunction(() => { const p = window.room1995.phone; return !p.returning && p.autoDial === null; }, null, { timeout: 8000 });
  }
};

let answered = false;
for (let attempt = 1; attempt <= 4 && !answered; attempt++) {
  await page.mouse.click(530, 262); // lift
  await page.waitForTimeout(400);
  await dial('2859797');
  await page.waitForTimeout(4000);
  const s = await state();
  console.log(`attempt ${attempt}: ${s.state}`);
  if (s.state === 'busy') {
    await page.mouse.click(530, 262 - 60); // the lifted handset: hang up
    await page.evaluate(() => window.room1995.phone.hangUp());
    await page.waitForTimeout(500);
    continue;
  }
  answered = true;
}
const pick = async (i) => {
  const choices = await waitChoices();
  console.log('choices:', choices);
  await page.keyboard.press(String(i));
  await page.waitForTimeout(300);
};
await pick(1); // «Florecita rockera»
await pick(1); // para Angie
await pick(1); // desde Chapinero
await page.waitForTimeout(7000);
const req = await page.evaluate(() => {
  const r = window.room1995;
  const st = r.grabadora.radio.station('radioactiva');
  const item = st.timeline.items.find((i) => i.seg.kind === 'song' && i.seg.request);
  return { flags: r.flags.request, now: r.clock.now(), songStart: item && item.start, over: item && item.cues.map((c) => c.line.text) };
});
console.log('request:', JSON.stringify(req));

// jump to 20 s before the song, set up REC + PAUSE, release PAUSE as it starts
await page.evaluate(() => window.room1995.phone.hangUp());
await page.evaluate((to) => { const c = window.room1995.clock; c.skip(to - c.now()); }, req.songStart - 20);
await page.evaluate(() => window.room1995.closeups.open('grabadora'));
await page.waitForTimeout(800);
const key = (k) => page.click(`#cu-grabadora .key[data-key="${k}"]`);
await key('pause');
await key('rec');
await page.waitForTimeout(19500);
await key('pause'); // released: recording
await page.waitForTimeout(8000);
const onAir = await page.evaluate(() => ({ subs: [...document.querySelectorAll('.sub')].map((e) => e.textContent), aired: window.room1995.flags.requestAiredAt }));
console.log('on air:', JSON.stringify(onAir));
await page.screenshot({ path: process.argv[2] ?? 'e2e.png' });
await key('stop');
await page.waitForTimeout(800);
const tape = await page.evaluate(() => window.room1995.grabadora.deck.cassette.segments().map((s) => [s.start.toFixed(1), s.dur.toFixed(1)]));
console.log('tape:', JSON.stringify(tape));
await key('rew');
await page.waitForTimeout(3000);
await key('play');
await page.waitForTimeout(1500);
console.log('tape subtitles:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.sub-tape')].map((e) => e.textContent))));
console.log('playback:', JSON.stringify(await page.evaluate(() => { const d = window.room1995.grabadora.deck; return { transport: d.transport, tapeAudible: d.tapeAudible, pos: d.cassette.pos.toFixed(1) }; })));
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
await browser.close();
