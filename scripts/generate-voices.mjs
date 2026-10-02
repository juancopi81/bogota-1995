// Offline recordings for the room, never a runtime API dependency.
// Dry run by default. See src/assets/voices/README.md for the command.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const digest = data => crypto.createHash('sha256').update(data).digest('hex');
export function readPlan(filename) {
  const plan = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const seen = new Set();
  const clips = (plan.lines ?? plan.clips).map(line => {
    if (!/^[A-Za-z0-9_.-]+$/.test(line.id ?? '') || seen.has(line.id)) throw new Error(`Missing, unsafe, or duplicate line ID: ${line.id}`);
    seen.add(line.id);
    if (!/^[A-Za-z0-9]+$/.test(line.voice_id ?? '')) throw new Error(`Missing or invalid voice for ${line.id}`);
    if (!line.spoken_text || !line.input_text?.includes(line.spoken_text)) throw new Error(`Missing original dialogue in ${line.id}`);
    return { ...line, model_id: line.model_id ?? plan.model_id ?? plan.model,
      voice_settings: line.voice_settings ?? plan.voice_settings, seed: line.seed ?? plan.seed };
  });
  if (clips.some(clip => !clip.model_id)) throw new Error('Missing model');
  return clips;
}
export const reserveFor = clip => Math.ceil(clip.input_text.length * 0.12);
export function requireBudget(clips, budget) {
  if (!Number.isSafeInteger(budget) || budget <= 0) throw new Error('Supply a positive integer --budget');
  const estimate = clips.reduce((n, clip) => n + reserveFor(clip), 0);
  if (estimate > budget) throw new Error(`Credit reserve ${estimate} exceeds budget ${budget}`);
  return estimate;
}

function validateAudio(file) {
  const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file], { encoding: 'utf8' }));
  const duration = Number(info.format?.duration);
  if (!(duration > 0)) throw new Error(`Invalid duration: ${file}`);
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], { maxBuffer: 16 * 1024 * 1024 });
  let peak = 0, power = 0;
  for (let i = 0; i < pcm.length; i += 4) {
    const sample = pcm.readFloatLE(i);
    if (!Number.isFinite(sample)) throw new Error(`Invalid PCM: ${file}`);
    peak = Math.max(peak, Math.abs(sample)); power += sample * sample;
  }
  const rms = Math.sqrt(power / (pcm.length / 4));
  if (!(peak > 0.00001 && rms > 0.00001)) throw new Error(`Silent recording: ${file}`);
  return { duration_seconds: duration, peak_dbfs: 20 * Math.log10(peak), rms_dbfs: 20 * Math.log10(rms),
    validation: 'SHA-256, positive duration, full MP3 decode, and non-silent PCM' };
}

async function main() {
  const options = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [name, ...value] = arg.replace(/^--/, '').split('=');
    return [name, value.length ? value.join('=') : true];
  }));
  if (!options.plan || !options['state-dir']) throw new Error('Usage: node scripts/generate-voices.mjs --plan=<json> --state-dir=media/private/<run> --budget=<credits> [--generate]');
  const clips = readPlan(String(options.plan));
  const budget = Number(options.budget);
  const root = process.cwd();
  const dir = path.resolve(String(options['state-dir']));
  if (!dir.startsWith(path.join(root, 'media/private') + path.sep)) throw new Error('Keep API audit state and unpublished audio under media/private/');
  const statePath = path.join(dir, 'state.json');
  const planHash = digest(JSON.stringify(clips));
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {
    created_at: new Date().toISOString(), plan_sha256: planHash, maximum_credit_budget: budget,
    clips: clips.map(clip => ({ ...clip, status: 'pending', audio_path: path.join(dir, 'audio', `${clip.id}.mp3`) })),
  };
  if (state.plan_sha256 !== planHash || state.maximum_credit_budget !== budget) throw new Error('Plan or budget changed; inspect the saved run before continuing');
  for (const clip of state.clips) {
    if (clip.status === 'generated') {
      if (!fs.existsSync(clip.audio_path) || digest(fs.readFileSync(clip.audio_path)) !== clip.sha256) throw new Error(`Completed audio changed: ${clip.id}`);
    } else if (clip.status !== 'pending') throw new Error(`Unresolved request ${clip.id}: ${clip.status}. No automatic paid retries.`);
    else if (fs.existsSync(clip.audio_path)) throw new Error(`Untracked audio: ${clip.id}`);
  }
  // An already bundled take is preserved, rather than charged for again.
  const bundled = JSON.parse(fs.readFileSync('src/assets/voices/manifest.json', 'utf8'));
  for (const clip of state.clips.filter(clip => clip.status === 'pending')) {
    const file = path.join(root, 'src/assets/voices', `${clip.id}.mp3`);
    if (!fs.existsSync(file)) continue;
    const take = bundled.clips.find(take => take.id === clip.id);
    if (!take || take.spoken_text !== clip.spoken_text || digest(fs.readFileSync(file)) !== take.sha256) throw new Error(`Unverified bundled take: ${clip.id}`);
    clip.status = 'generated'; clip.audio_path = file; clip.sha256 = take.sha256; clip.reused_bundled = true; clip.credit_cost = 0;
  }
  const chargeable = () => state.clips.filter(clip => !clip.reused_bundled);
  requireBudget(chargeable(), budget);
  const spent = () => state.clips.reduce((n, clip) => n + (clip.credit_cost ?? 0), 0);
  const pending = () => state.clips.filter(clip => clip.status === 'pending');
  const remainingReserve = () => pending().reduce((n, clip) => n + reserveFor(clip), 0);
  if (spent() + remainingReserve() > budget) throw new Error('Completed costs plus remaining reserve exceed the batch budget');
  console.log(JSON.stringify({ total: state.clips.length, completed: state.clips.length - pending().length,
    to_generate: pending().length, estimated_credit_reserve: remainingReserve(), reported_credits_spent: spent(), budget }));
  if (!options.generate) return;

  // Check local validation tools before any paid call.
  execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  const key = process.env.ELEVENLABS_API_KEY ?? fs.readFileSync('media/private/elevenlabs.env', 'utf8').split(/\r?\n/)
    .find(line => line.startsWith('ELEVENLABS_API_KEY='))?.slice('ELEVENLABS_API_KEY='.length).trim();
  if (!key) throw new Error('No saved ElevenLabs API key');
  const redact = value => String(value).replaceAll(key, '[REDACTED]');
  const api = (endpoint, options = {}) => fetch(`https://api.elevenlabs.io${endpoint}`, {
    ...options, headers: { 'xi-api-key': key, ...options.headers }, redirect: 'error', signal: AbortSignal.timeout(120000),
  });
  const balance = async () => {
    const response = await api('/v1/user/subscription');
    if (!response.ok) throw new Error(`Credit check failed (${response.status})`);
    const data = await response.json();
    return { tier: data.tier, used: data.character_count, limit: data.character_limit };
  };
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  const save = () => {
    fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(`${statePath}.tmp`, statePath);
  };
  try {
    const current = await balance();
    state.balance_before ??= current;
    if (current.limit - current.used < remainingReserve()) throw new Error('Insufficient account credits');
    save();
    for (const clip of pending()) {
      if (spent() + reserveFor(clip) > budget) throw new Error(`Budget guard stopped before ${clip.id}`);
      clip.status = 'requesting'; save();
      const response = await api(`/v1/text-to-speech/${encodeURIComponent(clip.voice_id)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clip.input_text, model_id: clip.model_id, voice_settings: clip.voice_settings, seed: clip.seed }),
      });
      if (!response.ok) {
        clip.status = 'failed'; clip.http_status = response.status;
        clip.error = redact((await response.text()).slice(0, 1000)); save();
        throw new Error(`${clip.id}: HTTP ${response.status}; ${clip.error}`);
      }
      const data = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(`${clip.audio_path}.part`, data, { mode: 0o600 });
      fs.renameSync(`${clip.audio_path}.part`, clip.audio_path);
      clip.bytes = data.length; clip.sha256 = digest(data); clip.generated_at = new Date().toISOString();
      const cost = response.headers.get('character-cost');
      if (cost === null || !Number.isFinite(Number(cost)) || Number(cost) < 0) {
        clip.status = 'generated-cost-unknown'; save(); throw new Error('Audio saved but cost unavailable; stop before another paid call');
      }
      clip.credit_cost = Number(cost); clip.status = 'generated-unvalidated'; save();
      if (!response.headers.get('content-type')?.includes('audio/') || data.length < 500) throw new Error(`Unexpected audio response for ${clip.id}`);
      Object.assign(clip, validateAudio(clip.audio_path));
      clip.status = 'generated'; state.reported_audio_credit_cost = spent(); save();
      if (clip.credit_cost > reserveFor(clip) || spent() + remainingReserve() > budget) throw new Error('Unexpected provider cost; stopped before the next paid request');
      const completed = state.clips.length - pending().length;
      if (completed % 10 === 0 || !pending().length) console.log(JSON.stringify({ completed, total: state.clips.length, reported_credits: spent() }));
    }
    state.completed_at = new Date().toISOString(); state.balance_after = await balance(); save();
    console.log(JSON.stringify({ complete: true, total: state.clips.length, reported_credit_cost: spent(), budget, account: state.balance_after }));
  } catch (error) {
    throw new Error(redact(error?.message ?? error));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
