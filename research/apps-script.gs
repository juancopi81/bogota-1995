// Receives the room's visits and keeps one row per visit in the sheet
// "visitas", one column per field (see docs/research-setup.md). Every send
// carries the whole visit, so later sends update the same row.
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

/** Opening the web app's address in a browser says whether it's up. */
function doGet() {
  return reply('Bogotá 1995: listo para recibir visitas.');
}

function reply(text) {
  return ContentService.createTextOutput(text);
}
