// The audio files in public/music/, listed at build time (see vite.config.ts).
declare module 'virtual:house-music' {
  const files: string[];
  export default files;
}
