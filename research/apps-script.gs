// Receives the room's visits and keeps one row per visit in the sheet
// "visitas", one column per field (see docs/research-setup.md). Every send
// carries the whole visit, so later sends update the same row.
//
// It also hands the room the memories visitors agreed to share, once you've
// read them: write "sí" in the column "aprobado" of that row. To show a
// memory with names or details taken out, write the version to show in the
// column "recuerdo_publico"; the visitor's own words stay in "memory".
//
// Paste this into Extensions → Apps Script of a Google Sheet, then deploy it
// as a web app that anyone can reach.

const SHEET = 'visitas';
const MAX_FIELDS = 200;
const MAX_TEXT = 2000;

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply('bad json');
  }
  if (!data || data.v !== 1 || !/^[0-9a-f]{16}$/.test(String(data.visit)) || !data.fields || typeof data.fields !== 'object') {
    return reply('bad visit');
  }

  const row = { visit: data.visit, received: new Date().toISOString() };
  Object.keys(data.fields)
    .slice(0, MAX_FIELDS)
    .forEach((key) => {
      const value = data.fields[key];
      if (!/^[a-z0-9_]{1,40}$/.test(key) || ['string', 'number', 'boolean'].indexOf(typeof value) === -1) return;
      row[key] = typeof value === 'string' ? value.slice(0, MAX_TEXT) : value;
    });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);

    // the header grows as new fields show up; "visit" is always the first column
    const lastColumn = sheet.getLastColumn();
    let header = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
    const missing = Object.keys(row).filter((key) => header.indexOf(key) === -1);
    if (missing.length) {
      header = header.concat(missing);
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    }

    const lastRow = sheet.getLastRow();
    const ids = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map((r) => String(r[0])) : [];
    const found = ids.indexOf(data.visit);
    const at = found === -1 ? lastRow + 1 : found + 2;
    const values = found === -1 ? header.map(() => '') : sheet.getRange(at, 1, 1, header.length).getValues()[0];
    header.forEach((key, i) => {
      if (key in row) values[i] = row[key];
    });
    // text stays text: "10-14" isn't a date, and "=..." isn't a formula
    sheet.getRange(at, 1, 1, header.length).setValues([values.map((v) => (typeof v === 'string' && v !== '' ? "'" + v : v))]);
  } finally {
    lock.releaseLock();
  }
  return reply('ok');
}

/**
 * Opening the web app's address in a browser says whether it's up. With
 * ?recuerdos it answers the approved memories, for the room's thanks screen.
 */
function doGet(e) {
  if (e && e.parameter && 'recuerdos' in e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({ memories: approvedMemories() })).setMimeType(ContentService.MimeType.JSON);
  }
  return reply('Bogotá 1995: listo para recibir visitas.');
}

const SHOWN = 30;
const yes = (v) => v === true || /^\s*(s[ií]|x|yes|true|1)\s*$/i.test(String(v));

/** The memories visitors let others read and you've approved, a different handful each time. */
function approvedMemories() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const header = rows[0].map(String);
  const col = (name) => header.indexOf(name);
  const memory = col('memory');
  const share = col('memory_share');
  const approved = col('aprobado');
  const edited = col('recuerdo_publico');
  if (memory === -1 || share === -1 || approved === -1) return [];
  const out = [];
  rows.slice(1).forEach((row) => {
    if (!yes(row[share]) || !yes(row[approved])) return;
    const text = String((edited !== -1 && row[edited]) || row[memory] || '').trim();
    if (text) out.push({ text: text.slice(0, 600), age: String(row[col('age_1995')] || ''), lived: String(row[col('lived_1995')] || '') });
  });
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, SHOWN);
}

function reply(text) {
  return ContentService.createTextOutput(text);
}
