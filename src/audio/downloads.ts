// The room's own files come down a few at a time, the ones needed soonest
// first, so the first minute's voices aren't stuck behind seven songs.

/** How many files download at once. */
const AT_ONCE = 4;

interface Job {
  /** When it's needed, in world seconds. */
  due: number;
  promise: Promise<ArrayBuffer | null>;
  start: () => void;
}

class Downloads {
  private waiting = new Map<string, Job>();
  private going = new Map<string, Promise<ArrayBuffer | null>>();
  private scheduled = false;

  /**
   * A file's bytes, or null if it can't be had. `due` is when it's needed
   * (world seconds; the earliest go first). Asking again for a file that is
   * still waiting can only bring it forward.
   */
  get(url: string, due: number): Promise<ArrayBuffer | null> {
    const queued = this.waiting.get(url);
    if (queued) {
      this.hurry(url, due);
      return queued.promise;
    }
    const going = this.going.get(url);
    if (going) return going;
    let start!: () => void;
    const promise = new Promise<ArrayBuffer | null>((resolve) => {
      start = () => {
        fetch(url)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .catch(() => null)
          .then((data) => {
            this.going.delete(url);
            this.pump();
            resolve(data);
          });
      };
    });
    this.waiting.set(url, { due, promise, start });
    // let a burst of requests line up before the first one goes
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        this.pump();
      });
    }
    return promise;
  }

  /** A file still waiting is needed sooner (or by `due`); one already coming is left alone. */
  hurry(url: string, due: number): void {
    const queued = this.waiting.get(url);
    if (queued) queued.due = Math.min(queued.due, due);
  }

  private pump(): void {
    while (this.going.size < AT_ONCE && this.waiting.size) {
      let next: [string, Job] | null = null;
      for (const entry of this.waiting) if (!next || entry[1].due < next[1].due) next = entry;
      const [url, job] = next!;
      this.waiting.delete(url);
      this.going.set(url, job.promise);
      job.start();
    }
  }
}

export const downloads = new Downloads();
