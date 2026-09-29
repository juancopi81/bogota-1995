// A song list that travels with a folder of files: a CSV exported from a
// spreadsheet. It says exactly which file is which song, and on which station
// it plays. Where it disagrees with the room, the backstage says so, and you
// can send the differences over.

import { basename, isAnthem, matchSong, normalize, type SongRef, type Target } from './matching';

export interface ManifestRow {
  title: string;
  artist: string;
  file: string;
  station: string;
}

export interface StationRef {
  label: string;
  freq: number;
  catalog: string[];
}

export interface ManifestCheck {
  /** Each listed file (by its normalized name) and what it is. */
  files: Map<string, Target>;
  /** Listed songs the room doesn't have. */
  missing: ManifestRow[];
  /** Listed songs that play on a different station in the room. */
  moved: { row: ManifestRow; songId: string; listed: string; room: string[] }[];
}

/** Rows of a CSV (quoted fields, commas and line breaks inside quotes, "" for a quote). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  // spreadsheets in Spanish often export with semicolons
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const COLUMNS = {
  title: ['titulo', 'title', 'cancion', 'song', 'tema'],
  artist: ['artista_o_grupo', 'artista', 'artist', 'grupo', 'interprete'],
  file: ['archivo_mp3_sugerido', 'archivo', 'file', 'filename', 'mp3', 'archivo_mp3'],
  station: ['emisora', 'station', 'radio'],
};

/** The rows of a song list, or null if the CSV doesn't look like one. */
export function readManifest(text: string): ManifestRow[] | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const head = rows[0].map((h) => normalize(h).replace(/ /g, '_'));
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const ti = col(COLUMNS.title);
  const ar = col(COLUMNS.artist);
  const fi = col(COLUMNS.file);
  const st = col(COLUMNS.station);
  if (ti < 0 || fi < 0) return null;
  return rows.slice(1).map((r) => ({
    title: (r[ti] ?? '').trim(),
    artist: ar >= 0 ? (r[ar] ?? '').trim() : '',
    file: (r[fi] ?? '').trim(),
    station: st >= 0 ? (r[st] ?? '').trim() : '',
  }));
}

/** How a file is known in a list: its name, without folders, extension or accents. */
export function fileKey(path: string): string {
  return normalize(basename(path));
}

/** Which station a list means ("Radioacktiva 97.9" → the one at 97.9), by its frequency. */
function stationFor(text: string, stations: StationRef[]): StationRef | null {
  const n = text.match(/(\d{2,4}(?:[.,]\d)?)/)?.[1];
  if (!n) return null;
  const f = parseFloat(n.replace(',', '.'));
  return stations.find((s) => Math.abs(s.freq - f) < 0.05) ?? null;
}

export function checkManifest(rows: ManifestRow[], songs: SongRef[], stations: StationRef[]): ManifestCheck {
  const files = new Map<string, Target>();
  const missing: ManifestRow[] = [];
  const moved: ManifestCheck['moved'] = [];
  for (const row of rows) {
    if (!row.title && !row.file) continue;
    const asFile = { path: row.file || row.title, tags: { title: row.title, artist: row.artist } };
    if (isAnthem(asFile) || /\bhimno\b/.test(normalize(row.station))) {
      if (row.file) files.set(fileKey(row.file), { kind: 'anthem' });
      continue;
    }
    const match = matchSong({ path: `${row.artist} - ${row.title}`, tags: { title: row.title, artist: row.artist } }, songs);
    if (!match || match.target.kind !== 'song') {
      missing.push(row);
      continue;
    }
    const songId = match.target.id;
    if (row.file) files.set(fileKey(row.file), match.target);
    const listed = stationFor(row.station, stations);
    const room = stations.filter((s) => s.catalog.includes(songId));
    if (listed && !room.includes(listed)) moved.push({ row, songId, listed: listed.label, room: room.map((s) => s.label) });
  }
  return { files, missing, moved };
}
