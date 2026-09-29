// The grabadora up close: a silver AM/FM radio-cassette recorder, the kind
// every Bogotá bedroom had, bought in San Andresito.

import { FM_RANGE, AM_RANGE } from '../objects/radio';

export const DIAL = { x0: 646, x1: 954, y: 240, h: 92 };

export function fmX(f: number): number {
  return DIAL.x0 + ((f - FM_RANGE[0]) / (FM_RANGE[1] - FM_RANGE[0])) * (DIAL.x1 - DIAL.x0);
}

export function amX(k: number): number {
  const l0 = Math.log(AM_RANGE[0]);
  const l1 = Math.log(AM_RANGE[1]);
  return DIAL.x0 + ((Math.log(k) - l0) / (l1 - l0)) * (DIAL.x1 - DIAL.x0);
}

export const KNOB = { cx: 1046, cy: 262, r: 46 };
export const FUNC = { x0: 636, x1: 786, y: 394, positions: [648, 711, 774] };
export const VOL = { x0: 836, x1: 966, y: 394 };
export const DECK = { x: 640, y: 426, w: 320, h: 200 };
export const CASSETTE_AT = { x: 680, y: 450 };
export const KEYS = ['rec', 'play', 'rew', 'ff', 'stop', 'pause'] as const;
export const KEY_Y = 640;
export const keyX = (i: number) => 641 + i * 54;
export const COUNTER = { x: 872, y: 712 };

const KEY_LABELS: Record<(typeof KEYS)[number], string> = {
  rec: '<circle cx="24" cy="24" r="7" fill="#d23a2c"/>',
  play: '<path d="M18 16 L32 24 L18 32Z" fill="#e8e4da"/>',
  rew: '<path d="M26 17 L14 24 L26 31Z M36 17 L24 24 L36 31Z" fill="#e8e4da"/>',
  ff: '<path d="M12 17 L24 24 L12 31Z M22 17 L34 24 L22 31Z" fill="#e8e4da"/>',
  stop: '<rect x="15" y="14" width="18" height="11" fill="#e8e4da"/><path d="M15 34 H33 L24 28Z" fill="#e8e4da"/>',
  pause: '<rect x="16" y="16" width="5" height="16" fill="#e8e4da"/><rect x="27" y="16" width="5" height="16" fill="#e8e4da"/>',
};

function speaker(cx: number, cy: number, side: string): string {
  let dots = '';
  for (let y = -160; y <= 160; y += 13) {
    for (let x = -160; x <= 160; x += 13) {
      const off = (Math.round(y / 13) % 2) * 6.5;
      if ((x + off) ** 2 + y ** 2 < 158 ** 2) dots += `<circle cx="${cx + x + off}" cy="${cy + y}" r="3.1"/>`;
    }
  }
  return `<g class="speaker speaker-${side}">
    <circle cx="${cx}" cy="${cy}" r="186" fill="url(#g-ring)"/>
    <circle cx="${cx}" cy="${cy}" r="168" fill="#26282c"/>
    <circle class="cone" cx="${cx}" cy="${cy}" r="120" fill="#303236"/>
    <circle class="cone-center" cx="${cx}" cy="${cy}" r="48" fill="#1f2023"/>
    <g fill="#16171a">${dots}</g>
    <circle cx="${cx}" cy="${cy}" r="168" fill="none" stroke="#5d6166" stroke-width="3"/>
  </g>`;
}

export function grabadoraSvg(): string {
  const fmLabels = [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108];
  const amLabels = [600, 700, 800, 1000, 1200, 1400, 1600];
  const ticks = (xs: number[], y: number) => xs.map((x) => `<path d="M${x} ${y}v6" stroke="#cdbb86" stroke-width="1.4"/>`).join('');
  const fine = (from: number, to: number, step: number, map: (v: number) => number, y: number) => {
    let s = '';
    for (let v = from; v <= to + 1e-6; v += step) s += `<path d="M${map(v)} ${y}v3" stroke="#cdbb86" stroke-width="0.8" opacity="0.7"/>`;
    return s;
  };
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d4d7da"/><stop offset="0.5" stop-color="#b9bdc1"/><stop offset="1" stop-color="#9ca1a6"/>
    </linearGradient>
    <radialGradient id="g-ring" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#dfe2e5"/><stop offset="1" stop-color="#8f9499"/>
    </radialGradient>
    <linearGradient id="g-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f262d"/><stop offset="1" stop-color="#11151a"/>
    </linearGradient>
    <linearGradient id="g-door-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3f46" stop-opacity="0.55"/><stop offset="0.5" stop-color="#20242a" stop-opacity="0.35"/><stop offset="1" stop-color="#3a3f46" stop-opacity="0.6"/>
    </linearGradient>
    <radialGradient id="g-knob-grad" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#5a5e63"/><stop offset="1" stop-color="#1c1d20"/>
    </radialGradient>
  </defs>

  <!-- the desk -->
  <rect x="0" y="0" width="1600" height="900" fill="#dcd3bf"/>
  <rect x="0" y="780" width="1600" height="120" fill="#9e6b47"/>
  <rect x="0" y="780" width="1600" height="8" fill="#b37d56"/>
  <ellipse cx="800" cy="792" rx="700" ry="20" fill="#000" opacity="0.22"/>

  <!-- handle -->
  <path d="M420 214 V156 Q420 124 452 124 H1148 Q1180 124 1180 156 V214" stroke="#26272a" stroke-width="34" fill="none" stroke-linecap="round"/>
  <path d="M440 150 Q444 140 460 140 H1140" stroke="#5c5f63" stroke-width="5" fill="none" stroke-linecap="round"/>

  <!-- body -->
  <rect x="130" y="200" width="1340" height="584" rx="42" fill="url(#g-body)"/>
  <rect x="130" y="200" width="1340" height="584" rx="42" fill="none" stroke="#6f7478" stroke-width="3"/>
  <rect x="150" y="212" width="1300" height="10" rx="5" fill="#fff" opacity="0.25"/>
  ${speaker(385, 510, 'l')}
  ${speaker(1215, 510, 'r')}

  <!-- center column -->
  <rect x="612" y="226" width="376" height="540" rx="14" fill="#a9adb2" opacity="0.55"/>

  <!-- dial window -->
  <rect x="${DIAL.x0 - 26}" y="${DIAL.y}" width="${DIAL.x1 - DIAL.x0 + 52}" height="${DIAL.h}" rx="6" fill="url(#g-glass)" stroke="#55595e" stroke-width="3"/>
  <text x="${DIAL.x0 - 16}" y="${DIAL.y + 30}" font-family="Anton, sans-serif" font-size="11" fill="#9a8a5c">FM</text>
  <text x="${DIAL.x0 - 16}" y="${DIAL.y + 72}" font-family="Anton, sans-serif" font-size="11" fill="#9a8a5c">AM</text>
  ${ticks(fmLabels.map(fmX), DIAL.y + 34)}
  ${fine(88, 108, 0.5, fmX, DIAL.y + 37)}
  ${fmLabels.map((f) => `<text x="${fmX(f)}" y="${DIAL.y + 28}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#e3d6a8">${f}</text>`).join('')}
  ${ticks(amLabels.map(amX), DIAL.y + 50)}
  ${amLabels.map((k) => `<text x="${amX(k)}" y="${DIAL.y + 72}" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#e3d6a8">${k / 10}</text>`).join('')}
  <text x="${DIAL.x1 + 10}" y="${DIAL.y + 72}" font-family="Anton, sans-serif" font-size="7" fill="#9a8a5c">×10</text>
  <text x="${DIAL.x1 + 10}" y="${DIAL.y + 30}" font-family="Anton, sans-serif" font-size="7" fill="#9a8a5c">MHz</text>
  <rect id="g-needle" x="${fmX(97.9) - 1.5}" y="${DIAL.y + 6}" width="3" height="${DIAL.h - 12}" fill="#e2472f"/>
  <rect x="${DIAL.x0 - 26}" y="${DIAL.y}" width="${DIAL.x1 - DIAL.x0 + 52}" height="30" rx="6" fill="#fff" opacity="0.05"/>
  <!-- the whole dial window takes a drag or the wheel -->
  <rect id="g-dial" class="grab" x="${DIAL.x0 - 26}" y="${DIAL.y}" width="${DIAL.x1 - DIAL.x0 + 52}" height="${DIAL.h}" rx="6" fill="transparent"/>
  <circle id="g-led-tune" cx="${DIAL.x1 - 58}" cy="${DIAL.y + DIAL.h + 16}" r="5" fill="#3b1e14"/>
  <text x="${DIAL.x1 - 48}" y="${DIAL.y + DIAL.h + 20}" font-family="Anton, sans-serif" font-size="10" fill="#4a4d52">SINTONÍA</text>

  <!-- tuning knob -->
  <g id="g-knob" class="grab" transform="translate(${KNOB.cx} ${KNOB.cy})">
    <circle r="${KNOB.r + 6}" fill="#8b9095"/>
    <g id="g-knob-rot">
      <circle r="${KNOB.r}" fill="url(#g-knob-grad)"/>
      ${Array.from({ length: 36 }, (_, i) => `<rect x="-1.5" y="${-KNOB.r}" width="3" height="8" fill="#101114" transform="rotate(${i * 10})"/>`).join('')}
      <circle cx="0" cy="${-KNOB.r + 18}" r="4" fill="#cfd2d4"/>
    </g>
  </g>
  <text x="${KNOB.cx}" y="${KNOB.cy + KNOB.r + 26}" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#4a4d52" letter-spacing="1">SINTONIZAR</text>

  <!-- function switch: tape (the radio off) / AM / FM -->
  <g id="g-func" class="grab">
    ${['CINTA', 'AM', 'FM'].map((l, i) => `<text x="${FUNC.positions[i]}" y="${FUNC.y - 18}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#3d4044">${l}</text>`).join('')}
    <text x="${FUNC.positions[0]}" y="${FUNC.y + 27}" text-anchor="middle" font-family="Anton, sans-serif" font-size="8" fill="#5d6166" letter-spacing="0.5">RADIO APAGADO</text>
    <rect x="${FUNC.x0}" y="${FUNC.y - 6}" width="${FUNC.x1 - FUNC.x0}" height="12" rx="6" fill="#26282b"/>
    <rect id="g-func-thumb" x="${FUNC.positions[2] - 14}" y="${FUNC.y - 16}" width="28" height="32" rx="4" fill="#2e3034" stroke="#8b9095" stroke-width="2"/>
    <rect x="${FUNC.x0 - 10}" y="${FUNC.y - 30}" width="${FUNC.x1 - FUNC.x0 + 20}" height="52" fill="transparent"/>
  </g>

  <!-- volume -->
  <g id="g-vol" class="grab">
    <text x="${(VOL.x0 + VOL.x1) / 2}" y="${VOL.y - 18}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#3d4044">VOLUMEN</text>
    <rect x="${VOL.x0}" y="${VOL.y - 5}" width="${VOL.x1 - VOL.x0}" height="10" rx="5" fill="#26282b"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M${VOL.x0 + (i * (VOL.x1 - VOL.x0)) / 10} ${VOL.y + 12}v5" stroke="#4a4d52" stroke-width="1.5"/>`).join('')}
    <rect id="g-vol-thumb" x="${VOL.x0 - 9}" y="${VOL.y - 15}" width="18" height="30" rx="3" fill="#2e3034" stroke="#8b9095" stroke-width="2"/>
    <rect x="${VOL.x0 - 14}" y="${VOL.y - 30}" width="${VOL.x1 - VOL.x0 + 28}" height="52" fill="transparent"/>
  </g>

  <!-- cassette compartment -->
  <rect x="${DECK.x}" y="${DECK.y}" width="${DECK.w}" height="${DECK.h}" rx="8" fill="#1b1d21"/>
  <g id="g-slot"></g>
  <g id="g-door" class="grab">
    <rect x="${DECK.x}" y="${DECK.y}" width="${DECK.w}" height="${DECK.h}" rx="8" fill="url(#g-door-grad)" stroke="#55595e" stroke-width="3"/>
    <rect x="${DECK.x + 16}" y="${DECK.y + 10}" width="${DECK.w - 32}" height="6" rx="3" fill="#fff" opacity="0.1"/>
    <text x="${DECK.x + DECK.w / 2}" y="${DECK.y + DECK.h - 10}" text-anchor="middle" font-family="Anton, sans-serif" font-size="9" fill="#9aa0a6" letter-spacing="2">PUSH ▲ EJECT</text>
  </g>

  <!-- piano keys -->
  <g id="g-keys">
    ${KEYS.map(
      (k, i) => `<g class="key grab" data-key="${k}" transform="translate(${keyX(i)} ${KEY_Y})">
        <rect class="key-shadow" x="0" y="54" width="48" height="10" fill="#1a1b1e"/>
        <g class="key-cap"><rect width="48" height="58" rx="3" fill="${k === 'rec' ? '#3a2322' : '#303236'}"/><rect width="48" height="8" rx="3" fill="#fff" opacity="0.12"/>${KEY_LABELS[k]}</g>
      </g>`,
    ).join('')}
  </g>

  <!-- recording light and counter -->
  <circle id="g-led-rec" cx="652" cy="${COUNTER.y + 17}" r="6" fill="#3a1410"/>
  <text x="664" y="${COUNTER.y + 21}" font-family="Anton, sans-serif" font-size="10" fill="#4a4d52">GRABANDO</text>
  <text x="${COUNTER.x - 70}" y="${COUNTER.y + 21}" font-family="Anton, sans-serif" font-size="10" fill="#4a4d52">CONTADOR</text>
  <!-- the counter's reset button, to its right (away from the keys) -->
  <g id="g-reset" class="grab" transform="translate(${COUNTER.x + 98} ${COUNTER.y + 17})">
    <circle r="9" fill="#2e3034" stroke="#8b9095" stroke-width="1.5"/><circle r="3" fill="#6f7478"/>
    <text y="24" text-anchor="middle" font-family="Anton, sans-serif" font-size="7" fill="#5d6166">000</text>
  </g>
  <rect x="${COUNTER.x}" y="${COUNTER.y}" width="80" height="34" rx="3" fill="#0e0f11"/>
  ${[0, 1, 2]
    .map(
      (i) => `<rect x="${COUNTER.x + 4 + i * 25}" y="${COUNTER.y + 4}" width="22" height="26" fill="#f0ece2"/>
  <text class="g-digit" x="${COUNTER.x + 15 + i * 25}" y="${COUNTER.y + 25}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="21" fill="#141414">0</text>`,
    )
    .join('')}

  <text x="800" y="768" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#55595e" letter-spacing="3">AM / FM STEREO RADIO CASSETTE RECORDER</text>
  <text x="385" y="760" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#55595e" letter-spacing="2">2 WAY · BASS REFLEX</text>

  <!-- cassettes on the desk -->
  <g id="g-desk"></g>
</svg>`;
}
