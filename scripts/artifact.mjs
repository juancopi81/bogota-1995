// Shapes dist-artifact/index.html for a claude.ai artifact: the host wraps the
// page in its own <html>, <head> and <body>, so we keep only what goes inside
// (the title first, where it's looked for), plus the styles, the mount point
// and the inlined script.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'dist-artifact/index.html';
const html = readFileSync(path, 'utf8');

// take the scripts out first: the code holds markup of its own (the room's art)
const scripts = [];
const rest = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (m) => {
  scripts.push(m);
  return '';
});
const titles = rest.match(/<title>[\s\S]*?<\/title>/g) ?? [];
const styles = rest.match(/<style\b[^>]*>[\s\S]*?<\/style>/g) ?? [];
const body = rest.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1].trim();
if (titles.length !== 1 || !styles.length || scripts.length !== 1 || !body?.includes('id="app"')) {
  throw new Error(`unexpected build output: ${titles.length} titles, ${styles.length} styles, ${scripts.length} scripts, body ${body ? 'ok' : 'missing'}`);
}

const description = '<meta name="description" content="Un cuarto en Chapinero, sábado 28 de octubre de 1995, 5:30 p.m. Está lloviendo.">';
const out = [titles[0], description, ...styles, body, ...scripts].join('\n');
writeFileSync(path, out + '\n');
console.log(`artifact page: ${path} (${(out.length / 1024).toFixed(0)} KB)`);
