import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { mp3Duration } from './src/audio/mp3.ts';
import { readTags } from './src/audio/tags.ts';

const read = (path: string) => {
  const data = readFileSync(path);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
};

/**
 * What the room's own audio is, read when the page is built, so the radio can
 * plan the afternoon before a single file has downloaded:
 *
 * - `import files from 'virtual:house-music'`: the audio files in
 *   public/music/ (the room's own Creative Commons music), with their tags and
 *   length. They are served next to the page, at music/<file>.
 * - `import lengths from 'virtual:voice-lengths'`: how long each included
 *   voice recording in src/assets/voices/ lasts, by line id.
 */
function roomAudio({ music }: { music: boolean }): Plugin {
  const modules: Record<string, () => unknown> = {
    'virtual:house-music': () => {
      const dir = resolve('public/music');
      const files = music && existsSync(dir) ? readdirSync(dir).filter((f) => /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f)).sort() : [];
      return files.map((file) => {
        const data = read(resolve(dir, file));
        return { file, seconds: /\.mp3$/i.test(file) ? mp3Duration(data) : null, tags: readTags(data) };
      });
    },
    'virtual:voice-lengths': () => {
      const dir = resolve('src/assets/voices');
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).sort() : [];
      return Object.fromEntries(files.flatMap((file) => {
        const seconds = mp3Duration(read(resolve(dir, file)));
        return seconds ? [[file.replace(/\.mp3$/, ''), seconds]] : [];
      }));
    },
  };
  return {
    name: 'room-audio',
    resolveId: (source) => (Object.hasOwn(modules, source) ? `\0${source}` : undefined),
    load: (id) => {
      const make = id.startsWith('\0') && Object.hasOwn(modules, id.slice(1)) ? modules[id.slice(1)] : undefined;
      return make ? `export default ${JSON.stringify(make())};` : undefined;
    },
  };
}

// `npm run build` makes a normal static site in dist/.
// `npm run build:single` makes one self-contained HTML file in dist-single/
// that you can open by double-clicking (fonts and all code inlined).
// `npm run build:artifact` makes the same single file, shaped for a claude.ai
// artifact, in dist-artifact/ (no YouTube clips there: artifacts can't embed them).
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'artifact';
  return {
    base: './',
    // the artifact is one page: public/music/ doesn't go with it
    plugins: [roomAudio({ music: mode !== 'artifact' }), ...(single ? [viteSingleFile()] : [])],
    build: {
      target: 'es2022',
      outDir: mode === 'artifact' ? 'dist-artifact' : single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  } as never;
});
