// The phone up close, seen from above on the carpet, with the libreta open
// beside it.

import { P } from './palette';
import { LIBRETA, OWN_NUMBER, formatNumber } from '../content/phonebook';

export const DIAL = { cx: 520, cy: 585, r: 178, holeR: 25, holeAt: 131, stop: 50 };

/** Angle (degrees, SVG: 0 = east, clockwise) of the finger hole for a digit. */
export function holeAngle(digit: number): number {
  const d = digit === 0 ? 10 : digit;
  return DIAL.stop - (d + 1) * 30;
}

export const HANDSET = { x: 190, y: 190 };

export function phoneSvg(): string {
  const holes = Array.from({ length: 10 }, (_, i) => {
    const digit = (i + 1) % 10;
    const a = (holeAngle(digit) * Math.PI) / 180;
    return { digit, x: DIAL.cx + Math.cos(a) * DIAL.holeAt, y: DIAL.cy + Math.sin(a) * DIAL.holeAt };
  });
  const stopA = ((DIAL.stop + 2) * Math.PI) / 180;
  const letters: Record<number, string> = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PRS', 8: 'TUV', 9: 'WXY' };
  const libretaX = 880;
  const entry = (e: (typeof LIBRETA)[number], i: number) => {
    const x = i < 3 ? libretaX + 34 : libretaX + 340;
    // a crossed-out entry takes an extra line for the note under it
    const before = LIBRETA.slice(i < 3 ? 0 : 3, i).filter((p) => p.crossed).length;
    const yy = 250 + (i < 3 ? i : i - 3) * 74 + before * 37;
    const num = formatNumber(e.number);
    return `<g class="entry">
      <text x="${x}" y="${yy}" font-family="Caveat, cursive" font-size="34" fill="${P.pencil}">${e.name}</text>
      <text x="${x + 10}" y="${yy + 34}" font-family="Caveat, cursive" font-size="32" fill="${P.pencil}" letter-spacing="1">${num}</text>
      ${e.heart ? `<path d="M${x + 150} ${yy - 14} c -6 -10 -18 -4 -12 6 l 12 12 l 12 -12 c 6 -10 -6 -16 -12 -6z" fill="none" stroke="#c9423a" stroke-width="2.5"/>` : ''}
      ${e.crossed ? `<path d="M${x + 4} ${yy + 24} L${x + 170} ${yy + 22}" stroke="${P.pencil}" stroke-width="2.5"/><text x="${x + 20}" y="${yy + 60}" font-family="Caveat, cursive" font-size="24" fill="#6b6f80">(${e.crossed})</text>` : ''}
    </g>`;
  };

  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ph-carpet" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="5" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.4 0" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="in" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
    </filter>
    <radialGradient id="ph-body" cx="0.45" cy="0.3" r="0.85">
      <stop offset="0" stop-color="#efe5cc"/><stop offset="1" stop-color="#cdbf9d"/>
    </radialGradient>
    <radialGradient id="ph-plate" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.6" stop-color="#e8dcc0"/><stop offset="1" stop-color="#cfc2a2"/>
    </radialGradient>
    <linearGradient id="ph-page" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#efe8d6"/><stop offset="0.93" stop-color="#e9e1cc"/><stop offset="1" stop-color="#cfc6ae"/>
    </linearGradient>
    <linearGradient id="ph-page-r" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#efe8d6"/><stop offset="0.93" stop-color="#e9e1cc"/><stop offset="1" stop-color="#cfc6ae"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="${P.carpet}" filter="url(#ph-carpet)"/>
  <path d="M1480 0 C 1400 120 1500 180 1380 260 C 1300 310 1180 300 1080 330" stroke="#2c2620" stroke-width="5" fill="none" opacity="0.8"/>

  <!-- the phone -->
  <ellipse cx="530" cy="810" rx="330" ry="40" fill="#000" opacity="0.25"/>
  <path d="M300 300 Q 310 262 350 262 H 710 Q 750 262 760 300 L 840 760 Q 846 800 806 800 H 254 Q 214 800 220 760 Z" fill="url(#ph-body)"/>
  <path d="M300 300 Q 310 262 350 262 H 710 Q 750 262 760 300" stroke="#fff" stroke-opacity="0.35" stroke-width="4" fill="none"/>
  <path d="M220 760 Q 214 800 254 800 H 806 Q 846 800 840 760" stroke="#9c8e6c" stroke-width="6" fill="none"/>

  <!-- the dial: numbers on the plate, the finger wheel over it -->
  <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.r + 16}" fill="#b3a585"/>
  <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.r + 10}" fill="url(#ph-plate)"/>
  ${holes
    .map((h) => {
      const l = letters[h.digit];
      return `<text x="${h.x}" y="${h.y + (l ? 2 : 9)}" text-anchor="middle" font-family="Anton, sans-serif" font-size="24" fill="#2b2f3a">${h.digit}</text>${l ? `<text x="${h.x}" y="${h.y + 17}" text-anchor="middle" font-family="Anton, sans-serif" font-size="9" fill="#6a6152">${l}</text>` : ''}`;
    })
    .join('')}
  <g id="ph-wheel">
    <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.r}" fill="#e9e0c9" fill-opacity="0.35" stroke="#b9ab8b" stroke-width="3"/>
    <path fill-rule="evenodd" fill="#e3d7bb" d="M${DIAL.cx + DIAL.r} ${DIAL.cy} a${DIAL.r} ${DIAL.r} 0 1 0 ${-2 * DIAL.r} 0 a${DIAL.r} ${DIAL.r} 0 1 0 ${2 * DIAL.r} 0 Z
      ${holes.map((h) => `M${h.x + DIAL.holeR} ${h.y} a${DIAL.holeR} ${DIAL.holeR} 0 1 0 ${-2 * DIAL.holeR} 0 a${DIAL.holeR} ${DIAL.holeR} 0 1 0 ${2 * DIAL.holeR} 0 Z`).join(' ')}
      M${DIAL.cx + 64} ${DIAL.cy} a64 64 0 1 0 -128 0 a64 64 0 1 0 128 0 Z"/>
    ${holes.map((h) => `<circle class="hole" data-digit="${h.digit}" cx="${h.x}" cy="${h.y}" r="${DIAL.holeR}" fill="#000" fill-opacity="0.001" stroke="#a89a7a" stroke-width="2"/>`).join('')}
    <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.r}" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="2"/>
  </g>
  <!-- the number card in the middle -->
  <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="62" fill="#f6f1e4" stroke="#b9ab8b" stroke-width="2"/>
  <text x="${DIAL.cx}" y="${DIAL.cy - 12}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="12" fill="#6a6152">TEL.</text>
  <text x="${DIAL.cx}" y="${DIAL.cy + 18}" text-anchor="middle" font-family="Caveat, cursive" font-size="26" fill="${P.pencil}">${formatNumber(OWN_NUMBER)}</text>
  <!-- the finger stop -->
  <path d="M${DIAL.cx + Math.cos(stopA) * (DIAL.r - 36)} ${DIAL.cy + Math.sin(stopA) * (DIAL.r - 36)} L ${DIAL.cx + Math.cos(stopA) * (DIAL.r + 18)} ${DIAL.cy + Math.sin(stopA) * (DIAL.r + 18)}" stroke="#8d9296" stroke-width="9" stroke-linecap="round"/>

  <!-- the hook switch plungers (pop up when the handset is lifted) -->
  <g id="ph-hooks" class="grab">
    <rect class="plunger" x="360" y="276" width="44" height="22" rx="6" fill="#bdae8b"/>
    <rect class="plunger" x="656" y="276" width="44" height="22" rx="6" fill="#bdae8b"/>
  </g>

  <!-- coiled cord from the handset to the base -->
  <path id="ph-cord" d="" stroke="#d8ccb0" stroke-width="7" fill="none" stroke-linecap="round"/>

  <!-- the handset -->
  <g id="ph-handset" class="grab">
    <g id="ph-handset-body">
      <ellipse cx="0" cy="36" rx="330" ry="26" fill="#000" opacity="0.2"/>
      <path d="M-250 -20 Q -200 -46 -120 -36 H 120 Q 200 -46 250 -20 L 262 24 Q 200 40 120 20 H -120 Q -200 40 -262 24 Z" fill="#ece2c9"/>
      <circle cx="-236" cy="4" r="64" fill="#e9dec3"/>
      <circle cx="236" cy="4" r="64" fill="#e9dec3"/>
      <circle cx="-236" cy="4" r="44" fill="#ddd0b1"/>
      <circle cx="236" cy="4" r="44" fill="#ddd0b1"/>
      ${Array.from({ length: 7 }, (_, i) => `<circle cx="${-236 + Math.cos((i * 2 * Math.PI) / 7) * 18}" cy="${4 + Math.sin((i * 2 * Math.PI) / 7) * 18}" r="3.5" fill="#9c8e6c"/>`).join('')}
      <circle cx="-236" cy="4" r="4" fill="#9c8e6c"/>
      ${Array.from({ length: 5 }, (_, i) => `<path d="M${214 + i * 10} -14 v36" stroke="#9c8e6c" stroke-width="3" stroke-linecap="round"/>`).join('')}
      <path d="M-120 -30 H 120" stroke="#fff" stroke-opacity="0.5" stroke-width="5" stroke-linecap="round"/>
    </g>
  </g>

  <!-- the libreta, open -->
  <g id="ph-libreta">
    <rect x="${libretaX - 14}" y="104" width="652" height="720" rx="8" fill="#5e241f"/>
    <rect x="${libretaX}" y="114" width="306" height="700" fill="url(#ph-page)"/>
    <rect x="${libretaX + 318}" y="114" width="306" height="700" fill="url(#ph-page-r)"/>
    <path d="M${libretaX + 312} 114 V 814" stroke="#b9ae93" stroke-width="3"/>
    ${Array.from({ length: 18 }, (_, i) => `<path d="M${libretaX + 10} ${196 + i * 37} H ${libretaX + 300} M${libretaX + 324} ${196 + i * 37} H ${libretaX + 614}" stroke="#a9c1d6" stroke-width="1"/>`).join('')}
    <path d="M${libretaX + 44} 118 V 810 M${libretaX + 354} 118 V 810" stroke="#e0a39c" stroke-width="1.2"/>
    ${'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
      .split('')
      .map((ch, i) => `<rect x="${libretaX + 624}" y="${120 + i * 25.5}" width="22" height="24" fill="${i % 2 ? '#e8dfc8' : '#ddd3b8'}"/><text x="${libretaX + 635}" y="${138 + i * 25.5}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="#5e241f">${ch}</text>`)
      .join('')}
    <text x="${libretaX + 150}" y="160" text-anchor="middle" font-family="'Special Elite', monospace" font-size="22" fill="#5e241f">TELÉFONOS</text>
    <text x="${libretaX + 470}" y="160" text-anchor="middle" font-family="'Special Elite', monospace" font-size="15" fill="#6b6f80">Pertenece a:</text>
    ${LIBRETA.map(entry).join('')}
    <text x="${libretaX + 340}" y="612" font-family="'Special Elite', monospace" font-size="15" fill="#6b6f80">Apuntes:</text>
  </g>
</svg>`;
}

/** Positions of the text boxes laid over the libreta (name, notes). */
export const LIBRETA_INPUTS = {
  name: { x: 1240, y: 172, w: 240, h: 44 },
  notes: { x: 1220, y: 622, w: 270, h: 150 },
};
