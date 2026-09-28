import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` makes a normal static site in dist/.
// `npm run build:single` makes one self-contained HTML file in dist-single/
// that you can open by double-clicking (fonts and all code inlined).
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  } as never;
});
