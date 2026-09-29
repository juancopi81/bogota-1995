// Reads the title and artist written inside an audio file: ID3 (MP3), the
// iTunes atoms (M4A/MP4) and Vorbis comments (FLAC). Enough to recognize a
// song whatever the file happens to be called.

export interface Tags {
  title?: string;
  artist?: string;
  album?: string;
}

/**
 * The tags of a file without reading all of it: the start (ID3v2, FLAC), the
 * last 128 bytes (ID3v1) or, for M4A, just the 'moov' box wherever it is.
 */
export async function tagsOfFile(file: Blob): Promise<Tags> {
  const MB = 1024 * 1024;
  const slice = async (from: number, to: number) => new Uint8Array(await file.slice(from, Math.min(file.size, to)).arrayBuffer());
  try {
    const head = await slice(0, 16);
    if (ascii(head, 0, 3) === 'ID3') {
      const size = 10 + syncsafe(head, 6);
      const start = await slice(0, Math.min(size, 4 * MB));
      const tail = file.size >= 128 ? await slice(file.size - 128, file.size) : new Uint8Array();
      return merge(id3v2(start), id3v1(tail));
    }
    if (ascii(head, 0, 4) === 'fLaC') return flac(await slice(0, MB));
    if (ascii(head, 4, 4) === 'ftyp') {
      // hop from box to box until the 'moov', then read only that
      let at = 0;
      for (let i = 0; i < 64 && at + 8 <= file.size; i++) {
        const h = await slice(at, at + 16);
        let size = uint32(h, 0);
        if (size === 1) size = uint32(h, 8) * 2 ** 32 + uint32(h, 12);
        else if (size === 0) size = file.size - at;
        if (size < 8) break;
        if (ascii(h, 4, 4) === 'moov') return mp4(await slice(at, at + Math.min(size, 16 * MB)));
        at += size;
      }
      return {};
    }
    return file.size >= 128 ? id3v1(await slice(file.size - 128, file.size)) : {};
  } catch {
    return {};
  }
}

export function readTags(buffer: ArrayBuffer): Tags {
  const b = new Uint8Array(buffer);
  try {
    if (ascii(b, 0, 3) === 'ID3') return merge(id3v2(b), id3v1(b));
    if (ascii(b, 0, 4) === 'fLaC') return flac(b);
    if (ascii(b, 4, 4) === 'ftyp') return mp4(b);
    return id3v1(b);
  } catch {
    return {};
  }
}

function merge(a: Tags, b: Tags): Tags {
  return { title: a.title || b.title, artist: a.artist || b.artist, album: a.album || b.album };
}

function ascii(b: Uint8Array, at: number, len: number): string {
  let s = '';
  for (let i = at; i < at + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function clean(s: string): string | undefined {
  // several values are separated by NULs (ID3v2.4): keep the first
  const v = s.split('\u0000')[0].trim();
  return v || undefined;
}

// ---------- ID3v2 (2.2, 2.3, 2.4) ----------

function syncsafe(b: Uint8Array, at: number): number {
  return ((b[at] & 0x7f) << 21) | ((b[at + 1] & 0x7f) << 14) | ((b[at + 2] & 0x7f) << 7) | (b[at + 3] & 0x7f);
}

function uint32(b: Uint8Array, at: number): number {
  return ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
}

function decodeText(b: Uint8Array): string {
  if (!b.length) return '';
  const enc = b[0];
  const body = b.subarray(1);
  if (enc === 0) return new TextDecoder('latin1').decode(body);
  if (enc === 3) return new TextDecoder('utf-8').decode(body);
  if (enc === 2) return new TextDecoder('utf-16be').decode(body);
  // UTF-16 with a byte-order mark
  if (body[0] === 0xfe && body[1] === 0xff) return new TextDecoder('utf-16be').decode(body.subarray(2));
  if (body[0] === 0xff && body[1] === 0xfe) return new TextDecoder('utf-16le').decode(body.subarray(2));
  return new TextDecoder('utf-16le').decode(body);
}

function id3v2(b: Uint8Array): Tags {
  const major = b[3];
  const flags = b[5];
  const end = Math.min(b.length, 10 + syncsafe(b, 6));
  let at = 10;
  if (flags & 0x40 && major >= 3) at += major === 4 ? syncsafe(b, at) : uint32(b, at) + 4;
  const tags: Tags = {};
  const idLen = major === 2 ? 3 : 4;
  const headLen = major === 2 ? 6 : 10;
  const names: Record<string, keyof Tags> =
    major === 2 ? { TT2: 'title', TP1: 'artist', TAL: 'album' } : { TIT2: 'title', TPE1: 'artist', TALB: 'album' };
  while (at + headLen <= end) {
    const id = ascii(b, at, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    const size = major === 2 ? (b[at + 3] << 16) | (b[at + 4] << 8) | b[at + 5] : major === 4 ? syncsafe(b, at + 4) : uint32(b, at + 4);
    const bodyAt = at + headLen;
    const key = names[id];
    if (key && size > 0 && bodyAt + size <= b.length) tags[key] ??= clean(decodeText(b.subarray(bodyAt, bodyAt + size)));
    at = bodyAt + size;
  }
  return tags;
}

// ---------- ID3v1 (the last 128 bytes) ----------

function id3v1(b: Uint8Array): Tags {
  if (b.length < 128) return {};
  const at = b.length - 128;
  if (ascii(b, at, 3) !== 'TAG') return {};
  const field = (from: number) => clean(new TextDecoder('latin1').decode(b.subarray(at + from, at + from + 30)).replace(/\s+$/, ''));
  return { title: field(3), artist: field(33), album: field(63) };
}

// ---------- MP4 / M4A: moov › udta › meta › ilst ----------

function mp4(b: Uint8Array): Tags {
  const found: Record<string, string | undefined> = {};
  const walk = (from: number, to: number, inList: boolean) => {
    let at = from;
    while (at + 8 <= to) {
      let size = uint32(b, at);
      const type = ascii(b, at + 4, 4);
      let head = 8;
      if (size === 1) {
        size = uint32(b, at + 8) * 2 ** 32 + uint32(b, at + 12);
        head = 16;
      } else if (size === 0) size = to - at;
      if (size < head || at + size > to) return;
      const inner = at + head;
      if (type === 'moov' || type === 'udta') walk(inner, at + size, false);
      else if (type === 'ilst') walk(inner, at + size, true);
      else if (type === 'meta') walk(inner + 4, at + size, false); // a full box: skip version and flags
      else if (inList && ascii(b, inner + 4, 4) === 'data') {
        // the value sits in a 'data' box: size, type, flags (4), locale (4), then UTF-8
        const dataSize = uint32(b, inner);
        found[type] = clean(new TextDecoder('utf-8').decode(b.subarray(inner + 16, inner + dataSize)));
      }
      at += size;
    }
  };
  walk(0, b.length, false);
  // the track's artist wins over the album's
  return { title: found['\u00a9nam'], artist: found['\u00a9ART'] ?? found.aART, album: found['\u00a9alb'] };
}

// ---------- FLAC: the VORBIS_COMMENT block ----------

function flac(b: Uint8Array): Tags {
  const tags: Tags = {};
  const le32 = (at: number) => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
  let at = 4;
  for (;;) {
    if (at + 4 > b.length) break;
    const last = b[at] & 0x80;
    const type = b[at] & 0x7f;
    const len = (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3];
    const body = at + 4;
    if (type === 4) {
      let p = body + 4 + le32(body); // skip the vendor string
      const count = le32(p);
      p += 4;
      for (let i = 0; i < count && p + 4 <= body + len; i++) {
        const n = le32(p);
        const entry = new TextDecoder('utf-8').decode(b.subarray(p + 4, p + 4 + n));
        p += 4 + n;
        const eq = entry.indexOf('=');
        const key = entry.slice(0, eq).toUpperCase();
        const value = clean(entry.slice(eq + 1));
        if (key === 'TITLE') tags.title ??= value;
        if (key === 'ARTIST') tags.artist ??= value;
        if (key === 'ALBUM') tags.album ??= value;
      }
    }
    at = body + len;
    if (last) break;
  }
  return tags;
}
