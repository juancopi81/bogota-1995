import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes a normal static site in dist/.
// `npm run build:single` makes one self-contained HTML file in dist-single/
// that you can open by double-clicking (fonts and all code inlined).
// `npm run build:artifact` makes the same single file, shaped for a claude.ai
// artifact, in dist-artifact/ (no YouTube clips there: artifacts can't embed them).
export default defineConfig(({ mode }) => {
  const single = mode === 'single' || mode === 'artifact';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
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
