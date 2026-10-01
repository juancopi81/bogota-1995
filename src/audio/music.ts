// Placeholder music, synthesized.
//
// The real test uses your own MP3s (loaded in the backstage, kept in your
// browser). Until then every station plays these: small instrumental pieces
// in the right family (rock en español, pop, cumbia/vallenato, salsa,
// balada), each with an instrumental intro for the DJ to talk over. They are
// honest placeholders, not imitations of any real song.
//
// Pure functions over Float32Arrays, so they run the same in a worker, on the
// main thread, or in Node (for inspecting the output).

import { mulberry32, type Rng } from '../util/rng';

export type Style = 'rock' | 'pop' | 'tropical' | 'salsa' | 'balada';

export const SAMPLE_RATE = 22050;

// ---------- small synthesis kit ----------

const TAU = Math.PI * 2;

function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function add(out: Float32Array, start: number, sig: Float32Array, gain: number, pan = 0, right?: Float32Array) {
  const s0 = Math.max(0, Math.floor(start));
  const gl = right ? gain * Math.min(1, 1 - pan) : gain;
  const gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < sig.length && s0 + i < out.length; i++) {
    out[s0 + i] += sig[i] * gl;
    if (right) right[s0 + i] += sig[i] * gr;
  }
}

function kick(sr: number): Float32Array {
  const n = Math.floor(sr * 0.35);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = 48 + 110 * Math.exp(-t * 32);
    phase += (TAU * f) / sr;
    out[i] = Math.sin(phase) * Math.exp(-t * 9) + (i < 40 ? (Math.random() - 0.5) * 0.4 * (1 - i / 40) : 0);
  }
  return out;
}

function snare(sr: number, rng: Rng): Float32Array {
  const n = Math.floor(sr * 0.25);
  const out = new Float32Array(n);
  let lp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const white = rng() * 2 - 1;
    lp += (white - lp) * 0.6;
    const hp = lp - prev;
    prev = lp;
    out[i] = hp * 1.4 * Math.exp(-t * 16) + Math.sin(TAU * 190 * t) * 0.5 * Math.exp(-t * 28);
  }
  return out;
}

function hat(sr: number, rng: Rng, open = false): Float32Array {
  const n = Math.floor(sr * (open ? 0.22 : 0.06));
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const white = rng() * 2 - 1;
    const hp = white - prev;
    prev = white;
    out[i] = hp * 0.5 * Math.exp((-i / sr) * (open ? 14 : 60));
  }
  return out;
}

/** The guacharaca: a scraped cane, a burst of fast ticks. */
function guacharaca(sr: number, rng: Rng, len = 0.09): Float32Array {
  const n = Math.floor(sr * len);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const white = rng() * 2 - 1;
    const hp = white - prev;
    prev = white;
    const ridges = 0.5 + 0.5 * Math.sin(TAU * 170 * t);
    out[i] = hp * ridges * Math.sin((Math.PI * i) / n) * 0.7;
  }
  return out;
}

function conga(sr: number, pitch: number, slap = false): Float32Array {
  const n = Math.floor(sr * 0.3);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    phase += (TAU * pitch * (1 + 0.3 * Math.exp(-t * 40))) / sr;
    out[i] = Math.sin(phase) * Math.exp(-t * (slap ? 22 : 11)) + (slap && i < 60 ? (Math.random() - 0.5) * 0.6 : 0);
  }
  return out;
}

function clave(sr: number): Float32Array {
  const n = Math.floor(sr * 0.08);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = Math.sin(TAU * 2450 * t) * Math.exp(-t * 55) * 0.6;
  }
  return out;
}

/** Karplus–Strong plucked string. `bright` 0–1, `drive` for overdriven guitar. */
function pluck(sr: number, rng: Rng, hz: number, dur: number, bright = 0.5, decay = 0.996): Float32Array {
  const n = Math.floor(sr * dur);
  const out = new Float32Array(n);
  const period = Math.max(2, Math.round(sr / hz));
  const buf = new Float32Array(period);
  let lp = 0;
  for (let i = 0; i < period; i++) {
    const white = rng() * 2 - 1;
    lp += (white - lp) * (0.25 + bright * 0.7);
    buf[i] = lp;
  }
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const next = buf[(idx + 1) % period];
    buf[idx] = (cur + next) * 0.5 * decay;
    out[i] = cur;
    idx = (idx + 1) % period;
  }
  // soften the very end
  const tail = Math.min(n, Math.floor(sr * 0.03));
  for (let i = 0; i < tail; i++) out[n - 1 - i] *= i / tail;
  return out;
}

/** Single-cycle wavetables for each harmonic recipe (much cheaper than summing sines). */
const TABLE_SIZE = 2048;
const tables = new Map<number[], Float32Array>();
function tableFor(harmonics: number[]): Float32Array {
  let table = tables.get(harmonics);
  if (!table) {
    table = new Float32Array(TABLE_SIZE + 1);
    for (let i = 0; i <= TABLE_SIZE; i++) {
      let v = 0;
      for (let h = 0; h < harmonics.length; h++) v += Math.sin((TAU * (h + 1) * i) / TABLE_SIZE) * harmonics[h];
      table[i] = v;
    }
    tables.set(harmonics, table);
  }
  return table;
}

/** A tone built from harmonics: accordion, organ, brass, pad, whistled voice. */
function harmonic(
  sr: number,
  hz: number,
  dur: number,
  harmonics: number[],
  env: { a: number; d: number; s: number; r: number },
  mod: { vib?: number; vibRate?: number; trem?: number; tremRate?: number; detune?: number } = {},
): Float32Array {
  const n = Math.floor(sr * (dur + env.r));
  const out = new Float32Array(n);
  const table = tableFor(harmonics);
  let p1 = 0;
  let p2 = 0.37;
  const inc = (hz * TABLE_SIZE) / sr;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let amp: number;
    if (t < env.a) amp = t / env.a;
    else if (t < env.a + env.d) amp = 1 - ((1 - env.s) * (t - env.a)) / env.d;
    else if (t < dur) amp = env.s;
    else amp = env.s * Math.max(0, 1 - (t - dur) / env.r);
    const vib = mod.vib ? 1 + mod.vib * Math.sin(TAU * (mod.vibRate ?? 5.5) * t) * Math.min(1, t * 3) : 1;
    const trem = mod.trem ? 1 - mod.trem * (0.5 + 0.5 * Math.sin(TAU * (mod.tremRate ?? 6) * t)) : 1;
    p1 += inc * vib;
    if (p1 >= TABLE_SIZE) p1 -= TABLE_SIZE;
    const i1 = p1 | 0;
    let v = table[i1] + (table[i1 + 1] - table[i1]) * (p1 - i1);
    if (mod.detune) {
      p2 += inc * vib * (1 + mod.detune);
      if (p2 >= TABLE_SIZE) p2 -= TABLE_SIZE;
      const i2 = p2 | 0;
      v += table[i2] + (table[i2 + 1] - table[i2]) * (p2 - i2);
    }
    out[i] = v * amp * trem;
  }
  return out;
}

const ORGAN = [1, 0.5, 0.33, 0.2, 0.1];
const ACCORDION = [1, 0.7, 0.55, 0.42, 0.3, 0.22, 0.15, 0.1];
const BRASS = [1, 0.8, 0.65, 0.5, 0.35, 0.25, 0.15];
const PAD = [1, 0.35, 0.2, 0.1];
const WHISTLE = [1, 0.05, 0.12];
const BASS = [1, 0.45, 0.2, 0.08];
const EPIANO = [1, 0.3, 0.12, 0.05];

// ---------- harmony ----------

interface Chord {
  root: number; // midi
  minor: boolean;
  seventh?: boolean;
}

function chordNotes(c: Chord): number[] {
  const third = c.minor ? 3 : 4;
  const notes = [c.root, c.root + third, c.root + 7];
  if (c.seventh) notes.push(c.root + 10);
  return notes;
}

function scaleOf(key: number, minor: boolean): number[] {
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const out: number[] = [];
  for (let o = -1; o <= 2; o++) for (const s of steps) out.push(key + s + o * 12);
  return out;
}

function progressionFor(style: Style, key: number, rng: Rng): { chords: Chord[]; minor: boolean } {
  const maj = (d: number, minor = false, seventh = false): Chord => ({ root: key + d, minor, seventh });
  switch (style) {
    case 'rock':
      return rng() < 0.5
        ? { minor: true, chords: [maj(0, true), maj(8), maj(3), maj(10)] }
        : { minor: false, chords: [maj(0), maj(7), maj(9, true), maj(5)] };
    case 'pop':
      return { minor: false, chords: [maj(0), maj(9, true), maj(5), maj(7)] };
    case 'tropical':
      return { minor: false, chords: [maj(0), maj(0), maj(7, false, true), maj(7, false, true), maj(0), maj(5), maj(7, false, true), maj(0)] };
    case 'salsa':
      return { minor: true, chords: [maj(0, true), maj(5, true), maj(7, false, true), maj(0, true)] };
    case 'balada':
      return { minor: false, chords: [maj(0), maj(9, true), maj(2, true), maj(7, false, true)] };
  }
}

// ---------- arrangement ----------

interface Arrangement {
  bpm: number;
  swing: number;
  sections: { name: 'intro' | 'verse' | 'chorus' | 'outro'; bars: number }[];
}

function arrangementFor(style: Style, rng: Rng): Arrangement {
  const bpm = {
    rock: 118 + rng() * 22,
    pop: 100 + rng() * 18,
    tropical: 92 + rng() * 10,
    salsa: 96 + rng() * 10,
    balada: 72 + rng() * 10,
  }[style];
  const long = style === 'balada' ? 1 : 2;
  return {
    bpm,
    swing: style === 'tropical' ? 0.1 : 0,
    sections: [
      { name: 'intro', bars: style === 'balada' ? 4 : 8 },
      { name: 'verse', bars: 8 },
      { name: 'chorus', bars: 8 },
      { name: 'verse', bars: 8 * long > 8 ? 8 : 8 },
      { name: 'chorus', bars: 8 },
      { name: 'chorus', bars: style === 'balada' ? 4 : 8 },
      { name: 'outro', bars: 4 },
    ],
  };
}

/** A melodic motif (scale degrees and durations in beats) that repeats with small variations. */
function motif(rng: Rng, notesPerBar: number): { deg: number; beats: number }[] {
  const out: { deg: number; beats: number }[] = [];
  let beat = 0;
  let deg = Math.floor(rng() * 3);
  while (beat < 8) {
    const beats = rng() < 0.6 ? (notesPerBar > 4 ? 0.5 : 1) : rng() < 0.5 ? 1 : 1.5;
    deg += Math.floor(rng() * 5) - 2;
    deg = Math.max(-2, Math.min(7, deg));
    out.push({ deg, beats: Math.min(beats, 8 - beat) });
    beat += beats;
  }
  return out;
}

export interface Rendered {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  /** Seconds of instrumental intro (where the DJ can talk). */
  intro: number;
}

interface Plan {
  rng: Rng;
  key: number;
  chords: Chord[];
  minor: boolean;
  arr: Arrangement;
}

function plan(style: Style, seed: number): Plan {
  const rng = mulberry32(seed);
  const key = 45 + Math.floor(rng() * 10); // A2..F#3
  const { chords, minor } = progressionFor(style, key, rng);
  const arr = arrangementFor(style, rng);
  return { rng, key, chords, minor, arr };
}

/** Length and intro of a placeholder song, without rendering it. */
export function songShape(style: Style, seed: number): { duration: number; intro: number } {
  const { arr } = plan(style, seed);
  const bar = (60 / arr.bpm) * 4;
  const bars = arr.sections.reduce((a, s) => a + s.bars, 0);
  return { duration: bars * bar + 2.5, intro: arr.sections[0].bars * bar };
}

/** Render a whole placeholder song. */
export function renderSong(style: Style, seed: number, sr = SAMPLE_RATE, maxBars = Infinity): Rendered {
  const { rng, key, chords, minor, arr } = plan(style, seed);
  const beat = 60 / arr.bpm;
  const bar = beat * 4;
  const totalBars = Math.min(maxBars, arr.sections.reduce((a, s) => a + s.bars, 0));
  const total = totalBars * bar + 2.5;
  const L = new Float32Array(Math.floor(total * sr));
  const R = new Float32Array(L.length);
  const scale = scaleOf(key + 12, minor);
  const verseMotif = motif(rng, style === 'salsa' || style === 'tropical' ? 6 : 4);
  const chorusMotif = motif(rng, 4);

  const k = kick(sr);
  const sn = snare(sr, rng);
  const hh = hat(sr, rng);
  const ho = hat(sr, rng, true);
  const cl = clave(sr);

  let barIndex = 0;
  for (const section of arr.sections) {
    for (let b = 0; b < section.bars && barIndex < totalBars; b++, barIndex++) {
      const t0 = barIndex * bar;
      const at = (beats: number) => (t0 + beats * beat) * sr;
      const chord = chords[barIndex % chords.length];
      const notes = chordNotes(chord);
      const intro = section.name === 'intro';
      const outro = section.name === 'outro';
      const fadeOut = outro ? 1 - b / section.bars : 1;
      const lvl = (intro ? 0.85 : section.name === 'chorus' ? 1.05 : 0.95) * fadeOut;

      // ---- drums ----
      if (style === 'rock' || style === 'pop') {
        const sparse = intro && b < 2;
        for (let q = 0; q < 4; q++) {
          if (!sparse && (q === 0 || q === 2 || (style === 'rock' && q === 2.5))) add(L, at(q), k, 0.9 * lvl, 0, R);
          if (!sparse && (q === 1 || q === 3)) add(L, at(q), sn, 0.55 * lvl, 0.05, R);
          for (let e = 0; e < 2; e++) add(L, at(q + e * 0.5), style === 'rock' && section.name === 'chorus' && e === 0 ? ho : hh, 0.28 * lvl, 0.3, R);
        }
        if (style === 'rock' && !sparse) add(L, at(3.5), k, 0.6 * lvl, 0, R);
      } else if (style === 'tropical') {
        // cumbia: bass drum on 1 and 3, guacharaca "chk-chiki" all the way through
        for (let q = 0; q < 4; q += 2) add(L, at(q), k, 0.7 * lvl, 0, R);
        for (let e = 0; e < 8; e++) {
          const long = e % 2 === 0;
          add(L, at(e * 0.5 + (e % 2 ? arr.swing : 0)), guacharaca(sr, rng, long ? 0.12 : 0.06), (long ? 0.45 : 0.3) * lvl, -0.25, R);
        }
        add(L, at(1), conga(sr, 330, true), 0.35 * lvl, 0.3, R);
        add(L, at(3), conga(sr, 330, true), 0.35 * lvl, 0.3, R);
        add(L, at(2.5), conga(sr, 220), 0.4 * lvl, 0.3, R);
      } else if (style === 'salsa') {
        // 2-3 son clave over two bars, tumbao on the congas
        const claveBeats = barIndex % 2 === 0 ? [1, 2] : [0, 1.5, 3];
        for (const cb of claveBeats) add(L, at(cb), cl, 0.35 * lvl, 0.4, R);
        add(L, at(1), conga(sr, 360, true), 0.35 * lvl, -0.3, R);
        add(L, at(3), conga(sr, 250), 0.45 * lvl, -0.3, R);
        add(L, at(3.5), conga(sr, 250), 0.4 * lvl, -0.3, R);
        for (let q = 0; q < 4; q++) add(L, at(q), hat(sr, rng), 0.18 * lvl, 0.4, R);
      } else if (style === 'balada' && !intro) {
        add(L, at(0), k, 0.5 * lvl, 0, R);
        add(L, at(2), sn, 0.3 * lvl, 0, R);
        for (let q = 0; q < 4; q++) add(L, at(q), hh, 0.15 * lvl, 0.3, R);
      }

      // ---- bass ----
      const bassNote = chord.root - 12;
      const bassPattern: [number, number][] =
        style === 'tropical'
          ? [[0, 0], [2, 7]]
          : style === 'salsa'
            ? [[1.5, 0], [3, 7]]
            : style === 'balada'
              ? [[0, 0], [2, 7]]
              : [[0, 0], [1.5, 0], [2, 0], [3, 7], [3.5, 0]];
      for (const [pos, interval] of bassPattern) {
        const len = style === 'rock' ? beat * 0.45 : beat * 1.2;
        add(L, at(pos), harmonic(sr, midiHz(bassNote + interval), len, BASS, { a: 0.005, d: 0.12, s: 0.6, r: 0.05 }), 0.5 * lvl, 0, R);
      }

      // ---- chords ----
      if (style === 'rock' || style === 'pop') {
        // strummed guitar: down on 1, up on 2&, down 3, up 4 (rock drives it)
        const strums = style === 'rock' ? [0, 1, 1.5, 2, 3, 3.5] : [0, 1.5, 2, 3];
        for (const s of strums) {
          const voicing = [...notes, notes[0] + 12].map((n) => n + 12);
          voicing.forEach((n, i) => {
            const sig = pluck(sr, rng, midiHz(n), beat * 1.6, style === 'rock' ? 0.8 : 0.55, 0.994);
            if (style === 'rock') for (let j = 0; j < sig.length; j++) sig[j] = Math.tanh(sig[j] * 3) * 0.6;
            add(L, at(s) + i * sr * 0.008, sig, 0.13 * lvl, i % 2 ? 0.35 : -0.35, R);
          });
        }
      } else if (style === 'tropical') {
        // accordion answering the melody, off-beat chord punches
        for (const s of [0.5, 1.5, 2.5, 3.5]) {
          for (const n of notes) add(L, at(s), harmonic(sr, midiHz(n + 12), beat * 0.35, ACCORDION, { a: 0.01, d: 0.05, s: 0.7, r: 0.04 }, { trem: 0.15, tremRate: 7, detune: 0.004 }), 0.05 * lvl, 0.2, R);
        }
      } else if (style === 'salsa') {
        // piano montuno: syncopated broken chords
        const pattern = [0, 0.5, 1.5, 2, 2.5, 3.5];
        pattern.forEach((p, i) => {
          const n = notes[i % notes.length] + 24;
          add(L, at(p), harmonic(sr, midiHz(n), beat * 0.4, EPIANO, { a: 0.003, d: 0.25, s: 0.25, r: 0.08 }), 0.14 * lvl, 0.25, R);
          add(L, at(p), harmonic(sr, midiHz(n - 12), beat * 0.4, EPIANO, { a: 0.003, d: 0.25, s: 0.25, r: 0.08 }), 0.09 * lvl, 0.25, R);
        });
        if (section.name === 'chorus' && b % 2 === 1) {
          for (const n of notes) add(L, at(2), harmonic(sr, midiHz(n + 12), beat * 0.9, BRASS, { a: 0.02, d: 0.2, s: 0.6, r: 0.1 }, { vib: 0.004 }), 0.07 * lvl, -0.2, R);
        }
      } else {
        for (const n of notes) add(L, at(0), harmonic(sr, midiHz(n + 12), bar * 0.95, PAD, { a: 0.4, d: 0.5, s: 0.7, r: 0.6 }, { detune: 0.003 }), 0.07 * lvl, 0, R);
        for (let a = 0; a < 8; a++) {
          const n = notes[a % 3] + 24;
          add(L, at(a * 0.5), pluck(sr, rng, midiHz(n), beat * 2, 0.4, 0.997), 0.1 * lvl, 0.3, R);
        }
      }

      // ---- melody: the "voice" (whistled / accordion lead) ----
      if (!intro && !outro) {
        const m = section.name === 'chorus' ? chorusMotif : verseMotif;
        const half = (barIndex % 2) * 4;
        let pos = 0;
        for (const note of m) {
          if (pos >= half && pos < half + 4) {
            const deg = note.deg + (section.name === 'chorus' ? 2 : 0);
            const scaleIdx = 7 + deg;
            const midi = scale[Math.max(0, Math.min(scale.length - 1, scaleIdx))];
            const dur = note.beats * beat * 0.92;
            const timbre = style === 'tropical' ? ACCORDION : style === 'salsa' ? BRASS : style === 'rock' ? ORGAN : WHISTLE;
            const sig = harmonic(sr, midiHz(midi), dur, timbre, { a: 0.03, d: 0.1, s: 0.8, r: 0.08 }, { vib: 0.006, vibRate: 5.2, trem: style === 'tropical' ? 0.12 : 0, tremRate: 7 });
            add(L, at(pos - half), sig, (style === 'rock' ? 0.12 : 0.16) * lvl, -0.05, R);
          }
          pos += note.beats;
        }
      }
    }
  }
  const introSeconds = arr.sections[0].bars * bar;
  master(L, R);
  return { left: L, right: R, sampleRate: sr, intro: introSeconds };
}

/** Radio-ready: gentle saturation and normalization. */
function master(L: Float32Array, R: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const pre = peak > 0 ? 1.6 / peak : 1;
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * pre) * 0.8;
    R[i] = Math.tanh(R[i] * pre) * 0.8;
  }
  const fade = Math.floor(SAMPLE_RATE * 0.01);
  for (let i = 0; i < fade; i++) {
    L[i] *= i / fade;
    R[i] *= i / fade;
  }
}

/** A short station jingle: a rising figure and a final chord. */
export function renderJingle(style: Style, seed: number, sr = SAMPLE_RATE): Rendered {
  const rng = mulberry32(seed);
  const key = 57 + Math.floor(rng() * 7);
  const len = 3.2;
  const L = new Float32Array(Math.floor(sr * len));
  const R = new Float32Array(L.length);
  const figure = [0, 4, 7, 12, 16];
  const timbre = style === 'tropical' ? ACCORDION : style === 'salsa' ? BRASS : style === 'rock' ? ORGAN : EPIANO;
  figure.forEach((iv, i) => {
    add(L, i * 0.13 * sr, harmonic(sr, midiHz(key + iv), 0.14, timbre, { a: 0.005, d: 0.08, s: 0.6, r: 0.05 }), 0.22, i % 2 ? 0.3 : -0.3, R);
  });
  for (const iv of [0, 4, 7, 12]) {
    add(L, 0.72 * sr, harmonic(sr, midiHz(key + iv), 1.6, timbre, { a: 0.01, d: 0.4, s: 0.5, r: 0.7 }, { vib: 0.004 }), 0.14, 0, R);
  }
  add(L, 0.72 * sr, kick(sr), 0.8, 0, R);
  if (style === 'rock') {
    for (const iv of [0, 7, 12]) {
      const sig = pluck(sr, rng, midiHz(key - 12 + iv), 1.8, 0.9, 0.995);
      for (let j = 0; j < sig.length; j++) sig[j] = Math.tanh(sig[j] * 4) * 0.5;
      add(L, 0.72 * sr, sig, 0.3, 0, R);
    }
  }
  master(L, R);
  return { left: L, right: R, sampleRate: sr, intro: 0 };
}

/** A soft loop for the DJ to talk over (8 bars). */
export function renderBed(style: Style, seed: number, sr = SAMPLE_RATE): Rendered {
  const song = renderSong(style, seed, sr, 8);
  // the intro of a song makes a natural bed; loop-ready by trimming whole bars
  const n = Math.min(song.left.length, Math.floor(song.intro * sr));
  const L = song.left.slice(0, n);
  const R = song.right.slice(0, n);
  for (let i = 0; i < n; i++) {
    L[i] *= 0.6;
    R[i] *= 0.6;
  }
  return { left: L, right: R, sampleRate: sr, intro: 0 };
}

/** The radio news bed: a teletype clattering over a steady pulse. */
export function renderTeletype(seed: number, sr = SAMPLE_RATE): Rendered {
  const rng = mulberry32(seed);
  const len = 8;
  const L = new Float32Array(Math.floor(sr * len));
  for (let i = 0; i < 64; i++) {
    const t = i * 0.125 + (rng() - 0.5) * 0.02;
    if (rng() < 0.82) add(L, t * sr, clave(sr).map((v, j) => v * 0.6 + (rng() - 0.5) * 0.3 * Math.exp(-j / 80)), 0.35 + rng() * 0.2);
  }
  for (let i = 0; i < 16; i++) {
    add(L, i * 0.5 * sr, harmonic(sr, 880, 0.06, [1, 0.2], { a: 0.002, d: 0.03, s: 0.3, r: 0.02 }), 0.12);
  }
  const R = L.slice();
  master(L, R);
  return { left: L, right: R, sampleRate: sr, intro: 0 };
}
