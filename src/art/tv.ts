// The TV up close: a small color set in a wood-grain cabinet with a silver
// panel, the kind that sat on a dresser in 1995: a VHF knob that clunks from
// 2 to 13, a UHF knob nobody used, volume, a push button, and rabbit ears with
// aluminum foil on the tips. No brand on it; the labels in English, the way
// they came.

import { P } from './palette';

export const SCREEN = { x: 330, y: 246, w: 624, h: 468 };
export const CHANNEL_KNOB = { cx: 1172, cy: 352, r: 70 };
export const UHF_KNOB = { cx: 1108, cy: 546, r: 36 };
export const VOLUME_KNOB = { cx: 1236, cy: 546, r: 36 };
export const POWER = { x: 1072, y: 620, w: 100, h: 40 };
export const ANTENNA = { cx: 642, cy: 176, len: 150 };

const CABINET = { x: 252, y: 182, w: 1112, h: 604, r: 24 };

/** Angle on the channel knob for a channel number (2–13). */
export function channelAngle(ch: number): number {
  return -90 + (ch - 2) * 30;
}

// Walnut-look vinyl: long wavy grain lines, the same every time.
function grain(x: number, y: number, w: number, h: number): string {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lines: string[] = [];
  for (let gy = y + 5; gy < y + h; gy += 6 + rnd() * 10) {
    const amp = 1.5 + rnd() * 6;
    const len = 110 + rnd() * 200;
    let d = `M${x} ${gy.toFixed(1)}`;
    for (let gx = x; gx < x + w; gx += len) d += ` q ${(len / 2).toFixed(0)} ${(rnd() > 0.5 ? amp : -amp).toFixed(1)} ${len.toFixed(0)} 0`;
    lines.push(`<path d="${d}" stroke="#3b1f0d" stroke-opacity="${(0.1 + rnd() * 0.25).toFixed(2)}" stroke-width="${(1 + rnd() * 2.6).toFixed(1)}" fill="none"/>`);
  }
  return lines.join('');
}

const knobRibs = (cx: number, cy: number, r: number, n: number) =>
  Array.from({ length: n }, (_, i) => `<rect x="${cx - 1.5}" y="${cy - r}" width="3" height="7" fill="#0f0e0d" transform="rotate(${(i * 360) / n} ${cx} ${cy})"/>`).join('');

export function tvSvg(): string {
  const knobNumbers = Array.from({ length: 12 }, (_, i) => {
    const ch = i + 2;
    const a = (channelAngle(ch) * Math.PI) / 180;
    const r = CHANNEL_KNOB.r + 25;
    return `<text x="${(CHANNEL_KNOB.cx + Math.cos(a) * r).toFixed(1)}" y="${(CHANNEL_KNOB.cy + Math.sin(a) * r + 5).toFixed(1)}" text-anchor="middle" font-family="Anton, sans-serif" font-size="14" fill="#2f3134">${ch}</text>`;
  }).join('');
  const uhfTicks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 * Math.PI) / 180;
    const r0 = UHF_KNOB.r + 6;
    const r1 = UHF_KNOB.r + (i % 3 ? 10 : 14);
    return `<path d="M${(UHF_KNOB.cx + Math.cos(a) * r0).toFixed(1)} ${(UHF_KNOB.cy + Math.sin(a) * r0).toFixed(1)} L ${(UHF_KNOB.cx + Math.cos(a) * r1).toFixed(1)} ${(UHF_KNOB.cy + Math.sin(a) * r1).toFixed(1)}" stroke="#4a4d51" stroke-width="1.5"/>`;
  }).join('');
  const { x, y, w, h, r } = CABINET;
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tv-wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#93603a"/><stop offset="1" stop-color="#6b4024"/>
    </linearGradient>
    <linearGradient id="tv-silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dcdedf"/><stop offset="1" stop-color="#9fa4a8"/>
    </linearGradient>
    <radialGradient id="tv-knob" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#5d5955"/><stop offset="1" stop-color="#1b1917"/>
    </radialGradient>
    <radialGradient id="tv-off" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#4b5856"/><stop offset="1" stop-color="#1b2121"/>
    </radialGradient>
    <clipPath id="tv-cab-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
  </defs>
  <rect width="1600" height="900" fill="${P.wall}"/>
  <!-- the dresser top and the doily -->
  <rect x="0" y="790" width="1600" height="110" fill="${P.woodLight}"/>
  <rect x="0" y="790" width="1600" height="8" fill="#b37d56"/>
  <path d="M210 784 H1390 V800 ${Array.from({ length: 37 }, () => 'a 16 16 0 0 1 -32 0').join(' ')} Z" fill="#f4f1e8"/>
  <path d="M220 792 H1380" stroke="#d8d2c2" stroke-width="2" stroke-dasharray="4 4"/>

  <!-- rabbit ears -->
  <g id="tv-antenna">
    <g id="tv-ear-l" class="grab"><line x1="0" y1="0" x2="0" y2="${-ANTENNA.len}" stroke="#9aa0a4" stroke-width="7" stroke-linecap="round"/>
      <line x1="0" y1="-30" x2="0" y2="${-ANTENNA.len}" stroke="#c7ccd0" stroke-width="3"/>
      <path d="M-11 ${-ANTENNA.len - 10} l 14 -8 l 12 6 l -2 16 l -14 6 l -10 -8z" fill="#d5dade" stroke="#9aa0a4"/>
      <line x1="0" y1="0" x2="0" y2="${-ANTENNA.len - 30}" stroke="transparent" stroke-width="40"/></g>
    <g id="tv-ear-r" class="grab"><line x1="0" y1="0" x2="0" y2="${-ANTENNA.len}" stroke="#9aa0a4" stroke-width="7" stroke-linecap="round"/>
      <line x1="0" y1="-30" x2="0" y2="${-ANTENNA.len}" stroke="#c7ccd0" stroke-width="3"/>
      <path d="M-9 ${-ANTENNA.len - 8} l 12 -9 l 13 5 l 0 15 l -13 8 l -12 -6z" fill="#dfe3e6" stroke="#9aa0a4"/>
      <line x1="0" y1="0" x2="0" y2="${-ANTENNA.len - 30}" stroke="transparent" stroke-width="40"/></g>
    <ellipse cx="${ANTENNA.cx}" cy="${ANTENNA.cy + 6}" rx="54" ry="20" fill="#2a2b2d"/>
  </g>

  <!-- the wood-grain cabinet (click its sides to give it a whack) -->
  <g id="tv-cabinet" class="grab">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#tv-wood)"/>
    <g clip-path="url(#tv-cab-clip)">${grain(x, y, w, h)}</g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#2e170a" stroke-width="3"/>
    <rect x="${x + 14}" y="${y + 6}" width="${w - 28}" height="10" rx="5" fill="#fff" opacity="0.1"/>
  </g>
  <rect x="288" y="206" width="1044" height="556" rx="18" fill="none" stroke="#b5b9bc" stroke-width="5"/>

  <!-- the screen, deep in its bezel -->
  <rect x="300" y="218" width="690" height="532" rx="40" fill="#161515"/>
  <rect class="tv-off-glass" x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="36" fill="url(#tv-off)"/>

  <!-- the silver control panel -->
  <rect x="1030" y="218" width="290" height="532" rx="10" fill="url(#tv-silver)"/>
  <rect x="1030" y="218" width="290" height="532" rx="10" fill="none" stroke="#7d8286" stroke-width="2"/>
  <text x="1052" y="248" font-family="Anton, sans-serif" font-size="14" fill="#3a3d40" letter-spacing="3">VHF</text>
  ${knobNumbers}
  <g id="tv-channel" class="grab">
    <circle cx="${CHANNEL_KNOB.cx}" cy="${CHANNEL_KNOB.cy}" r="${CHANNEL_KNOB.r + 6}" fill="#6f7478"/>
    <circle cx="${CHANNEL_KNOB.cx}" cy="${CHANNEL_KNOB.cy}" r="${CHANNEL_KNOB.r}" fill="url(#tv-knob)"/>
    ${knobRibs(CHANNEL_KNOB.cx, CHANNEL_KNOB.cy, CHANNEL_KNOB.r, 40)}
    <g id="tv-channel-rot">
      <rect x="${CHANNEL_KNOB.cx - 10}" y="${CHANNEL_KNOB.cy - CHANNEL_KNOB.r + 8}" width="20" height="${CHANNEL_KNOB.r * 2 - 16}" rx="7" fill="#2b2826"/>
      <rect x="${CHANNEL_KNOB.cx - 3}" y="${CHANNEL_KNOB.cy - CHANNEL_KNOB.r + 12}" width="6" height="22" fill="#e9e3d6"/>
    </g>
  </g>

  <text x="${UHF_KNOB.cx}" y="${UHF_KNOB.cy - UHF_KNOB.r - 24}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#3a3d40" letter-spacing="3">UHF</text>
  ${uhfTicks}
  <g id="tv-uhf" class="grab">
    <circle cx="${UHF_KNOB.cx}" cy="${UHF_KNOB.cy}" r="${UHF_KNOB.r}" fill="url(#tv-knob)"/>
    ${knobRibs(UHF_KNOB.cx, UHF_KNOB.cy, UHF_KNOB.r, 24)}
    <g id="tv-uhf-rot"><rect x="${UHF_KNOB.cx - 2.5}" y="${UHF_KNOB.cy - UHF_KNOB.r + 7}" width="5" height="14" fill="#e9e3d6"/></g>
  </g>
  <text x="${VOLUME_KNOB.cx}" y="${VOLUME_KNOB.cy - VOLUME_KNOB.r - 24}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#3a3d40" letter-spacing="3">VOLUME</text>
  <text x="${VOLUME_KNOB.cx - VOLUME_KNOB.r - 6}" y="${VOLUME_KNOB.cy + VOLUME_KNOB.r + 16}" text-anchor="middle" font-family="Anton, sans-serif" font-size="9" fill="#4a4d51">MIN</text>
  <text x="${VOLUME_KNOB.cx + VOLUME_KNOB.r + 6}" y="${VOLUME_KNOB.cy + VOLUME_KNOB.r + 16}" text-anchor="middle" font-family="Anton, sans-serif" font-size="9" fill="#4a4d51">MAX</text>
  <g id="tv-volume" class="grab">
    <circle cx="${VOLUME_KNOB.cx}" cy="${VOLUME_KNOB.cy}" r="${VOLUME_KNOB.r}" fill="url(#tv-knob)"/>
    ${knobRibs(VOLUME_KNOB.cx, VOLUME_KNOB.cy, VOLUME_KNOB.r, 24)}
    <g id="tv-volume-rot"><rect x="${VOLUME_KNOB.cx - 2.5}" y="${VOLUME_KNOB.cy - VOLUME_KNOB.r + 7}" width="5" height="14" fill="#e9e3d6"/></g>
  </g>

  <g id="tv-power" class="grab">
    <rect x="${POWER.x}" y="${POWER.y + 4}" width="${POWER.w}" height="${POWER.h}" rx="5" fill="#55595d"/>
    <rect x="${POWER.x}" y="${POWER.y}" width="${POWER.w}" height="${POWER.h}" rx="5" fill="#2a2b2d" stroke="#6f7478" stroke-width="2"/>
    <text x="${POWER.x + POWER.w / 2}" y="${POWER.y + 26}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#c9cdd1" letter-spacing="2">POWER</text>
  </g>
  <circle cx="${POWER.x + POWER.w + 30}" cy="${POWER.y + 20}" r="9" fill="#7d8286"/>
  <circle id="tv-led" cx="${POWER.x + POWER.w + 30}" cy="${POWER.y + 20}" r="6" fill="#3a1410"/>
  ${[688, 700, 712, 724].map((gy) => `<rect x="1062" y="${gy}" width="226" height="6" rx="3" fill="#3e4144"/>`).join('')}

  <!-- the nameplate under the screen -->
  <rect x="${645 - 62}" y="758" width="124" height="22" rx="3" fill="url(#tv-silver)" stroke="#7d8286"/>
  <text x="645" y="774" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#3a3d40" letter-spacing="6">COLOR</text>
</svg>`;
}
