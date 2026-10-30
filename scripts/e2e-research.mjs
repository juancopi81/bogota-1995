// End-to-end: the test from the door to the thanks. The door and its line
// (the yes), "Más detalles" and the ways in from there, a few things in the
// room, the way out, the exit questions, and what the record ends up holding.
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
await page.waitForSelector('#entrance .door');
await shot('door');
await page.waitForTimeout(800);
// a click on the wall beside the door isn't a knock
await page.mouse.click(40, 40);
await page.waitForTimeout(300);
const notByClickingBeside = !(await page.$('#entrance.knock')) && (await fields()).stage === 'load';
// the line under the door is readable at this window's size
const notice = await page.$eval('#entrance .notice', (el) => ({ text: el.textContent, px: el.getBoundingClientRect().height, visible: el.getBoundingClientRect().bottom <= innerHeight }));
// "Más detalles" says what's kept, and "Volver" goes back to the door
await page.click('#entrance .more');
await page.waitForSelector('#research');
const details = await page.$eval('#research', (el) => el.textContent);
await shot('details');
await page.click('#research [data-act="back"]');
const backToDoor = (await page.$('#research')) === null && (await fields()).stage === 'load';
// the door has the focus again: the keyboard alone knocks, and no questions come before the room
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.room1995.clock.started, null, { timeout: 20000 });
const walkedIn = await fields();
const entrance = {
  notByClickingBeside,
  notice: /anónima/.test(notice.text) && notice.visible,
  details: /anónimo/.test(details) && /mayores de 18/.test(details) && /sin que se registre/.test(details),
  backToDoor,
  stage: walkedIn.stage,
  s_entrance: walkedIn.s_entrance,
  visitor: !!walkedIn.visitor,
  noQuestions: (await page.$('#research')) === null,
};
console.log('entrance:', JSON.stringify(entrance));
if (!notByClickingBeside || !entrance.notice || !entrance.details || !backToDoor || walkedIn.stage !== 'consent' || !(walkedIn.s_entrance > 0) || !entrance.visitor || !entrance.noQuestions) throw new Error('the entrance is off');
await page.waitForSelector('#entrance', { state: 'detached' });

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
console.log('exit:', JSON.stringify(pickOut(['stage', 'visit_n', 'post_nostalgia', 'change', 'memory', 'memory_share', 'triggers', 'return_intent', 'trait_often', 'trait_prone', 'exit_reason'])));
console.log('log:', JSON.stringify(pickOut(['s_total', 's_view_grabadora', 's_view_phone', 's_view_room', 's_phone', 'calls', 'opens', 'n_andres_rang', 'min_room', 'min_at_exit', 'exit_shown', 'n_yt'])));
// what YouTube's player on the TV reported goes with the log (here the TV stayed off)
if (f.n_yt !== 0) throw new Error("the TV's YouTube counts should be in the record");
console.log('overlay gone:', (await page.$('#research')) === null, '| backstage gear hidden:', await page.$eval('#backstage-toggle', (b) => getComputedStyle(b).display === 'none'));
// the dog opens the door too
const byDog = await browser.newPage({ viewport: { width, height } });
byDog.on('pageerror', (e) => errors.push(e.message));
await byDog.goto('http://localhost:5173/?research');
await byDog.click('#entrance .dog-hit');
await byDog.waitForFunction(() => window.room1995.clock.started, null, { timeout: 20000 });
const dogStage = await byDog.evaluate(() => window.room1995.study.record.last?.fields.stage);
// "Entrar sin que se registre": the same room, only that is counted, and no way-out questions
const unlogged = await browser.newPage({ viewport: { width, height } });
unlogged.on('pageerror', (e) => errors.push(e.message));
await unlogged.goto('http://localhost:5173/?research');
await unlogged.click('#entrance .more');
await unlogged.click('#research [data-act="unlogged"]');
await unlogged.waitForFunction(() => window.room1995.clock.started, null, { timeout: 20000 });
const quiet = await unlogged.evaluate(() => ({ stage: window.room1995.study.record.last?.fields.stage, visitor: window.room1995.study.record.last?.fields.visitor ?? null, leave: !!document.querySelector('#leave') }));
console.log('other ways in:', JSON.stringify({ dogStage, unlogged: quiet }));
if (dogStage !== 'consent' || quiet.stage !== 'declined' || quiet.visitor || quiet.leave) throw new Error('the other ways in are off');
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
await browser.close();
