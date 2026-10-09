import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mp3Duration } from '../src/audio/mp3';

const DIR = join(process.cwd(), 'src/assets/voices');
const MANIFEST = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as { clips: { id: string; duration_seconds?: number }[] };

// one MPEG-1 Layer III frame of silence: 128 kbps, 44.1 kHz, mono, 417 bytes (as in scripts/e2e-loading.mjs)
const FRAME = [0xff, 0xfb, 0x90, 0xc0, ...new Array(413).fill(0)];

describe('MP3 length, read when the page is built', () => {
  it('matches ffprobe on the included voices', () => {
    const measured = MANIFEST.clips.filter((clip) => clip.duration_seconds);
    expect(measured.length).toBeGreaterThan(100);
    for (const clip of measured) expect(mp3Duration(readFileSync(join(DIR, `${clip.id}.mp3`)))).toBeCloseTo(clip.duration_seconds!, 3);
  });

  it("takes the encoder's delay and padding off, as decoders do", () => {
    // ffprobe's lengths for two of the room's own tracks
    expect(mp3Duration(readFileSync('public/music/los-sundayers-que-paciencia.mp3'))).toBeCloseTo(173.12, 4);
    expect(mp3Duration(readFileSync('public/music/himno-nacional-de-colombia.mp3'))).toBeCloseTo(160.914286, 4);
  });

  it('counts the frames when there is no Info frame, after an ID3 tag', () => {
    const id3 = [0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 5, 1, 2, 3, 4, 5];
    const file = new Uint8Array([...id3, ...Array.from({ length: 100 }, () => FRAME).flat()]);
    expect(mp3Duration(file)).toBeCloseTo((100 * 1152) / 44100, 6);
  });

  it("says nothing about a file that isn't an MP3", () => {
    expect(mp3Duration(new TextEncoder().encode('fLaC, and nothing else'))).toBeNull();
    expect(mp3Duration(new Uint8Array())).toBeNull();
  });
});
