// End-to-end: loading your own files in the backstage.
//
// Builds its own test files (silent MP3 frames, some with ID3 tags), then
// loads them the three ways the backstage takes them: picking files, picking
// a folder, and dropping on the page. Needs the dev server on :5173.
import { chromium } from 'playwright';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

// ---------- test files ----------

// one MPEG-1 Layer III frame of silence: 128 kbps, 44.1 kHz, mono, 417 bytes
const FRAME = [0xff, 0xfb, 0x90, 0xc0, ...new Array(413).fill(0)];
const silence = (seconds) => Array.from({ length: Math.ceil((seconds * 44100) / 1152) }, () => FRAME).flat();
const latin1 = (s) => [...s].map((c) => c.charCodeAt(0));
const utf8 = (s) => [...new TextEncoder().encode(s)];
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const syncsafe = (n) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
function id3(tags) {
  const frames = Object.entries(tags).flatMap(([id, text]) => {
    const data = [3, ...utf8(text)];
    return [...latin1(id), ...be32(data.length), 0, 0, ...data];
  });
  return [...latin1('ID3'), 3, 0, 0, ...syncsafe(frames.length), ...frames];
}
const mp3 = (tags, seconds = 1.5) => Buffer.from([...(tags ? id3(tags) : []), ...silence(seconds)]);

const dir = mkdtempSync(join(tmpdir(), 'room1995-'));
const put = (path, data) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), data);
  return join(dir, path);
};
const loose = [
  put('sueltos/Aterciopelados - Bolero falaz.mp3', mp3()),
  put('sueltos/Track 07.mp3', mp3({ TIT2: 'La ingrata', TPE1: 'Café Tacvba' })),
  put('sueltos/Himno Nacional de Colombia.mp3', mp3(null, 3)),
  put('sueltos/llamada.andres.hola.mp3', mp3(null, 1)),
  put('sueltos/vacaciones.mp3', mp3()),
  put('sueltos/Matador.mp3', Buffer.from('this is not audio at all, just text pretending')),
];
put('carpeta/Musica/Caifanes/Afuera.mp3', mp3());
put('carpeta/Musica/Soda Stereo/05.mp3', mp3({ TIT2: 'Ella usó mi cabeza como un revólver', TPE1: 'Soda Stereo' }));
put('carpeta/voces/llamada.andres.chao.mp3', mp3(null, 1));
put('carpeta/Musica/notas.txt', 'no es audio');
put(
  'carpeta/lista.csv',
  'titulo,artista_o_grupo,emisora,archivo_mp3_sugerido\nAfuera,Caifanes,Radioacktiva 97.9,Afuera.mp3\n"Ella usó mi cabeza como un revólver",Soda Stereo,Súper Estación 88.9,05.mp3\nEl santo cachón,Los Embajadores Vallenatos,Tropicana 102.9,santo.mp3\n',
);

// ---------- the run ----------

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/?skip');
await page.waitForTimeout(1200);
await page.keyboard.press('`');
const report = () => page.locator('#backstage .load-report').textContent();
const waitDone = async () => {
  await page.waitForFunction(() => /Listo|No reconocí/.test(document.querySelector('#backstage .load-report')?.textContent ?? ''), null, { timeout: 30000 });
  return report();
};
const loaded = () =>
  page.evaluate(() => {
    const { library, voices } = window.room1995;
    const songs = ['bolero-falaz', 'la-ingrata', 'zombie', 'afuera', 'ella-uso-mi-cabeza', 'gota-fria', 'matador'].filter((id) => library.isUploaded(id));
    return { songs, anthem: !!library.anthem(), voices: ['llamada.andres.hola', 'llamada.andres.chao'].filter((id) => voices.has(id)) };
  });

// 1. pick loose files
await page.setInputFiles('#backstage input[data-files]', loose);
console.log('files:', await waitDone());
console.log('unknown:', await page.locator('#backstage .path').allTextContents());
// 2. say what the unknown one is
await page.selectOption('#backstage select[data-assign="0"]', 'song:zombie');
await page.waitForFunction(() => window.room1995.library.isUploaded('zombie'));
console.log('assigned:', await report());
// 3. pick a folder
await page.setInputFiles('#backstage input[data-folder]', join(dir, 'carpeta'));
await page.waitForFunction(() => window.room1995.library.isUploaded('afuera'), null, { timeout: 30000 });
await waitDone();
console.log('folder:', (await page.locator('#backstage .load-report').innerText()).replace(/\n/g, ' | '));
// 4. drop a file on the room
await page.keyboard.press('`');
const dropped = [...mp3({ TIT2: 'La gota fría', TPE1: 'Carlos Vives' })];
await page.evaluate((bytes) => {
  const dt = new DataTransfer();
  dt.items.add(new File([new Uint8Array(bytes)], 'cancion.mp3', { type: 'audio/mpeg' }));
  window.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
  window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, dropped);
await page.waitForFunction(() => window.room1995.library.isUploaded('gota-fria'), null, { timeout: 30000 });
console.log('drop:', await waitDone(), '| panel open:', await page.evaluate(() => document.querySelector('#backstage').classList.contains('open')));
console.log('loaded:', JSON.stringify(await loaded()));
console.log('headings:', (await page.locator('#backstage h3').allTextContents()).join(' | '));
// 5. erase asks twice
await page.click('#backstage button[data-erase]');
console.log('erase button after one press:', await page.locator('#backstage button[data-erase]').textContent());
await page.screenshot({ path: process.argv[2] ?? join(dir, 'backstage.png') });
if (errors.length) console.log('ERRORS', errors);
await browser.close();
