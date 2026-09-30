// The grabadora up close: a black mid-90s CD radio-cassette, rounded like a
// bar of soap, the kind so many Bogotá bedrooms had by 1995. A digital tuner with
// a green LCD, two decks (1 plays, 2 records), a CD lid on top, and the
// labels in English, the way they came.

export const BODY = { x: 110, y: 232, w: 1380, h: 540, r: 150 };
export const GRILLE_L = { cx: 372, cy: 500, rx: 222, ry: 212 };
export const GRILLE_R = { cx: 1228, cy: 500, rx: 222, ry: 212 };
export const PANEL = { x: 598, y: 290, w: 404, h: 190 };
export const LCD = { x: 684, y: 310, w: 232, h: 92 };
export const TUNE_DOWN = { cx: 640, cy: 356, r: 27 };
export const TUNE_UP = { cx: 960, cy: 356, r: 27 };
export const FUNC = { x0: 690, x1: 910, y: 450, positions: [704, 800, 896] };
export const VOLUME = { cx: 420, cy: 212, r: 34 };
export const KEYS = ['rec', 'play', 'rew', 'ff', 'stop', 'pause'] as const;
export const KEY_Y = 490;
export const keyX = (i: number) => 612 + i * 63;
export const DECK1 = { x: 610, y: 560, w: 186, h: 168 };
export const DECK = { x: 804, y: 560, w: 186, h: 168 };
export const CASSETTE_SCALE = 0.64;
export const CASSETTE_AT = { x: DECK.x + 16, y: DECK.y + 30 };
export const COUNTER = { x: 858, y: 736 };

const KEY_LABELS: Record<(typeof KEYS)[number], string> = {
  rec: '<circle cx="28" cy="25" r="7" fill="#d23a2c"/>',
  play: '<path d="M22 17 L36 25 L22 33Z" fill="#dcd8ce"/>',
  rew: '<path d="M30 18 L18 25 L30 32Z M40 18 L28 25 L40 32Z" fill="#dcd8ce"/>',
  ff: '<path d="M16 18 L28 25 L16 32Z M26 18 L38 25 L26 32Z" fill="#dcd8ce"/>',
  stop: '<rect x="19" y="15" width="18" height="10" fill="#dcd8ce"/><path d="M19 34 H37 L28 28Z" fill="#dcd8ce"/>',
  pause: '<rect x="20" y="17" width="5" height="16" fill="#dcd8ce"/><rect x="31" y="17" width="5" height="16" fill="#dcd8ce"/>',
};

// "1 PLAY" or "2 RECORD" across the top of a deck door, above the window.
function deckLabel(d: { x: number; y: number; w: number }, n: string, word: string): string {
  return `<text x="${d.x + 14}" y="${d.y + 23}" font-family="Anton, sans-serif" font-size="16" fill="#c9cdd1">${n}</text>
    <text x="${d.x + 30}" y="${d.y + 22}" font-family="Anton, sans-serif" font-size="8" fill="#9aa0a6" letter-spacing="1">${word}</text>
    <path d="M${d.x + 84} ${d.y + 18} H ${d.x + d.w - 14}" stroke="#3d7fc4" stroke-width="2.5"/>`;
}

function grille(g: { cx: number; cy: number; rx: number; ry: number }, side: 'l' | 'r'): string {
  const tweeter = side === 'l' ? g.cx + g.rx * 0.46 : g.cx - g.rx * 0.46;
  return `<g class="speaker speaker-${side}">
    <ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx + 12}" ry="${g.ry + 12}" fill="#17181a"/>
    <ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="#26282b"/>
    <circle cx="${g.cx}" cy="${g.cy + 14}" r="118" fill="#2e3034"/>
    <circle cx="${g.cx}" cy="${g.cy + 14}" r="44" fill="#1f2023"/>
    <circle cx="${tweeter}" cy="${g.cy - g.ry * 0.42}" r="34" fill="#2b2d31"/>
    <circle cx="${tweeter}" cy="${g.cy - g.ry * 0.42}" r="14" fill="#1c1d20"/>
    <ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="url(#g-mesh)"/>
    <ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="none" stroke="#3b3d42" stroke-width="3"/>
  </g>`;
}

// ---------- the LCD: seven segments, and the ghosts of the unlit ones ----------

//   a
// f   b
//   g
// e   c
//   d
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  t: 'defg', A: 'abcefg', P: 'abefg', E: 'adefg', '-': 'g', ' ': '',
};
const LIT = '#1b2217';
const GHOST = '#a3b092';

function digit(ch: string, x: number, y: number, h: number): string {
  const w = h * 0.52;
  const t = h * 0.12;
  const half = h / 2;
  const on = SEGMENTS[ch] ?? '';
  const seg = (name: string, sx: number, sy: number, sw: number, sh: number) =>
    `<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="${(t / 2.5).toFixed(1)}" fill="${on.includes(name) ? LIT : GHOST}"/>`;
  // leaning like the real thing: the skew pivots on the digit's own top-left corner
  return `<g transform="translate(${x} ${y}) skewX(-7)">${[
    seg('a', t * 0.6, 0, w - t * 1.2, t),
    seg('b', w - t, t * 0.6, t, half - t * 0.9),
    seg('c', w - t, half + t * 0.3, t, half - t * 0.9),
    seg('d', t * 0.6, h - t, w - t * 1.2, t),
    seg('e', 0, half + t * 0.3, t, half - t * 0.9),
    seg('f', 0, t * 0.6, t, half - t * 0.9),
    seg('g', t * 0.6, half - t / 2, w - t * 1.2, t),
  ].join('')}</g>`;
}

export interface LcdState {
  /** "FM", "AM", or "" (tape: the radio is off). */
  band: string;
  /** Four characters, e.g. " 979" (with the decimal point after the third) or "1010". */
  digits: string;
  point: boolean;
  unit: string;
  stereo: boolean;
  /** 0–4 bars of signal. */
  bars: number;
}

/** What's on the green display: the band on the left, four digits, and stereo, signal and unit on the right. */
export function lcdSvg(s: LcdState): string {
  const { x, y, w, h } = LCD;
  const dh = 52;
  const dy = y + 22;
  const dx = x + 50;
  const step = 36;
  let out = '';
  [...s.digits.padStart(4)].forEach((ch, i) => (out += digit(ch, dx + i * step, dy, dh)));
  const label = (text: string, lx: number, ly: number, lit: boolean, size = 13) =>
    `<text x="${lx}" y="${ly}" font-family="Anton, sans-serif" font-size="${size}" fill="${lit ? LIT : GHOST}" letter-spacing="1">${text}</text>`;
  // the decimal point, between the third and fourth digits, where the lean has carried their feet
  const lean = Math.tan((7 * Math.PI) / 180) * dh;
  out += `<rect x="${(dx + 3 * step - lean - 11).toFixed(1)}" y="${dy + dh - 6}" width="5" height="6" rx="1" fill="${s.point ? LIT : GHOST}"/>`;
  out += label('FM', x + 12, y + 34, s.band === 'FM');
  out += label('AM', x + 12, y + 56, s.band === 'AM');
  out += label('ST', x + w - 38, y + 22, s.stereo, 12);
  for (let i = 0; i < 4; i++) {
    const bh = 5 + i * 4;
    out += `<rect x="${x + w - 38 + i * 8}" y="${y + 56 - bh}" width="5" height="${bh}" fill="${i < s.bars ? LIT : GHOST}"/>`;
  }
  out += label(s.unit || 'MHz', x + w - 40, y + h - 10, !!s.unit, 11);
  return out;
}

export function grabadoraSvg(): string {
  const { x, y, w: bw, h: bh, r } = BODY;
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/><stop offset="0.35" stop-color="#2c2e31"/><stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
    <linearGradient id="g-panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d3d6d8"/><stop offset="1" stop-color="#9da2a6"/>
    </linearGradient>
    <linearGradient id="g-lcd-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9c6a6"/><stop offset="1" stop-color="#a7b595"/>
    </linearGradient>
    <linearGradient id="g-door-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3f46" stop-opacity="0.6"/><stop offset="0.5" stop-color="#15181c" stop-opacity="0.45"/><stop offset="1" stop-color="#3a3f46" stop-opacity="0.65"/>
    </linearGradient>
    <pattern id="g-mesh" width="9" height="9" patternUnits="userSpaceOnUse">
      <circle cx="4.5" cy="4.5" r="2.3" fill="#141517"/>
    </pattern>
    <radialGradient id="g-knob-grad" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#55585d"/><stop offset="1" stop-color="#1a1b1e"/>
    </radialGradient>
  </defs>

  <!-- the desk and the wall -->
  <rect x="0" y="0" width="1600" height="900" fill="#dcd3bf"/>
  <rect x="0" y="780" width="1600" height="120" fill="#9e6b47"/>
  <rect x="0" y="780" width="1600" height="8" fill="#b37d56"/>
  <ellipse cx="800" cy="790" rx="720" ry="22" fill="#000" opacity="0.25"/>

  <!-- the handle -->
  <path d="M470 236 C 480 150 540 132 610 132 H 990 C 1060 132 1120 150 1130 236" stroke="#1b1c1f" stroke-width="36" fill="none"/>
  <path d="M600 146 H 1000" stroke="#46494e" stroke-width="5" stroke-linecap="round"/>

  <!-- the volume knob, on top -->
  <g id="g-vol" class="grab">
    <rect x="${VOLUME.cx - VOLUME.r}" y="${VOLUME.cy - 18}" width="${VOLUME.r * 2}" height="40" rx="8" fill="#1d1e21"/>
    <g id="g-vol-rot" transform="translate(${VOLUME.cx} ${VOLUME.cy})">
      <circle r="${VOLUME.r}" fill="url(#g-knob-grad)"/>
      ${Array.from({ length: 24 }, (_, i) => `<rect x="-1.2" y="${-VOLUME.r}" width="2.4" height="6" fill="#0f1012" transform="rotate(${i * 15})"/>`).join('')}
      <rect x="-2.5" y="${-VOLUME.r + 5}" width="5" height="14" rx="2" fill="#d9d5ca"/>
    </g>
  </g>

  <!-- the body -->
  <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${r}" fill="url(#g-body)"/>
  <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${r}" fill="none" stroke="#0f1011" stroke-width="3"/>
  <path d="M${x + r * 0.6} ${y + 16} H ${x + bw - r * 0.6}" stroke="#55585d" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  <!-- the CD lid on top, closed -->
  <ellipse cx="800" cy="${y + 10}" rx="190" ry="16" fill="#34363a"/>
  <text x="800" y="${y + 40}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#8b8f95" letter-spacing="3">CD · PUSH OPEN</text>
  <text x="${VOLUME.cx}" y="${y + 40}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#8b8f95" letter-spacing="2">VOLUME</text>

  ${grille(GRILLE_L, 'l')}
  ${grille(GRILLE_R, 'r')}

  <!-- the silver panel: the display and the tuner -->
  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="60" fill="url(#g-panel)"/>
  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="60" fill="none" stroke="#6d7277" stroke-width="2"/>
  <rect x="${LCD.x - 8}" y="${LCD.y - 8}" width="${LCD.w + 16}" height="${LCD.h + 16}" rx="12" fill="#3b3e42"/>
  <rect id="g-lcd-bg" x="${LCD.x}" y="${LCD.y}" width="${LCD.w}" height="${LCD.h}" rx="6" fill="url(#g-lcd-grad)"/>
  <g id="g-lcd"></g>
  <rect x="${LCD.x}" y="${LCD.y}" width="${LCD.w}" height="22" rx="6" fill="#fff" opacity="0.12"/>
  <text x="800" y="${LCD.y + LCD.h + 22}" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#4a4e53" letter-spacing="2">DIGITAL SYNTHESIZED TUNER</text>
  ${[
    ['g-tune-down', TUNE_DOWN, 'M8 -9 L -2 0 L 8 9 Z M -2 -9 L -12 0 L -2 9 Z'],
    ['g-tune-up', TUNE_UP, 'M-8 -9 L 2 0 L -8 9 Z M 2 -9 L 12 0 L 2 9 Z'],
  ]
    .map(
      ([id, c, icon]) => `<g id="${id}" class="grab tune-button" transform="translate(${(c as typeof TUNE_UP).cx} ${(c as typeof TUNE_UP).cy})">
        <circle r="${(c as typeof TUNE_UP).r + 4}" fill="#7a7f84"/>
        <circle class="tune-cap" r="${(c as typeof TUNE_UP).r}" fill="#2c2e32"/>
        <path d="${icon}" fill="#d9d5ca"/>
      </g>`,
    )
    .join('')}
  <text x="${TUNE_DOWN.cx}" y="${TUNE_DOWN.cy + 46}" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#4a4e53" letter-spacing="1">TUNING</text>
  <text x="${TUNE_UP.cx}" y="${TUNE_UP.cy + 46}" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#4a4e53" letter-spacing="1">TUNING</text>

  <!-- function switch: the tape position turns the radio off -->
  <g id="g-func" class="grab">
    ${['TAPE', 'AM', 'FM'].map((l, i) => `<text x="${FUNC.positions[i]}" y="${FUNC.y + 27}" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#3d4044">${l}</text>`).join('')}
    <text x="${FUNC.x0 - 8}" y="${FUNC.y + 3}" text-anchor="end" font-family="Anton, sans-serif" font-size="8" fill="#4a4e53" letter-spacing="0.5">RADIO OFF</text>
    <rect x="${FUNC.x0}" y="${FUNC.y - 5}" width="${FUNC.x1 - FUNC.x0}" height="10" rx="5" fill="#26282b"/>
    <rect id="g-func-thumb" x="${FUNC.positions[2] - 14}" y="${FUNC.y - 13}" width="28" height="26" rx="4" fill="#2e3034" stroke="#8b9095" stroke-width="2"/>
    <rect x="${FUNC.x0 - 12}" y="${FUNC.y - 28}" width="${FUNC.x1 - FUNC.x0 + 24}" height="52" fill="transparent"/>
  </g>

  <!-- the tape keys -->
  <g id="g-keys">
    ${KEYS.map(
      (k, i) => `<g class="key grab" data-key="${k}" transform="translate(${keyX(i)} ${KEY_Y})">
        <rect class="key-shadow" x="0" y="50" width="56" height="10" fill="#0e0f11"/>
        <g class="key-cap"><rect width="56" height="54" rx="4" fill="${k === 'rec' ? '#3a2322' : '#2c2e32'}"/><rect width="56" height="7" rx="3" fill="#fff" opacity="0.1"/>${KEY_LABELS[k]}</g>
      </g>`,
    ).join('')}
  </g>

  <!-- the two decks: 1 plays, 2 records -->
  <rect x="${DECK1.x}" y="${DECK1.y}" width="${DECK1.w}" height="${DECK1.h}" rx="10" fill="#111214"/>
  <g id="g-door1" class="grab">
    <rect x="${DECK1.x}" y="${DECK1.y}" width="${DECK1.w}" height="${DECK1.h}" rx="10" fill="url(#g-door-grad)" stroke="#4a4e54" stroke-width="3"/>
    ${deckLabel(DECK1, '1', 'PLAY')}
    <text x="${DECK1.x + DECK1.w / 2}" y="${DECK1.y + DECK1.h - 12}" text-anchor="middle" font-family="Anton, sans-serif" font-size="8" fill="#80868c" letter-spacing="2">BASS REFLEX SPEAKER SYSTEM</text>
  </g>
  <rect x="${DECK.x}" y="${DECK.y}" width="${DECK.w}" height="${DECK.h}" rx="10" fill="#111214"/>
  <g id="g-slot"></g>
  <g id="g-door" class="grab">
    <rect x="${DECK.x}" y="${DECK.y}" width="${DECK.w}" height="${DECK.h}" rx="10" fill="url(#g-door-grad)" stroke="#4a4e54" stroke-width="3"/>
    ${deckLabel(DECK, '2', 'RECORD')}
    <text x="${DECK.x + DECK.w / 2}" y="${DECK.y + DECK.h - 12}" text-anchor="middle" font-family="Anton, sans-serif" font-size="8" fill="#80868c" letter-spacing="2">HIGH SPEED DUBBING</text>
  </g>

  <!-- the recording light and the counter -->
  <circle id="g-led-rec" cx="640" cy="${COUNTER.y + 14}" r="6" fill="#3a1410"/>
  <text x="652" y="${COUNTER.y + 18}" font-family="Anton, sans-serif" font-size="10" fill="#80868c">REC</text>
  <text x="${COUNTER.x - 62}" y="${COUNTER.y + 18}" font-family="Anton, sans-serif" font-size="10" fill="#80868c">COUNTER</text>
  <rect x="${COUNTER.x}" y="${COUNTER.y}" width="72" height="28" rx="3" fill="#0b0c0d"/>
  ${[0, 1, 2]
    .map(
      (i) => `<rect x="${COUNTER.x + 4 + i * 22}" y="${COUNTER.y + 3}" width="20" height="22" fill="#f0ece2"/>
  <text class="g-digit" x="${COUNTER.x + 14 + i * 22}" y="${COUNTER.y + 21}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="18" fill="#141414">0</text>`,
    )
    .join('')}
  <g id="g-reset" class="grab" transform="translate(${COUNTER.x + 90} ${COUNTER.y + 14})">
    <circle r="9" fill="#2e3034" stroke="#8b9095" stroke-width="1.5"/><circle r="3" fill="#6f7478"/>
  </g>
  <text x="${COUNTER.x + 104}" y="${COUNTER.y + 18}" font-family="Anton, sans-serif" font-size="8" fill="#80868c">RESET</text>

  <!-- cassettes on the desk -->
  <g id="g-desk"></g>
</svg>`;
}
