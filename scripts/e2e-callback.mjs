// End-to-end: leave a message with Andrés's mother, let the callback ring
// until your mother answers in the kitchen, then pick up.
// Needs the dev server on :5173.
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?skip&open=phone');
await page.waitForFunction(() => window.room1995?.clock.started, null, { timeout: 20000 }); // the room opens once its voices and music are in
await page.waitForTimeout(800);
const ev = (fn) => page.evaluate(fn);
const waitChoices = async () => {
  for (let i = 0; i < 80; i++) {
    const n = await ev(() => document.querySelectorAll('#dialogue button').length);
    if (n) return;
    await page.waitForTimeout(250);
  }
  throw new Error('no choices');
};
await ev(() => window.room1995.phone.lift());
for (const d of '2483107') {
  await page.keyboard.press(d);
  await page.waitForFunction(() => { const p = window.room1995.phone; return !p.returning && p.autoDial === null; });
}
for (const choice of [1, 1, 1]) {
  await waitChoices();
  await page.keyboard.press(String(choice));
}
await page.waitForTimeout(6000);
console.log('message left at', await ev(() => window.room1995.flags.andresMessageAt));
await ev(() => window.room1995.phone.hangUp());
await ev(() => window.room1995.closeups.close());
// jump to when he gets home (the bakery call already happened), and let the phone ring
await ev(() => { window.room1995.phone.fired.wrong = true; const c = window.room1995.clock; c.skip(800 - c.now()); });
await page.waitForTimeout(3000);
console.log('ringing:', await ev(() => !!window.room1995.phone.incoming));
const seen = new Set();
for (let i = 0; i < 90; i++) {
  await page.waitForTimeout(500);
  for (const t of await ev(() => [...document.querySelectorAll('.sub-house')].map((e) => e.textContent))) seen.add(t);
}
const house = [...seen];
console.log('from the kitchen:', JSON.stringify(house), 'mom answered:', await ev(() => window.room1995.phone.incoming?.momAnswered));
await ev(() => { window.room1995.closeups.open('phone'); window.room1995.phone.lift(); });
await page.waitForTimeout(1500); // his recorded line lasts about 3.5 s
console.log('on the line:', JSON.stringify(await ev(() => [...document.querySelectorAll('.sub-phone')].map((e) => e.textContent))));
if (errors.length) console.log('ERRORS', errors);
await browser.close();
