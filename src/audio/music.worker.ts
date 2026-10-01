// Renders placeholder music off the main thread.

import { renderBed, renderJingle, renderSong, renderTeletype, type Style } from './music';

export interface MusicJob {
  id: number;
  kind: 'song' | 'jingle' | 'bed' | 'teletype';
  style: Style;
  seed: number;
}

self.onmessage = (event: MessageEvent<MusicJob>) => {
  const job = event.data;
  const result =
    job.kind === 'song'
      ? renderSong(job.style, job.seed)
      : job.kind === 'jingle'
        ? renderJingle(job.style, job.seed)
        : job.kind === 'bed'
          ? renderBed(job.style, job.seed)
          : renderTeletype(job.seed);
  (self as unknown as Worker).postMessage(
    { id: job.id, left: result.left, right: result.right, sampleRate: result.sampleRate, intro: result.intro },
    [result.left.buffer, result.right.buffer],
  );
};
