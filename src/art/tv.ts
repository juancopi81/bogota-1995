// The TV up close: a small color set with a clicking channel knob, a volume
// knob, a push button, and rabbit ears with aluminum foil on the tips.

import { P } from './palette';

export const SCREEN = { x: 330, y: 246, w: 624, h: 468 };
export const CHANNEL_KNOB = { cx: 1172, cy: 356, r: 70 };
export const VOLUME_KNOB = { cx: 1172, cy: 560, r: 44 };
export const POWER = { x: 1126, y: 650, w: 92, h: 40 };
export const ANTENNA = { cx: 642, cy: 176, len: 150 };

/** Angle on the channel knob for a channel number (2–13). */
export function channelAngle(ch: number): number {
  return -90 + (ch - 2) * 30;
}

export function tvSvg(): string {
  const knobNumbers = Array.from({ length: 12 }, (_, i) => {
    const ch = i + 2;
    const a = (channelAngle(ch) * Math.PI) / 180;
    const r = CHANNEL_KNOB.r + 26;
    return `<text x="${CHANNEL_KNOB.cx + Math.cos(a) * r}" y="${CHANNEL_KNOB.cy + Math.sin(a) * r + 5}" text-anchor="middle" font-family="Anton, sans-serif" font-size="14" fill="#d8d2c6">${ch}</text>`;
  }).join('');
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tv-cab" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a544f"/><stop offset="1" stop-color="#3d3834"/>
    </linearGradient>
    <radialGradient id="tv-knob" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#6a6560"/><stop offset="1" stop-color="#1f1c1a"/>
    </radialGradient>
    <radialGradient id="tv-off" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#4b5856"/><stop offset="1" stop-color="#1b2121"/>
    </radialGradient>
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

  <!-- the cabinet (click its sides to give it a whack) -->
  <g id="tv-cabinet" class="grab">
    <rect x="252" y="182" width="1112" height="604" rx="28" fill="url(#tv-cab)"/>
    <rect x="252" y="182" width="1112" height="18" rx="9" fill="#fff" opacity="0.08"/>
  </g>
  <rect x="300" y="218" width="690" height="532" rx="40" fill="#141313"/>
  <rect class="tv-off-glass" x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="36" fill="url(#tv-off)"/>

  <!-- control panel -->
  <rect x="1030" y="218" width="290" height="532" rx="10" fill="#34302c"/>
  <text x="${CHANNEL_KNOB.cx}" y="240" text-anchor="middle" font-family="Anton, sans-serif" font-size="13" fill="#a39c94" letter-spacing="3">CANAL · VHF</text>
  ${knobNumbers}
  <g id="tv-channel" class="grab">
    <circle cx="${CHANNEL_KNOB.cx}" cy="${CHANNEL_KNOB.cy}" r="${CHANNEL_KNOB.r}" fill="url(#tv-knob)"/>
    <g id="tv-channel-rot">
      <rect x="${CHANNEL_KNOB.cx - 9}" y="${CHANNEL_KNOB.cy - CHANNEL_KNOB.r + 4}" width="18" height="${CHANNEL_KNOB.r * 2 - 8}" rx="6" fill="#2b2826"/>
      <rect x="${CHANNEL_KNOB.cx - 3}" y="${CHANNEL_KNOB.cy - CHANNEL_KNOB.r + 8}" width="6" height="22" fill="#e9e3d6"/>
    </g>
  </g>
  <text x="${VOLUME_KNOB.cx}" y="${VOLUME_KNOB.cy - VOLUME_KNOB.r - 18}" text-anchor="middle" font-family="Anton, sans-serif" font-size="13" fill="#a39c94" letter-spacing="3">VOLUMEN</text>
  <g id="tv-volume" class="grab">
    <circle cx="${VOLUME_KNOB.cx}" cy="${VOLUME_KNOB.cy}" r="${VOLUME_KNOB.r}" fill="url(#tv-knob)"/>
    <g id="tv-volume-rot"><rect x="${VOLUME_KNOB.cx - 3}" y="${VOLUME_KNOB.cy - VOLUME_KNOB.r + 6}" width="6" height="18" fill="#e9e3d6"/></g>
  </g>
  <g id="tv-power" class="grab">
    <rect x="${POWER.x}" y="${POWER.y}" width="${POWER.w}" height="${POWER.h}" rx="5" fill="#1f1d1b" stroke="#6b6560" stroke-width="2"/>
    <text x="${POWER.x + POWER.w / 2}" y="${POWER.y + 26}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#a39c94" letter-spacing="2">POWER</text>
  </g>
  <circle id="tv-led" cx="${POWER.x + POWER.w + 26}" cy="${POWER.y + 20}" r="6" fill="#3a1410"/>
  ${[712, 724, 736].map((y) => `<rect x="1070" y="${y}" width="210" height="5" rx="2" fill="#1f1d1b"/>`).join('')}
  <text x="645" y="776" text-anchor="middle" font-family="Anton, sans-serif" font-size="13" fill="#8f8880" letter-spacing="6">C O L O R</text>
</svg>`;
}
