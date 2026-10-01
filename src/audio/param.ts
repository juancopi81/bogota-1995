// Glide an AudioParam toward a value, but only when the target changes.
// (Scheduling the same ramp every frame piles up automation events.)

const targets = new WeakMap<AudioParam, number>();

export function glide(param: AudioParam, value: number, now: number, time = 0.05, epsilon = 1e-4): void {
  const last = targets.get(param);
  if (last !== undefined && Math.abs(last - value) <= epsilon * Math.max(1, Math.abs(value))) return;
  targets.set(param, value);
  param.setTargetAtTime(value, now, time);
}
