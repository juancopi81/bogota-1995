// Works out what each file you drop in the backstage is: one of the room's
// songs (by its tags, its name or its folder), the national anthem, or a
// recorded line (named after the line's id).

import type { Tags } from './tags';

export interface SongRef {
  id: string;
  title: string;
  artist: string;
}

export interface Candidate {
  /** The file's path inside what was dropped ("Aterciopelados/El Dorado/03 Bolero falaz.mp3"). */
  path: string;
  tags: Tags;
}

export type Target = { kind: 'song'; id: string } | { kind: 'anthem' } | { kind: 'voice'; id: string };

export interface Match {
  target: Target;
  /** 0–100: how sure we are. */
  score: number;
  /** What gave it away: a line id, the tags, the name, or a song list that came with the files. */
  by: 'id' | 'tags' | 'name' | 'list';
}

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'mp4', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'webm', 'aif', 'aiff', 'caf'];

export function isAudioName(name: string): boolean {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return AUDIO_EXTENSIONS.includes(ext);
}

/** Lowercase, no accents, no punctuation: "¿Dónde jugarán los niños?" → "donde jugaran los ninos". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Drop what versions add to a title: "(Remastered 2005)", "[En vivo]", "feat. …". */
function bareTitle(s: string): string {
  return s
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/\s(feat\.?|ft\.?|featuring)\s.*$/i, ' ')
    .trim();
}

export function basename(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  return name.replace(/\.[a-z0-9]{1,5}$/i, '');
}

/** "03 - Bolero falaz", "Track 03. Bolero falaz", "03_bolero_falaz" → the name without its track number. */
function withoutTrackNumber(name: string): string {
  return name.replace(/^\s*(track|pista)?\s*\d{1,3}\s*[-._)]*\s*/i, '');
}

const VERSION_WORDS = /\b(en vivo|live|remix|karaoke|instrumental|cover|acustic[oa]|acoustic|unplugged|demo)\b/;

function contains(hay: string, needle: string): boolean {
  return needle.length > 0 && ` ${hay} `.includes(` ${needle} `);
}

/** How well a piece of text names this song's title (0 = not at all, 1 = exactly). */
function titleFit(text: string, title: string): number {
  const t = normalize(bareTitle(text));
  const want = normalize(title);
  if (!t || !want) return 0;
  if (t === want) return 1;
  // "la tierra del olvido" vs "tierra del olvido"
  const drop = (s: string) => s.replace(/^(el|la|los|las|the|a) /, '');
  if (drop(t) === drop(want)) return 0.95;
  if (contains(t, want)) return want.split(' ').length > 1 ? 0.85 : 0.7;
  return 0;
}

/** What song this file most likely is, if any. */
export function matchSong(file: Candidate, songs: SongRef[]): Match | null {
  const name = withoutTrackNumber(basename(file.path));
  const where = normalize(file.path);
  let best: Match | null = null;
  for (const s of songs) {
    const artist = normalize(s.artist);
    let fit = 0;
    let by: Match['by'] = 'name';
    if (file.tags.title) {
      fit = titleFit(file.tags.title, s.title);
      by = 'tags';
    }
    if (fit === 0) {
      // "Aterciopelados - Bolero falaz": try the whole name and each side of the dash
      const parts = [name, ...name.split(/\s+[-–—]\s+|_-_/)];
      fit = Math.max(...parts.map((p) => titleFit(p.replace(/_/g, ' '), s.title)));
      by = 'name';
    }
    if (fit === 0) continue;

    const tagArtist = file.tags.artist ? normalize(file.tags.artist) : '';
    const artistSaid = tagArtist ? contains(tagArtist, artist) || contains(artist, tagArtist) : contains(where, artist);
    const artistOther = tagArtist !== '' && !artistSaid;
    let score = fit * 80;
    if (artistSaid) score += 20;
    // someone else's song with the same title ("Zombie", "Matador", "Afuera")
    if (artistOther) score -= 45;
    // a live take or a remix is still the song, but a studio version should win
    if (VERSION_WORDS.test(normalize(file.tags.title ?? name))) score -= 10;
    // one-word titles are easy to confuse: without the artist, only an exact name counts
    if (!artistSaid && s.title.split(/\s+/).length === 1 && fit < 1) continue;
    score = Math.max(0, Math.min(100, Math.round(score)));
    if (score >= 55 && (!best || score > best.score)) best = { target: { kind: 'song', id: s.id }, score, by };
  }
  return best;
}

/** Is this the national anthem ("Himno Nacional de Colombia", "himno.mp3", "Colombia national anthem")? */
export function isAnthem(file: Candidate): boolean {
  const name = normalize(basename(file.path));
  const text = normalize(`${file.path} ${file.tags.title ?? ''} ${file.tags.album ?? ''}`);
  if (name === 'himno') return true;
  return (contains(text, 'himno') || contains(text, 'anthem')) && (contains(text, 'nacional') || contains(text, 'national') || contains(text, 'colombia'));
}

/** A recorded line, named after its id ("llamada.andres.hola.m4a"); underscores work too. */
export function matchVoice(file: Candidate, lineIds: Set<string>): Match | null {
  const name = basename(file.path).trim().toLowerCase();
  for (const guess of [name, name.replace(/_/g, '.'), name.replace(/\s+/g, '')]) {
    if (lineIds.has(guess)) return { target: { kind: 'voice', id: guess }, score: 100, by: 'id' };
  }
  return null;
}

export function classify(file: Candidate, songs: SongRef[], lineIds: Set<string>): Match | null {
  return matchVoice(file, lineIds) ?? (isAnthem(file) ? { target: { kind: 'anthem' }, score: 90, by: 'name' } : null) ?? matchSong(file, songs);
}

export function targetKey(t: Target): string {
  return t.kind === 'anthem' ? 'anthem' : `${t.kind}:${t.id}`;
}

export interface Plan<F> {
  /** What to load, one file per target (the surest one). */
  load: { file: F; match: Match }[];
  /** Files that matched something another file matched better. */
  duplicates: { file: F; match: Match }[];
  /** Audio files we couldn't place. */
  unknown: F[];
}

/**
 * Sort a batch of files into what goes where. `listed` holds what a song list
 * that came with the files says each one is (by `fileKey`), and wins.
 */
export function plan<F extends Candidate>(files: F[], songs: SongRef[], lineIds: Set<string>, listed?: Map<string, Target>): Plan<F> {
  const best = new Map<string, { file: F; match: Match }>();
  const duplicates: { file: F; match: Match }[] = [];
  const unknown: F[] = [];
  for (const file of files) {
    const known = listed?.get(normalize(basename(file.path)));
    const match = known ? { target: known, score: 100, by: 'list' as const } : classify(file, songs, lineIds);
    if (!match) {
      unknown.push(file);
      continue;
    }
    const key = targetKey(match.target);
    const prev = best.get(key);
    if (!prev || match.score > prev.match.score) {
      if (prev) duplicates.push(prev);
      best.set(key, { file, match });
    } else duplicates.push({ file, match });
  }
  return { load: [...best.values()], duplicates, unknown };
}
