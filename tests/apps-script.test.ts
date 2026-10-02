import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// research/apps-script.gs runs in Google Apps Script; here it runs against a
// fake sheet that, like the real one, hides the apostrophe that keeps text as text.
class FakeSheet {
  cells: unknown[][] = [];
  getLastRow(): number {
    return this.cells.length;
  }
  getLastColumn(): number {
    return Math.max(0, ...this.cells.map((r) => r.length));
  }
  getRange(row: number, col: number, rows: number, cols: number) {
    return {
      getValues: () =>
        Array.from({ length: rows }, (_, i) =>
          Array.from({ length: cols }, (_, j) => {
            const v = this.cells[row - 1 + i]?.[col - 1 + j] ?? '';
            return typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
          }),
        ),
      setValues: (values: unknown[][]) =>
        values.forEach((r, i) =>
          r.forEach((v, j) => {
            (this.cells[row - 1 + i] ??= [])[col - 1 + j] = v;
          }),
        ),
    };
  }
}

function deploy() {
  const sheet = new FakeSheet();
  const context: Record<string, unknown> = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text: string) => ({
        text,
        mime: 'text/plain',
        setMimeType(mime: string) {
          this.mime = mime;
          return this;
        },
      }),
    },
  };
  runInNewContext(readFileSync('research/apps-script.gs', 'utf8'), context);
  type Output = { text: string; mime: string };
  const doPost = context.doPost as (e: { postData: { contents: string } }) => Output;
  const doGet = context.doGet as (e?: { parameter: Record<string, string> }) => Output;
  const post = (body: unknown) => doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).text;
  const get = (parameter: Record<string, string> = {}) => doGet({ parameter });
  const column = (name: string) => (sheet.cells[0] as string[]).indexOf(name);
  return { sheet, post, get, column };
}

const A = 'a1b2c3d4e5f60718';
const B = 'ffeeddccbbaa0099';

describe('the sheet that receives visits', () => {
  it('keeps one row per visit, and adds columns as new fields show up', () => {
    const { sheet, post, column } = deploy();
    expect(post({ v: 1, visit: A, fields: { stage: 'door', age_1995: '10-14', pre_nostalgia: 2.33 } })).toBe('ok');
    expect(post({ v: 1, visit: B, fields: { stage: 'gate' } })).toBe('ok');
    expect(post({ v: 1, visit: A, fields: { stage: 'done', age_1995: '10-14', pre_nostalgia: 2.33, change: 1.5 } })).toBe('ok');
    expect(sheet.cells.length).toBe(3);
    expect(sheet.cells[0][0]).toBe('visit');
    const rowA = sheet.cells[1];
    expect(rowA[column('stage')]).toBe("'done");
    expect(rowA[column('change')]).toBe(1.5);
    expect(rowA[column('pre_nostalgia')]).toBe(2.33);
    // stored as text, so the sheet can't turn it into October 14
    expect(rowA[column('age_1995')]).toBe("'10-14");
    expect(sheet.cells[2][column('stage')]).toBe("'gate");
  });

  it('keeps text that looks like a formula as plain text', () => {
    const { sheet, post, column } = deploy();
    post({ v: 1, visit: A, fields: { memory: '=IMPORTXML("http://x")' } });
    expect(sheet.cells[1][column('memory')]).toBe('\'=IMPORTXML("http://x")');
  });

  it('says it is up when opened in a browser', () => {
    const { get } = deploy();
    expect(get().text).toBe('Bogotá 1995: listo para recibir visitas.');
  });

  it('hands the room only the memories visitors let others read and you have approved', () => {
    const { sheet, post, get, column } = deploy();
    const visits = [
      ['a000000000000001', { memory: 'La buseta llena.', memory_share: true, age_1995: '15-19', lived_1995: 'bogota' }],
      ['a000000000000002', { memory: 'Mi hermano Pedro y yo.', memory_share: true, age_1995: '10-14', lived_1995: 'bogota' }],
      ['a000000000000003', { memory: 'No lo muestren.', memory_share: false }],
      ['a000000000000004', { memory: 'Aún sin leer.', memory_share: true }],
    ] as const;
    for (const [visit, fields] of visits) post({ v: 1, visit, fields });
    expect(JSON.parse(get({ recuerdos: '1' }).text)).toEqual({ memories: [] });
    // you approve three in the sheet, and take the name out of one
    sheet.cells[0].push('aprobado', 'recuerdo_publico');
    const approve = (row: number, edit = '') => {
      sheet.cells[row][column('aprobado')] = 'sí';
      sheet.cells[row][column('recuerdo_publico')] = edit;
    };
    approve(1);
    approve(2, 'Mi hermano y yo.');
    approve(3);
    // a later send from the same visit keeps what you wrote
    post({ v: 1, visit: 'a000000000000001', fields: { memory: 'La buseta llena.', memory_share: true, stage: 'done' } });
    const out = get({ recuerdos: '1' });
    expect(out.mime).toBe('application/json');
    const memories = (JSON.parse(out.text) as { memories: { text: string; age: string; lived: string }[] }).memories;
    expect(memories.map((m) => m.text).sort()).toEqual(['La buseta llena.', 'Mi hermano y yo.']);
    expect(memories.find((m) => m.text === 'La buseta llena.')).toEqual({ text: 'La buseta llena.', age: '15-19', lived: 'bogota' });
  });

  it('turns away anything that is not a visit', () => {
    const { sheet, post } = deploy();
    expect(post('not json')).toBe('bad json');
    expect(post({ v: 1, visit: 'nope', fields: {} })).toBe('bad visit');
    expect(post({ v: 2, visit: A, fields: {} })).toBe('bad visit');
    post({ v: 1, visit: A, fields: { 'Bad Key': 1, nested: { a: 1 }, ok: 1 } });
    expect(sheet.cells[0]).toEqual(['visit', 'received', 'ok']);
  });
});
