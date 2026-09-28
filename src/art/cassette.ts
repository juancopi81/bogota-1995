// A compact cassette, drawn from its real proportions (100 × 64 mm).

import type { CassetteData } from '../objects/tape';

export const CASSETTE_W = 240;
export const CASSETTE_H = 153;
export const HUB_L = { x: 70, y: 64 };
export const HUB_R = { x: 170, y: 64 };

function hub(cx: number, cy: number, cls: string): string {
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `<rect x="${-2}" y="${-11}" width="4" height="5" transform="rotate(${(a * 180) / Math.PI})" fill="#d9d4c7"/>`;
  }).join('');
  return `<g class="${cls}" transform="translate(${cx} ${cy})">
    <circle r="12" fill="#eeeae0"/><circle r="7.5" fill="#1b1b1d"/>${teeth}
  </g>`;
}

/** The cassette at the origin. Reels and tape packs have classes for animation. */
export function cassetteSvg(c: CassetteData, opts: { id?: string } = {}): string {
  const side = c.side;
  const label = c.label || '';
  const tabs = (s: 'A' | 'B', x: number) =>
    c.protected[s]
      ? `<rect x="${x}" y="1" width="12" height="7" fill="#111"/>`
      : `<rect x="${x}" y="1" width="12" height="7" fill="${c.color}" stroke="#000" stroke-opacity="0.3"/>`;
  return `<g class="cassette" ${opts.id ? `id="${opts.id}"` : ''} data-cassette="${c.id}">
    <rect width="${CASSETTE_W}" height="${CASSETTE_H}" rx="9" fill="${c.color}"/>
    <rect x="3" y="3" width="${CASSETTE_W - 6}" height="${CASSETTE_H - 6}" rx="7" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="2"/>
    ${tabs('A', 16)}${tabs('B', CASSETTE_W - 28)}
    <!-- tape packs behind the label, seen through the window -->
    <g class="packs">
      <circle class="pack-l" cx="${HUB_L.x}" cy="${HUB_L.y}" r="40" fill="#4a3526"/>
      <circle class="pack-r" cx="${HUB_R.x}" cy="${HUB_R.y}" r="28" fill="#4a3526"/>
    </g>
    <!-- the label, with holes for the hubs and the window -->
    <path fill-rule="evenodd" fill="#f1ece0" d="M14 12 H226 V100 H14 Z
      M${HUB_L.x + 14} ${HUB_L.y} a14 14 0 1 0 -28 0 a14 14 0 1 0 28 0 Z
      M${HUB_R.x + 14} ${HUB_R.y} a14 14 0 1 0 -28 0 a14 14 0 1 0 28 0 Z
      M92 52 H148 V78 H92 Z"/>
    <rect x="14" y="12" width="212" height="14" fill="#b8322a"/>
    <text x="22" y="23" font-family="Anton, sans-serif" font-size="11" fill="#fff" letter-spacing="1">${c.brand}</text>
    <text x="218" y="23" text-anchor="end" font-family="Anton, sans-serif" font-size="9" fill="#fff" opacity="0.85">60 MIN · NORMAL</text>
    <circle cx="29" cy="44" r="10" fill="none" stroke="#1c1c1c" stroke-width="1.5"/>
    <text class="side-letter" x="29" y="49" text-anchor="middle" font-family="Anton, sans-serif" font-size="13" fill="#1c1c1c">${side}</text>
    <path d="M44 92 H212" stroke="#9aa0a6" stroke-width="1" stroke-dasharray="2 3"/>
    <text class="label-text" x="48" y="90" font-family="Caveat, cursive" font-size="21" fill="#1d3f8f">${escapeXml(label)}</text>
    <rect x="92" y="52" width="56" height="26" fill="#9fb3bf" opacity="0.18"/>
    ${hub(HUB_L.x, HUB_L.y, 'hub-l')}${hub(HUB_R.x, HUB_R.y, 'hub-r')}
    <!-- the tape opening and the screws -->
    <path d="M52 ${CASSETTE_H} L64 118 H176 L188 ${CASSETTE_H} Z" fill="#000" opacity="0.35"/>
    <rect x="98" y="${CASSETTE_H - 10}" width="44" height="6" fill="#5a3f2b"/>
    ${[
      [10, 10],
      [CASSETTE_W - 10, 10],
      [10, CASSETTE_H - 10],
      [CASSETTE_W - 10, CASSETTE_H - 10],
      [CASSETTE_W / 2, 112],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#8d9196"/><path d="M${x - 2} ${y}h4" stroke="#444" stroke-width="1"/>`)
      .join('')}
  </g>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]!);
}
