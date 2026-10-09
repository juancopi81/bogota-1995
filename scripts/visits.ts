// How long visitors stayed in the room, and which of the afternoon's moments
// they were still there for. Reads the sheet's "visitas" tab, downloaded as
// CSV (File → Download → Comma-separated values) into media/private/, which
// is never committed.
//
//   npm run visits                                  media/private/visitas.csv
//   npm run visits -- other.csv --skip edf73d       leave out a browser (your own tests)
//   npm run visits -- --campaign calibracion        only the visits from one ad campaign (utm_campaign)

import { readFileSync } from 'node:fs';
import { clockParts } from '../src/world/clock';
import { MOMENTS } from '../src/research/moments';

type Row = Record<string, string>;

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks (the memories do). */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...body] = rows.filter((r) => r.some((f) => f !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// a sheet in a Spanish locale downloads 3.5 as 3,5
const num = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v.replace(/^(-?\d+),(\d+)$/, '$1.$2')));
const count = (v: string | undefined) => num(v) ?? 0;
const yes = (v: string | undefined) => /^(true|verdadero|sí|si|1)$/i.test(v ?? '');
const share = (k: number, of: number) => (of ? `${Math.round((100 * k) / of)}%` : '–');
const clock = (t: number) => {
  const { hour, minute, second } = clockParts(t);
  return `${hour - 12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
};

const args = process.argv.slice(2);
const option = (name: string) => args.flatMap((a, i) => (args[i - 1] === name ? [a] : []));
const skip = option('--skip');
const campaigns = option('--campaign');
const path = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'media/private/visitas.csv';

const all = parseCsv(readFileSync(path, 'utf8'));
const rows = all.filter((r) => !skip.some((id) => r.visitor && r.visitor.startsWith(id)) && (!campaigns.length || campaigns.includes(r.ref_campaign)));
const kept = [skip.length && `leaving out ${skip.join(', ')}`, campaigns.length && `campaign ${campaigns.join(', ')}`].filter(Boolean).join('; ');
console.log(`${all.length} visits in ${path}${kept ? ` (${kept}): ${rows.length} kept` : ''}\n`);

console.log('How far they got');
for (const stage of ['load', 'gate', 'declined', 'consent', 'door', 'room', 'exit', 'done']) {
  const k = rows.filter((r) => r.stage === stage).length;
  if (k) console.log(`  ${stage.padEnd(9)} ${String(k).padStart(4)}`);
}

// minutes inside, counted while the room's tab was showing (the clock runs on when it isn't)
const minutes = (r: Row) => num(r.min_room) ?? (num(r.s_total) !== null ? num(r.s_total)! / 60 : null);
const inside = rows.filter((r) => ['room', 'exit', 'done'].includes(r.stage) && minutes(r) !== null);
const mins = inside.map((r) => minutes(r)!).sort((a, b) => a - b);
console.log(`\nMinutes in the room (${inside.length} visits that got in)`);
if (mins.length) {
  const q = (p: number) => mins[Math.round(p * (mins.length - 1))];
  console.log(`  median ${q(0.5).toFixed(1)} · middle half ${q(0.25).toFixed(1)}–${q(0.75).toFixed(1)} · longest ${mins.at(-1)!.toFixed(1)}`);
}

console.log('\nStill inside when it came up');
for (const m of MOMENTS) {
  const k = mins.filter((x) => x * 60 >= m.at).length;
  console.log(`  ${(m.at / 60).toFixed(1).padStart(5)} min  ${clock(m.at)}  ${share(k, mins.length).padStart(4)} (${k}/${mins.length})  ${m.what}`);
}
console.log(`  reached_6pm (exact): ${inside.filter((r) => yes(r.reached_6pm)).length}/${inside.length}`);

const STEPS = ['rang', 'answered', 'asked', 'taped', 'not_taped'];
const did = (label: string, test: (r: Row) => boolean) => console.log(`  ${label.padEnd(20)} ${inside.filter(test).length}/${inside.length}`);
console.log('\nWhat happened');
for (const s of STEPS) did(`Andrés ${s.replace('_', ' ')}`, (r) => count(r[`n_andres_${s}`]) > 0);
did('requested a song', (r) => count(r.n_request) > 0);
did('heard it air', (r) => count(r.n_request_aired) > 0);
did('recorded (REC)', (r) => count(r.n_rec) > 0);
const left: Record<string, number> = {};
for (const r of inside) left[r.exit_reason || 'closed the tab'] = (left[r.exit_reason || 'closed the tab'] ?? 0) + 1;
console.log(`  how they left: ${Object.entries(left).map(([how, k]) => `${how} ${k}`).join(' · ')}`);

console.log('\nEach visit');
console.log('  visitor visit   build    stage   min  6pm  Andrés                     request  radio s  tv s  phone s  dialed');
for (const r of inside) {
  const andres = STEPS.filter((s) => count(r[`n_andres_${s}`]) > 0).join('>') || '–';
  const radio = Object.entries(r).filter(([k]) => k.startsWith('s_radio_')).reduce((sum, [, v]) => sum + count(v), 0);
  console.log(
    [
      `  ${(r.visitor ?? '').slice(0, 6).padEnd(7)}`,
      (r.visit ?? '').slice(0, 6).padEnd(7),
      (r.build ?? '').slice(0, 7).padEnd(8),
      r.stage.padEnd(6),
      minutes(r)!.toFixed(1).padStart(4),
      (yes(r.reached_6pm) ? 'yes' : '–').padEnd(4),
      andres.padEnd(26),
      `${count(r.n_request)}/${count(r.n_request_aired)}`.padEnd(8),
      String(radio).padStart(7),
      String(count(r.s_tv)).padStart(5),
      String(count(r.s_phone)).padStart(8),
      ` ${r.calls ?? ''}`,
    ].join(' '),
  );
}
