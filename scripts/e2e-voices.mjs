// Real MP3 decoding and full coverage in a fresh browser profile.
// node scripts/e2e-voices.mjs http://127.0.0.1:4174/?skip [file:///.../dist-single/index.html?skip]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Fixed lines in the content (see docs/voice-script.md); those without a take yet play as subtitles. */
const LINES = 192;
const BUNDLED = JSON.parse(readFileSync(new URL('../src/assets/voices/manifest.json', import.meta.url), 'utf8')).clips.length;

const urls = process.argv.slice(2);
if (!urls.length) urls.push('http://localhost:5173/?skip');
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const url of urls) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    const errors = [], privateRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/\/media\/private\/|api\.elevenlabs\.io/.test(request.url())) privateRequests.push(request.url());
    });
    await page.goto(url);
    await page.locator('#backstage').waitFor({ state: 'attached' });
    await page.keyboard.press('`');
    await page.waitForFunction((heading) => [...document.querySelectorAll('#backstage h3')]
      .some(el => (el.textContent ?? '').includes(heading)), `Voces · ${BUNDLED} de ${LINES} líneas`, { timeout: 45000 });
    const heading = await page.locator('#backstage h3').filter({ hasText: 'Voces' }).textContent();
    const incomplete = await page.locator('#backstage .chips .chip:not(.full)').allTextContents();
    if (BUNDLED === LINES) assert.deepEqual(incomplete, [], 'Every speaker should have full recording coverage');
    else assert.ok(incomplete.length >= 1 && incomplete.length <= LINES - BUNDLED, `Only speakers with lines waiting for a take: ${incomplete}`);
    assert.deepEqual(errors, [], 'No uncaught app errors');
    assert.deepEqual(privateRequests, [], 'Playback must not request private media or ElevenLabs');
    console.log(JSON.stringify({ url, heading, complete_speakers: await page.locator('#backstage .chips .chip.full').count(),
      uncaught_errors: errors.length, private_or_provider_requests: privateRequests.length }));
    await context.close();
  }
} finally {
  await browser.close();
}
