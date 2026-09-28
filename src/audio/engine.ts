// The room's sound system.
//
// Every sound source plays into a *channel* that sits somewhere in the room
// (the grabadora on the left, the TV on the right, the kitchen behind the
// door...). Opening a close-up "leans in": the focused channel gets louder and
// the rest of the room goes slightly muffled. Holding the phone to your ear
// shuts the room out much more.

export type ChannelId = 'radio' | 'tv' | 'phone' | 'window' | 'room' | 'house' | 'ear';
export type FocusId = 'radio' | 'tv' | 'phone' | 'window' | 'ear' | null;

interface ChannelSpec {
  pan: number;
  reverb: number;
  /** Lowpass for sources that are always heard through something (a door, a wall). */
  muffle: number;
}

const SPECS: Record<ChannelId, ChannelSpec> = {
  radio: { pan: -0.5, reverb: 0.22, muffle: 20000 },
  tv: { pan: 0.45, reverb: 0.25, muffle: 20000 },
  phone: { pan: 0.55, reverb: 0.2, muffle: 20000 },
  window: { pan: -0.05, reverb: 0.08, muffle: 20000 },
  room: { pan: 0, reverb: 0.05, muffle: 20000 },
  house: { pan: 0.8, reverb: 0.7, muffle: 2200 },
  ear: { pan: 0.08, reverb: 0, muffle: 20000 },
};

export class Channel {
  readonly input: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly level: GainNode;
  private readonly send: GainNode;

  constructor(
    private readonly engine: AudioEngine,
    readonly id: ChannelId,
    private readonly spec: ChannelSpec,
  ) {
    const ctx = engine.ctx;
    this.input = ctx.createGain();
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = spec.muffle;
    this.lowpass.Q.value = 0.5;
    this.level = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = spec.pan;
    this.send = ctx.createGain();
    this.send.gain.value = spec.reverb;

    this.input.connect(this.lowpass).connect(this.level).connect(panner);
    panner.connect(engine.master);
    panner.connect(this.send).connect(engine.reverbIn);
    if (id === 'ear') this.level.gain.value = 0;
  }

  /** Smoothly move the channel's loudness and muffling. */
  shape(level: number, cutoff: number, time = 0.18): void {
    const now = this.engine.ctx.currentTime;
    this.level.gain.setTargetAtTime(level, now, time);
    this.lowpass.frequency.setTargetAtTime(Math.min(cutoff, this.spec.muffle), now, time);
  }
}

export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly reverbIn: GainNode;
  readonly noise: { white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer };
  private readonly channels: Map<ChannelId, Channel>;
  private focusId: FocusId = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const ctx = this.ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(compressor).connect(ctx.destination);

    this.reverbIn = ctx.createGain();
    const convolver = ctx.createConvolver();
    convolver.buffer = roomImpulse(ctx, 0.55);
    this.reverbIn.connect(convolver).connect(this.master);

    this.noise = {
      white: noiseBuffer(ctx, 'white'),
      pink: noiseBuffer(ctx, 'pink'),
      brown: noiseBuffer(ctx, 'brown'),
    };

    this.channels = new Map(
      (Object.keys(SPECS) as ChannelId[]).map((id) => [id, new Channel(this, id, SPECS[id])]),
    );
  }

  async unlock(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  channel(id: ChannelId): Channel {
    return this.channels.get(id)!;
  }

  get focus(): FocusId {
    return this.focusId;
  }

  /** Lean in toward one source (or back out to the whole room with null). */
  setFocus(focus: FocusId): void {
    this.focusId = focus;
    for (const channel of this.channels.values()) {
      const id = channel.id;
      if (id === 'ear') {
        channel.shape(focus === 'ear' ? 1 : 0, 20000);
        continue;
      }
      if (focus === null) {
        channel.shape(1, 20000);
      } else if (focus === 'ear') {
        channel.shape(id === 'house' ? 0.5 : 0.32, 2600, 0.12);
      } else if (id === focus || (focus === 'phone' && id === 'phone')) {
        channel.shape(1.3, 20000);
      } else {
        channel.shape(0.55, 4200);
      }
    }
  }

  /** A looping noise source (already started) feeding into `destination`. */
  noiseSource(kind: keyof AudioEngine['noise'], destination: AudioNode, offset = Math.random() * 4): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise[kind];
    source.loop = true;
    source.connect(destination);
    source.start(0, offset);
    return source;
  }
}

function noiseBuffer(ctx: BaseAudioContext, kind: 'white' | 'pink' | 'brown', seconds = 6): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') {
      data[i] = white * 0.5;
    } else if (kind === 'pink') {
      // Paul Kellet's refined pink filter
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  // Crossfade the loop point so the loop never clicks.
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    data[i] = data[i] * w + data[length - fade + i] * (1 - w);
  }
  return buffer;
}

/** A small furnished bedroom: short, soft, a little boxy. */
function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const white = Math.random() * 2 - 1;
      lp += (white - lp) * 0.35; // soft furnishings eat the highs
      data[i] = lp * Math.exp(-t * 9) * (t < 0.004 ? t / 0.004 : 1);
    }
    // a couple of early reflections off the walls
    for (const [ms, g] of [[7, 0.5], [13, 0.35], [21, 0.25]] as const) {
      const i = Math.floor((ms / 1000) * ctx.sampleRate) + c * 17;
      if (i < length) data[i] += g * (c ? -1 : 1);
    }
  }
  return buffer;
}
