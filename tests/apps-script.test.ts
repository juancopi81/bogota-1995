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
    ContentService: { createTextOutput: (text: string) => text },
  };
  runInNewContext(readFileSync('research/apps-script.gs', 'utf8'), context);
  const doPost = context.doPost as (e: { postData: { contents: string } }) => string;
  const post = (body: unknown) => doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } });
  const column = (name: string) => (sheet.cells[0] as string[]).indexOf(name);
  return { sheet, post, column };
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

  it('turns away anything that is not a visit', () => {
    const { sheet, post } = deploy();
    expect(post('not json')).toBe('bad json');
    expect(post({ v: 1, visit: 'nope', fields: {} })).toBe('bad visit');
    expect(post({ v: 2, visit: A, fields: {} })).toBe('bad visit');
    post({ v: 1, visit: A, fields: { 'Bad Key': 1, nested: { a: 1 }, ok: 1 } });
    expect(sheet.cells[0]).toEqual(['visit', 'received', 'ok']);
  });
});
