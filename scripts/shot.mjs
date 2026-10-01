// Take screenshots of the running dev server with Playwright.
// Usage: node scripts/shot.mjs <url-path> <out.png> [waitMs] [actions-json]
import { chromium } from 'playwright';

const [, , path = '/?skip', out = 'shot.png', wait = '1500', actions = '[]'] = process.argv;
const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://localhost:5173${path}`);
await page.waitForTimeout(Number(wait));
for (const a of JSON.parse(actions)) {
  if (a.click) await page.mouse.click(a.click[0], a.click[1]);
  if (a.move) await page.mouse.move(a.move[0], a.move[1]);
  if (a.drag) { await page.mouse.move(a.drag[0], a.drag[1]); await page.mouse.down(); await page.mouse.move(a.drag[2], a.drag[3], { steps: a.steps ?? 12 }); await page.mouse.up(); }
  if (a.key) await page.keyboard.press(a.key);
  if (a.eval) console.log('eval:', JSON.stringify(await page.evaluate(a.eval)));
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
if (errors.length) console.log([...new Set(errors)].slice(0, 12).join('\n'));
await browser.close();
