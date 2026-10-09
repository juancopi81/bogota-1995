// Mechanical one-shot sounds: keys, clicks, thumps, bells.
//
// Everything is synthesized (no sample files), rendered once into small
// buffers and cached. The recipes are deliberately simple and physical:
// a click is a very short noise burst through a resonance; a bell is a set of
// inharmonic partials struck repeatedly by a hammer.

type Render = (data: Float32Array, sampleRate: number) => void;

const cache = new Map<string, AudioBuffer>();

export function rendered(ctx: BaseAudioContext, key: string, seconds: number, render: Render): AudioBuffer {
  const cached = cache.get(key);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(seconds * ctx.sampleRate)), ctx.sampleRate);
  render(buffer.getChannelData(0), ctx.sampleRate);
  cache.set(key, buffer);
  return buffer;
}

/** Play a buffer once into `destination`. Returns the source (already started). */
export function play(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  destination: AudioNode,
  opts: { when?: number; gain?: number; rate?: number; offset?: number } = {},
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = opts.rate ?? 1;
  const gain = ctx.createGain();
  gain.gain.value = opts.gain ?? 1;
  source.connect(gain).connect(destination);
  source.start(opts.when ?? ctx.currentTime, opts.offset ?? 0);
  source.onended = () => gain.disconnect();
  return source;
}

// A two-pole resonator driven by an excitation; the building block of clicks.
function resonate(data: Float32Array, sr: number, freq: number, decay: number, amount: number, excite: (i: number) => number) {
  const r = Math.exp(-1 / (decay * sr));
  const w = (2 * Math.PI * freq) / sr;
  const a1 = 2 * r * Math.cos(w);
  const a2 = -r * r;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < data.length; i++) {
    const y = excite(i) + a1 * y1 + a2 * y2;
    y2 = y1;
    y1 = y;
    data[i] += y * amount;
  }
}

function burst(sr: number, ms: number): (i: number) => number {
  const n = Math.floor((ms / 1000) * sr);
  return (i) => (i >= 0 && i < n ? (Math.random() * 2 - 1) * (1 - i / n) : 0);
}

function normalize(data: Float32Array, peak = 0.9) {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / max;
}

export const sfx = {
  /** A small plastic click (buttons, switches, the counter reset). */
  click(ctx: BaseAudioContext) {
    return rendered(ctx, 'click', 0.06, (d, sr) => {
      resonate(d, sr, 3200, 0.004, 1, burst(sr, 2));
      resonate(d, sr, 900, 0.008, 0.6, burst(sr, 3));
      normalize(d, 0.7);
    });
  },

  /** A cassette piano key going down: plastic clack plus the mechanism engaging. */
  keyDown(ctx: BaseAudioContext) {
    return rendered(ctx, 'keyDown', 0.18, (d, sr) => {
      resonate(d, sr, 2400, 0.006, 1, burst(sr, 3));
      resonate(d, sr, 620, 0.03, 0.9, (i) => (i === Math.floor(0.012 * sr) ? 1 : 0) + burst(sr, 4)(i - Math.floor(0.012 * sr)));
      resonate(d, sr, 160, 0.05, 0.8, (i) => (i < 20 ? 0.5 : 0));
      normalize(d, 0.85);
    });
  },

  /** A key popping back up (STOP, or the auto-stop at the end of the tape). */
  keyUp(ctx: BaseAudioContext) {
    return rendered(ctx, 'keyUp', 0.2, (d, sr) => {
      resonate(d, sr, 1800, 0.01, 1, burst(sr, 2));
      resonate(d, sr, 420, 0.05, 1, (i) => (i < 30 ? 0.6 : 0));
      normalize(d, 0.9);
    });
  },

  /** The cassette door springing open. */
  doorOpen(ctx: BaseAudioContext) {
    return rendered(ctx, 'doorOpen', 0.45, (d, sr) => {
      resonate(d, sr, 1500, 0.01, 1, burst(sr, 3));
      resonate(d, sr, 230, 0.06, 0.8, (i) => (i < 40 ? 0.7 : 0));
      // the little spring: a decaying high wobble
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        if (t > 0.02) d[i] += 0.12 * Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-(t - 0.02) * 22) * (1 + 0.5 * Math.sin(2 * Math.PI * 30 * t));
      }
      normalize(d, 0.8);
    });
  },

  /** The phone's hook switch (cradle) clicking. */
  hook(ctx: BaseAudioContext) {
    return rendered(ctx, 'hook', 0.12, (d, sr) => {
      resonate(d, sr, 2100, 0.004, 1, burst(sr, 2));
      resonate(d, sr, 700, 0.012, 0.7, burst(sr, 2));
      normalize(d, 0.8);
    });
  },

  /** A dial pulse as heard on the line: a hard little tick. */
  pulse(ctx: BaseAudioContext) {
    return rendered(ctx, 'pulse', 0.03, (d, sr) => {
      resonate(d, sr, 1700, 0.002, 1, burst(sr, 1));
      resonate(d, sr, 500, 0.005, 0.8, (i) => (i < 6 ? 1 : 0));
      normalize(d, 0.8);
    });
  },

  /** A chunky rotary detent (the TV channel knob). */
  detent(ctx: BaseAudioContext) {
    return rendered(ctx, 'detent', 0.14, (d, sr) => {
      resonate(d, sr, 1300, 0.006, 1, burst(sr, 2));
      resonate(d, sr, 330, 0.03, 1, (i) => (i < 25 ? 0.8 : 0));
      normalize(d, 0.9);
    });
  },

  /** A hand slapping the side of the TV cabinet. */
  slap(ctx: BaseAudioContext) {
    return rendered(ctx, 'slap', 0.35, (d, sr) => {
      resonate(d, sr, 180, 0.08, 1, (i) => (i < 60 ? (Math.random() * 2 - 1) * 0.8 + 0.5 : 0));
      resonate(d, sr, 95, 0.12, 0.8, (i) => (i < 40 ? 1 : 0));
      resonate(d, sr, 2600, 0.01, 0.4, burst(sr, 6));
      normalize(d, 0.95);
    });
  },

  /** The TV's power relay + degaussing coil: clunk, then a fading 60 Hz buzz. */
  degauss(ctx: BaseAudioContext) {
    return rendered(ctx, 'degauss', 1.4, (d, sr) => {
      resonate(d, sr, 1100, 0.006, 1, burst(sr, 2));
      resonate(d, sr, 140, 0.05, 1, (i) => (i < 40 ? 1 : 0));
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        if (t < 0.03) continue;
        const env = Math.exp(-(t - 0.03) * 3.2) * Math.min(1, (t - 0.03) * 40);
        const buzz = Math.sign(Math.sin(2 * Math.PI * 60 * t)) * 0.3 + Math.sin(2 * Math.PI * 120 * t) * 0.5;
        d[i] += 0.35 * env * buzz;
      }
      normalize(d, 0.8);
    });
  },

  /** Coins dropping into a monedero's box: a few clinks, then the thunk of the box. */
  coins(ctx: BaseAudioContext) {
    return rendered(ctx, 'coins', 0.7, (d, sr) => {
      [0, 0.05, 0.11, 0.2].forEach((at, k) => {
        const start = Math.floor(at * sr);
        const strike = (i: number) => (i >= start && i < start + 12 ? (Math.random() * 2 - 1) * (1 - (i - start) / 12) : 0);
        resonate(d, sr, 2350 + k * 310, 0.05, 0.6 - k * 0.1, strike);
        resonate(d, sr, 3150 - k * 140, 0.03, 0.35, strike);
      });
      const thunk = Math.floor(0.28 * sr);
      resonate(d, sr, 170, 0.06, 1.2, (i) => (i >= thunk && i < thunk + 40 ? 1 - (i - thunk) / 40 : 0));
      normalize(d, 0.7);
    });
  },

  /** A short, hollow wooden knock (drawers, the desk). */
  knock(ctx: BaseAudioContext) {
    return rendered(ctx, 'knock', 0.25, (d, sr) => {
      resonate(d, sr, 240, 0.04, 1, (i) => (i < 30 ? 1 : 0));
      resonate(d, sr, 530, 0.02, 0.5, burst(sr, 4));
      normalize(d, 0.8);
    });
  },

  /**
   * One second of an electromechanical phone ringer: a clapper hitting two
   * gongs about 20 times a second. Rendered with its tail.
   */
  bell(ctx: BaseAudioContext) {
    return rendered(ctx, 'bell', 1.6, (d, sr) => {
      const gongs = [
        { f: 980, partials: [1, 2.32, 3.87, 5.52], decay: [0.9, 0.5, 0.3, 0.2] },
        { f: 1180, partials: [1, 2.41, 4.03, 5.9], decay: [0.8, 0.45, 0.28, 0.18] },
      ];
      const strikes = 21;
      for (let s = 0; s < strikes; s++) {
        const start = Math.floor(((s / 21) * 1.0) * sr);
        const gong = gongs[s % 2];
        const hit = 0.7 + Math.random() * 0.3;
        for (let p = 0; p < gong.partials.length; p++) {
          const f = gong.f * gong.partials[p] * (1 + (Math.random() - 0.5) * 0.002);
          const decay = gong.decay[p];
          const amp = hit / (p + 1);
          for (let i = start; i < d.length; i++) {
            const t = (i - start) / sr;
            const env = Math.exp(-t / (decay * 0.35));
            if (env < 0.001) break;
            d[i] += amp * env * Math.sin(2 * Math.PI * f * t);
          }
        }
        // the clapper's own tick
        for (let i = 0; i < 40 && start + i < d.length; i++) d[start + i] += (Math.random() * 2 - 1) * 0.3 * (1 - i / 40);
      }
      normalize(d, 0.85);
    });
  },
};
