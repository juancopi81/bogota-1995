// End-to-end: Andrés's errand. He calls early from a monedero in Unicentro
// and asks for «Florecita rockera» on tape; you tape something; once he's
// home he calls to ask, and you can tell him it's on the cassette.
// Needs the dev server on :5173.  Usage: node scripts/e2e-errand.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?skip&t=60&open=phone');
await page.waitForFunction(() => window.room1995?.clock.started, null, { timeout: 30000 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const phoneSubs = () => ev(() => [...document.querySelectorAll('.sub-phone')].map((e) => e.textContent));
/** Waits for the choices on the line, and answers with the one starting with `text`. */
const answer = async (text) => {
  for (let i = 0; i < 120; i++) {
    const choices = await ev(() => [...document.querySelectorAll('#dialogue button')].map((b) => b.textContent));
    const at = choices.findIndex((c) => c.includes(text));
    if (at >= 0) {
      await page.keyboard.press(String(at + 1));
      return choices;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(`no choice "${text}"`);
};
/** Everything the other end says until the line goes busy. */
const listen = async () => {
  const heard = new Set();
  for (let i = 0; i < 160 && (await ev(() => window.room1995.phone.state)) !== 'busy'; i++) {
    for (const s of await phoneSubs()) heard.add(s);
    await page.waitForTimeout(250);
  }
  return [...heard];
};

// 5:31:15: the phone rings
await page.waitForFunction(() => !!window.room1995.phone.incoming, null, { timeout: 30000 });
const rangAt = await ev(() => window.room1995.clock.now());
console.log('rings at', rangAt.toFixed(1));
assert.ok(rangAt >= 75 && rangAt < 80);
await ev(() => window.room1995.phone.lift());
await page.waitForTimeout(2500);
const first = await phoneSubs();
console.log('he says:', JSON.stringify(first));
assert.ok(first.some((s) => s.includes('monedero')));
const offered = await answer('¿Quiubo, Andrés?');
console.log('you:', JSON.stringify(offered));
const favor = await answer('Sí, de una');
assert.ok(!favor.some((c) => c.startsWith('Ya tengo algo grabado')), 'nothing on the tape yet');
const rest = await listen();
console.log('then:', JSON.stringify(rest));
assert.ok(rest.some((s) => s.includes('monedas')));
assert.equal(await ev(() => window.room1995.flags.andresAsked), true);
await ev(() => window.room1995.phone.hangUp());

// tape a few seconds of the radio
await ev(() => window.room1995.closeups.open('grabadora'));
await page.waitForTimeout(800);
await page.click('#cu-grabadora .key[data-key="rec"]');
await page.waitForTimeout(3000);
await page.click('#cu-grabadora .key[data-key="stop"]');
await page.waitForTimeout(500);
console.log('on the tape:', await ev(() => window.room1995.grabadora.deck.cassette.segments().length), 'segment(s)');
await ev(() => window.room1995.closeups.close());

// he gets home at 5:42 and calls (the bakery's call already happened)
await ev(() => { window.room1995.phone.fired.wrong = true; const c = window.room1995.clock; c.skip(800 - c.now()); });
await page.waitForFunction(() => !!window.room1995.phone.incoming, null, { timeout: 15000 });
console.log('rings again at', (await ev(() => window.room1995.clock.now())).toFixed(1));
await ev(() => { window.room1995.closeups.open('phone'); window.room1995.phone.lift(); });
await page.waitForTimeout(2500);
const home = await phoneSubs();
console.log('he says:', JSON.stringify(home));
assert.ok(home.some((s) => s.includes('Ya llegué')));
await answer('¿Llegó bien?');
const check = await answer('Sí, ya la tengo');
console.log('you:', JSON.stringify(check));
const end = await listen();
console.log('then:', JSON.stringify(end));
assert.ok(end.some((s) => s.includes('¡Qué bacano!')));
assert.deepEqual(errors, []);
console.log('ok');
await browser.close();
