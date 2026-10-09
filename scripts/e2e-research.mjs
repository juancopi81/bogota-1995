// End-to-end: the test from the title card to the thanks. Consent, the door
// questions, a few things in the room, the way out, the exit questions, and
// what the record ends up holding.
// Needs the dev server on :5173.  Usage: node scripts/e2e-research.mjs [screenshot-prefix]
import { chromium } from 'playwright';

const shots = process.argv[2];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => shots && (await page.screenshot({ path: `${shots}-${name}.png` }));
const fields = () => page.evaluate(() => window.room1995.study.record.last?.fields ?? null);
const pick = (q, id) => page.click(`#research [data-q="${q}"] button[data-id="${id}"]`);
const rate = async (q, values) => {
  for (const [item, v] of Object.entries(values)) await page.click(`#research [data-q="${q}.${item}"] button[data-v="${v}"]`);
};

await page.goto('http://localhost:5173/?research');
await page.waitForSelector('#title');
await page.waitForTimeout(800);
await page.click('#title');
await page.waitForSelector('#research');
await shot('consent');
await page.click('#research [data-act="yes"]');

await page.waitForSelector('#research [data-q="lived"]');
const disabledAtFirst = await page.$eval('#research [data-act="enter"]', (b) => b.disabled);
await pick('lived', 'bogota');
await pick('age', '15-19');
await rate('mood', { tranquilo: 5, nostalgico: 2, aburrido: 2, sentimientos: 3, contento: 5, ahora: 2 });
await shot('door');
await page.click('#research [data-act="enter"]');
await page.waitForFunction(() => window.room1995.clock.started, null, { timeout: 20000 });
console.log('door:', JSON.stringify({ disabledAtFirst, ...(await fields()) }));

// a little time in the room: the radio, then a call to 117
await page.evaluate(() => window.room1995.closeups.open('grabadora'));
await page.waitForTimeout(4000);
await page.evaluate(() => {
  window.room1995.closeups.open('phone');
  window.room1995.phone.lift();
});
for (const d of '117') {
  await page.keyboard.press(d);
  await page.waitForFunction(() => { const p = window.room1995.phone; return !p.returning && p.autoDial === null; });
}
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.room1995.phone.hangUp();
  window.room1995.closeups.close();
});
await page.waitForTimeout(1000);
// Andrés rings from the monedero at 5:31:15, and the log keeps it
await page.evaluate(() => { const c = window.room1995.clock; if (c.now() < 76) c.skip(76 - c.now()); });
await page.waitForFunction(() => !!window.room1995.phone.incoming, null, { timeout: 10000 });
await shot('room');

// the way out, in two steps: the six phrases, then the rest on one screen
await page.click('#leave');
await page.waitForSelector('#research [data-act="next"]');
const nextAtFirst = await page.$eval('#research [data-act="next"]', (b) => b.disabled);
await rate('mood', { tranquilo: 5, nostalgico: 5, aburrido: 1, sentimientos: 6, contento: 6, ahora: 4 });
await shot('exit1');
await page.click('#research [data-act="next"]');
await page.waitForSelector('#research [data-step="2"]:not([hidden]) [data-act="send"]');
const afterStep1 = await fields();
// nothing on the second step hides below the fold
const step2 = await page.$eval('#research .panel', (p) => ({ fits: p.scrollHeight <= p.clientHeight + 2, scrollHeight: p.scrollHeight, clientHeight: p.clientHeight }));
console.log('exit step 1:', JSON.stringify({ nextAtFirst, stage: afterStep1.stage, post_nostalgia: afterStep1.post_nostalgia, change: afterStep1.change }), '| step 2:', JSON.stringify(step2));
if (!nextAtFirst || afterStep1.stage !== 'exit' || !step2.fits) throw new Error('the exit steps are off');
await page.fill('#research [data-f="memory"]', 'La grabadora de mi hermano, grabando de Radioactiva.');
await page.check('#research [data-f="share"]');
await pick('triggers', 'radio');
await pick('triggers', 'grabadora');
await pick('return', 'si');
await rate('trait', { often: 4, prone: 5 });
await shot('exit2');
await page.click('#research [data-act="send"]');
await page.waitForSelector('#research [data-act="back"]');
// the thanks, with what other visitors left (made-up examples without a sheet)
await page.waitForSelector('#research .memories:not([hidden]) .note');
const notes = await page.$$eval('#research .note blockquote', (els) => els.map((e) => e.textContent));
console.log('notes:', notes.length, '| own memory to be shown once read:', await page.$eval('#research', (el) => el.textContent.includes('Cuando lo leamos')));
await shot('thanks');
await page.click('#research [data-act="back"]');
await page.waitForTimeout(500);

const f = await fields();
const pickOut = (keys) => Object.fromEntries(keys.map((k) => [k, f[k]]));
console.log('exit:', JSON.stringify(pickOut(['stage', 'visit_n', 'pre_nostalgia', 'post_nostalgia', 'change', 'memory', 'memory_share', 'triggers', 'return_intent', 'trait_often', 'trait_prone', 'exit_reason'])));
console.log('log:', JSON.stringify(pickOut(['s_total', 's_view_grabadora', 's_view_phone', 's_view_room', 's_phone', 'calls', 'opens', 'n_andres_rang', 'min_room', 'min_at_exit', 'exit_shown'])));
console.log('overlay gone:', (await page.$('#research')) === null, '| backstage gear hidden:', await page.$eval('#backstage-toggle', (b) => getComputedStyle(b).display === 'none'));
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
await browser.close();
