import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function run(lines: object[], budget: number, generate = false) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-budget-'));
  temporary.push(dir);
  const filename = join(dir, 'plan.json');
  const stateDir = join(process.cwd(), 'media/private', dir.split('/').pop()!);
  writeFileSync(filename, JSON.stringify({ model_id: 'eleven_v4', lines }));
  const result = spawnSync(process.execPath, ['scripts/generate-voices.mjs', `--plan=${filename}`, `--state-dir=${stateDir}`,
    `--budget=${budget}`, ...(generate ? ['--generate'] : [])], { encoding: 'utf8' });
  return { ...result, stateExists: existsSync(stateDir) };
}
const clip = { id: 'test.grandma', voice_id: 'mvUcswqyALvhz2mIGROO', spoken_text: 'Mi amor.', input_text: '[warm] Mi amor.' };

describe('voice generation credit guards', () => {
  it('makes a dry-run plan without writing paid-request state', () => {
    const result = run([clip], 100);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ to_generate: 1, reported_credits_spent: 0, budget: 100 });
    expect(result.stateExists).toBe(false);
  });
  it('rejects an insufficient budget before credentials, tools, or a paid request', () => {
    const result = run([clip], 1, true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('exceeds budget 1');
    expect(result.stateExists).toBe(false);
  });
  it('rejects duplicate line IDs before a paid request', () => {
    const result = run([clip, clip], 100, true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('duplicate line ID');
    expect(result.stateExists).toBe(false);
  });
});
