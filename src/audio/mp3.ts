// How long an MP3 plays, read from its frame headers without decoding it.
//
// The room's own files (the voices, the music in public/music/) are measured
// this way when the page is built, so the radio can plan the afternoon before
// a single file has downloaded (see vite.config.ts).

const BITRATES = {
  // kbps by [MPEG-1 or 2/2.5][layer 1, 2, 3][index]
  1: [
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  ],
  2: [
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  ],
};
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };

interface Frame {
  version: 1 | 2 | 2.5;
  layer: 1 | 2 | 3;
  sampleRate: number;
  samples: number;
  mono: boolean;
  /** Bytes, header included. */
  length: number;
}

function frameAt(b: Uint8Array, i: number): Frame | null {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const v = (b[i + 1] >> 3) & 3;
  const l = (b[i + 1] >> 1) & 3;
  const bi = b[i + 2] >> 4;
  const si = (b[i + 2] >> 2) & 3;
  if (v === 1 || l === 0 || bi === 0 || bi === 15 || si === 3) return null;
  const version = v === 3 ? 1 : v === 2 ? 2 : 2.5;
  const layer = (4 - l) as 1 | 2 | 3;
  const kbps = BITRATES[version === 1 ? 1 : 2][layer - 1][bi];
  const sampleRate = RATES[version][si];
  const pad = (b[i + 2] >> 1) & 1;
  const samples = layer === 1 ? 384 : layer === 3 && version !== 1 ? 576 : 1152;
  const length = layer === 1 ? (Math.floor((12000 * kbps) / sampleRate) + pad) * 4 : Math.floor(((samples / 8) * 1000 * kbps) / sampleRate) + pad;
  return { version, layer, sampleRate, samples, mono: b[i + 3] >> 6 === 3, length };
}

const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

/** Where the audio starts: after any ID3v2 tags. */
function audioStart(b: Uint8Array): number {
  let i = 0;
  while (i + 10 <= b.length && ascii(b, i, 3) === 'ID3') {
    const size = ((b[i + 6] & 127) << 21) | ((b[i + 7] & 127) << 14) | ((b[i + 8] & 127) << 7) | (b[i + 9] & 127);
    i += 10 + size + (b[i + 5] & 0x10 ? 10 : 0);
  }
  return i;
}

/**
 * Seconds of sound in an MP3, as a decoder plays it, or null if it isn't one.
 *
 * With an Xing/Info frame (LAME, FFmpeg) the frame count comes from there, and
 * the encoder delay and padding written after it are taken off, the way
 * browsers trim them. Without one, every frame is counted.
 */
export function mp3Duration(data: ArrayBuffer | Uint8Array): number | null {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data);
  // the first frame: a header whose next frame also starts where it should
  let i = audioStart(b);
  let first: Frame | null = null;
  for (; i + 4 <= b.length; i++) {
    first = frameAt(b, i);
    if (first && (i + first.length + 4 > b.length || frameAt(b, i + first.length))) break;
    first = null;
  }
  if (!first) return null;

  const side = first.version === 1 ? (first.mono ? 17 : 32) : first.mono ? 9 : 17;
  const x = i + 4 + side;
  const tag = ascii(b, x, 4);
  if (first.layer === 3 && (tag === 'Xing' || tag === 'Info')) {
    const flags = be32(b, x + 4);
    if (flags & 1) {
      const frames = be32(b, x + 8);
      // the encoder's own tag (LAME, Lavf, Lavc...) follows the Xing fields
      const lame = x + 8 + (flags & 1 ? 4 : 0) + (flags & 2 ? 4 : 0) + (flags & 4 ? 100 : 0) + (flags & 8 ? 4 : 0);
      let trim = 0;
      if (lame + 24 <= b.length && /^[A-Za-z]{4}/.test(ascii(b, lame, 4))) {
        const delay = (b[lame + 21] << 4) | (b[lame + 22] >> 4);
        const padding = ((b[lame + 22] & 15) << 8) | b[lame + 23];
        trim = delay + padding;
      }
      return Math.max(0, frames * first.samples - trim) / first.sampleRate;
    }
  }
  if (ascii(b, i + 36, 4) === 'VBRI') return (be32(b, i + 50) * first.samples) / first.sampleRate;

  let frames = 0;
  for (let at = i; ; frames++) {
    const f = frameAt(b, at);
    if (!f || f.sampleRate !== first.sampleRate || f.layer !== first.layer || at + f.length > b.length) break;
    at += f.length;
  }
  return (frames * first.samples) / first.sampleRate;
}
