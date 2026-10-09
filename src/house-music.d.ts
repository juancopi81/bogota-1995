// The room's own audio, measured at build time (see vite.config.ts).

declare module 'virtual:house-music' {
  /** The audio files in public/music/: their tags, and how long they play (null if it couldn't be read). */
  const files: { file: string; seconds: number | null; tags: { title?: string; artist?: string; album?: string } }[];
  export default files;
}

declare module 'virtual:voice-lengths' {
  /** How long each included voice recording lasts (seconds), by line id. */
  const lengths: Record<string, number>;
  export default lengths;
}
