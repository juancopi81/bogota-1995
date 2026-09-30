import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `import files from 'virtual:house-music'`: the audio files in public/music/
 * (the room's own Creative Commons music), listed when the page is built. They
 * are served next to the page, at music/<file>.
 */
function houseMusic(): Plugin {
  const id = 'virtual:house-music';
  const dir = resolve('public/music');
  const list = () => (existsSync(dir) ? readdirSync(dir).filter((f) => /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i.test(f)).sort() : []);
  return {
    name: 'house-music',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (loaded) => (loaded === `\0${id}` ? `export default ${JSON.stringify(list())};` : undefined),
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
    plugins: single ? [houseMusic(), viteSingleFile()] : [houseMusic()],
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
