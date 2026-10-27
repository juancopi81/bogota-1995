// End-to-end: the test from the title card to the thanks. Consent, the door
// questions, a few things in the room, the way out, the exit questions, and
// what the record ends up holding.
// Needs the dev server on :5173.  Usage: node scripts/e2e-research.mjs [screenshot-prefix]
// E2E_VIEWPORT=1366x641 tries a small laptop's window instead of 1600×900.
import { chromium } from 'playwright';

const shots = process.argv[2];
const [width, height] = (process.env.E2E_VIEWPORT ?? '1600x900').split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width, height } });
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
await shot('title');
await page.waitForTimeout(800);
// the title card's button is the yes: a click beside it isn't
await page.mouse.click(40, 40);
await page.waitForTimeout(300);
const notByClickingBeside = (await page.$('#research')) === null;
// "Más detalles" says what taking part means, and "Volver" goes back to the card
await page.click('#title .more');
await page.waitForSelector('#research');
const details = await page.$eval('#research', (el) => el.textContent);
await shot('details');
await page.click('#research [data-act="back"]');
const backToTitle = (await page.$('#research')) === null && (await fields()).stage === 'load';
// the button has the focus again: the keyboard alone opens the door
await page.keyboard.press('Enter');

await page.waitForSelector('#research [data-q="lived"]');
const consented = (await fields()).stage;
const disabledAtFirst = await page.$eval('#research [data-act="enter"]', (b) => b.classList.contains('waiting'));
await pick('lived', 'bogota');
await rate('mood', { tranquilo: 5, nostalgico: 2 });
// trying to go in with three of eight answers marks the five missing, and stays at the door
await page.click('#research [data-act="enter"]');
const early = await page.$eval('#research', (el) => ({ missing: el.querySelectorAll('.missing').length, hint: el.querySelector('.hint').textContent }));
await shot('door-missing');
// left now, a visit at the door would still say how far it got
await page.evaluate(() => window.room1995.study.flush());
const leftAtDoor = await fields();
// readable at this window's size: the phrases' text and the scale's buttons
const sizes = await page.$eval('#research', (el) => ({
  text: parseFloat(getComputedStyle(el.querySelector('.likert .item span')).fontSize),
  button: el.querySelector('.scale button').getBoundingClientRect().height,
  fits: (({ scrollHeight, clientHeight }) => ({ scrollHeight, clientHeight }))(el.querySelector('.panel')),
  enterVisible: (() => { const r = el.querySelector('[data-act="enter"]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })(),
}));
await pick('age', '15-19');
await rate('mood', { aburrido: 2, sentimientos: 3, contento: 5, ahora: 2 });
await shot('door');
await page.click('#research [data-act="enter"]');
await page.waitForFunction(() => window.room1995.clock.started, null, { timeout: 20000 });
const entrance = { notByClickingBeside, details: /anónimo/.test(details) && /mayor de 18/.test(details), backToTitle, consented };
const atDoor = { ...entrance, disabledAtFirst, early, leftAtDoor: { stage: leftAtDoor.stage, n_door: leftAtDoor.n_door, lived_1995: leftAtDoor.lived_1995 ?? null }, sizes };
console.log('door:', JSON.stringify({ ...atDoor, ...(await fields()) }));
if (!notByClickingBeside || !entrance.details || !backToTitle || consented !== 'consent' || !disabledAtFirst || early.missing !== 5 || early.hint !== 'Faltan 5 respuestas.' || leftAtDoor.n_door !== 3 || leftAtDoor.lived_1995) throw new Error('the entrance is off');
if (sizes.text < 15 || sizes.button < 32 || !sizes.enterVisible) throw new Error(`the door is too small to read at ${width}×${height}`);

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
const nextAtFirst = await page.$eval('#research [data-act="next"]', (b) => b.classList.contains('waiting'));
await rate('mood', { tranquilo: 5, nostalgico: 5, aburrido: 1, sentimientos: 6, contento: 6, ahora: 4 });
await shot('exit1');
await page.click('#research [data-act="next"]');
await page.waitForSelector('#research [data-step="2"]:not([hidden]) [data-act="send"]');
await shot('exit2-empty');
const afterStep1 = await fields();
// nothing on the second step hides below the fold
const step2 = await page.$eval('#research .panel', (p) => ({ fits: p.scrollHeight <= p.clientHeight + 2, scrollHeight: p.scrollHeight, clientHeight: p.clientHeight }));
console.log('exit step 1:', JSON.stringify({ nextAtFirst, stage: afterStep1.stage, post_nostalgia: afterStep1.post_nostalgia, change: afterStep1.change }), '| step 2:', JSON.stringify(step2));
// (a phone that came in anyway scrolls: the phrases sit above their scales)
if (!nextAtFirst || afterStep1.stage !== 'exit' || (width > 640 && !step2.fits)) throw new Error('the exit steps are off');
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
