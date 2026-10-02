// The street across from the window: Teusaquillo brick houses with steep
// clay-tile roofs and front gardens, two painted houses, urapanes on the
// sidewalk, the panadería on the corner and the aguacate cart beside it.
// What moves (traffic, people, the reciclador) lives in sprites.ts.

import { P } from './palette';
import { windowRect } from './city';
import type { Rng } from '../util/rng';

// clay tile, darkened by the rain
const ROOF = '#5c3226';
const ROOF_ALT = '#6a3a2b';
const ROOF_LINE = '#3b1d15';
const ROOF_EDGE = '#80513f';
const ETERNIT = '#8d918d';
const PLASTER = { cream: '#ddd3bc', white: '#e4e1d8' };
const IRON = '#1e2321';
const FRAME_W = '#e8e3d6';
const LEAF = ['#33493a', '#3e5644', '#4b664f', '#5a7659'];

const GROUND = 720;
const SIDEWALK = 739;

// ---------- buildings ----------

function gableRoof(x0: number, x1: number, eave: number, peak: number, tone = ROOF, overhang = 14): string {
  const cx = (x0 + x1) / 2;
  const base = eave + 4;
  let s = `<path d="M${x0 - overhang} ${base}L${cx} ${peak}L${x1 + overhang} ${base}Z" fill="${tone}"/>`;
  const rows = Math.max(4, Math.round((base - peak) / 13));
  for (let i = 1; i <= rows; i++) {
    const yy = peak + ((base - peak) * i) / (rows + 1);
    const half = ((yy - peak) / (base - peak)) * ((x1 - x0) / 2 + overhang);
    s += `<path d="M${(cx - half).toFixed(1)} ${yy.toFixed(1)}H${(cx + half).toFixed(1)}" stroke="${ROOF_LINE}" stroke-width="2.2" opacity="0.5"/>`;
  }
  // the wet ridge catching the light, and the drip edge
  s += `<path d="M${x0 - overhang} ${base}L${cx} ${peak}L${x1 + overhang} ${base}" fill="none" stroke="${ROOF_EDGE}" stroke-width="3"/>`;
  s += `<path d="M${x0 - overhang} ${base}H${x1 + overhang}" stroke="#2c1711" stroke-width="3"/>`;
  return s;
}

/** A window with white wooden frames and small panes, the way Teusaquillo had them. */
function paned(rng: Rng, x: number, y: number, w: number, h: number): string {
  let s = windowRect(rng, { x, y, w, h });
  const cols = Math.max(2, Math.round(w / 16));
  const rows = Math.max(2, Math.round(h / 18));
  let bars = '';
  for (let i = 1; i < cols; i++) bars += `M${(x + (w * i) / cols).toFixed(1)} ${y}V${y + h}`;
  for (let i = 1; i < rows; i++) bars += `M${x} ${(y + (h * i) / rows).toFixed(1)}H${x + w}`;
  s += `<path d="${bars}" stroke="${FRAME_W}" stroke-width="1.6" opacity="0.85"/>`;
  s += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" fill="none" stroke="${FRAME_W}" stroke-width="3"/>`;
  return s;
}

function rejas(x: number, y: number, w: number, h: number): string {
  const n = Math.max(3, Math.round(w / 7));
  let d = `M${x} ${y}H${x + w}M${x} ${y + h}H${x + w}`;
  for (let i = 0; i <= n; i++) d += `M${(x + (w * i) / n).toFixed(1)} ${y}V${y + h}`;
  return `<path d="${d}" stroke="${IRON}" stroke-width="1.8"/>`;
}

function shrubs(rng: Rng, x: number, w: number, top: number): string {
  let s = '';
  for (let bx = x + 6; bx < x + w - 6; bx += 14 + rng() * 12) {
    const r = 9 + rng() * 9;
    s += `<circle cx="${bx.toFixed(1)}" cy="${(top + 10 - rng() * 6).toFixed(1)}" r="${r.toFixed(1)}" fill="${LEAF[Math.floor(rng() * 3)]}"/>`;
  }
  return s;
}

/** Front garden: a low brick wall with black bars on top, shrubs behind it. */
function antejardin(rng: Rng, x: number, w: number): string {
  return `${shrubs(rng, x, w, GROUND - 40)}
    <rect x="${x}" y="${GROUND - 22}" width="${w}" height="22" fill="${P.brickDark}"/>
    <rect x="${x}" y="${GROUND - 24}" width="${w}" height="4" fill="${P.concrete}"/>
    ${rejas(x + 2, GROUND - 52, w - 4, 28)}`;
}

interface HouseOpts {
  x: number;
  w: number;
  eave: number;
  /** A pattern url for brick, or a plaster color. */
  wall: string;
  roof?: string;
  gable: 'left' | 'right';
  garden?: boolean;
}

/** A Teusaquillo "casa inglesa": a steep main roof, a front gable over the bay window, a chimney. */
function casaInglesa(rng: Rng, o: HouseOpts, simple: boolean): string {
  const { x, w, eave } = o;
  const peak = eave - w * 0.36;
  let s = '';
  // chimney
  const chx = o.gable === 'left' ? x + w * 0.74 : x + w * 0.18;
  s += `<rect x="${chx}" y="${peak + 18}" width="20" height="${eave - peak}" fill="${P.brickDark}"/><rect x="${chx - 3}" y="${peak + 14}" width="26" height="7" fill="${P.concrete}"/>`;
  s += gableRoof(x, x + w, eave, peak, o.roof ?? ROOF);
  s += `<rect x="${x}" y="${eave}" width="${w}" height="${GROUND - eave}" fill="${o.wall}"/>`;
  // the front gable, its roof higher and steeper than the main one
  const gw = w * 0.46;
  const gx = o.gable === 'left' ? x + 4 : x + w - gw - 4;
  const gpeak = eave - gw * 0.62;
  s += `<path d="M${gx} ${eave + 26}L${gx + gw / 2} ${gpeak + 8}L${gx + gw} ${eave + 26}Z" fill="${o.wall}"/>`;
  s += gableRoof(gx, gx + gw, eave + 22, gpeak, o.roof === ROOF_ALT ? ROOF : ROOF_ALT, 10);
  // bay window under it, with its own little tile roof
  const bx = gx + gw * 0.14;
  const bw = gw * 0.72;
  s += `<rect x="${bx - 7}" y="${eave + 58}" width="${bw + 14}" height="86" fill="${P.brickDark}" opacity="0.55"/>`;
  s += paned(rng, bx, eave + 66, bw, 70);
  s += `<path d="M${bx - 12} ${eave + 60}L${bx - 2} ${eave + 48}H${bx + bw + 2}L${bx + bw + 12} ${eave + 60}Z" fill="${ROOF}"/>`;
  if (!simple) s += `<circle cx="${gx + gw / 2}" cy="${eave + 6}" r="10" fill="${P.glass}"/><circle cx="${gx + gw / 2}" cy="${eave + 6}" r="10" fill="none" stroke="${FRAME_W}" stroke-width="2.5"/>`;
  // the other side: an upstairs window, the door with its porch
  const ox = o.gable === 'left' ? x + w * 0.58 : x + w * 0.1;
  s += paned(rng, ox, eave + 30, w * 0.28, 52);
  const dx = o.gable === 'left' ? x + w * 0.64 : x + w * 0.16;
  s += `<rect x="${dx}" y="${GROUND - 92}" width="${w * 0.16}" height="92" fill="#3a271d"/>`;
  s += `<rect x="${dx + w * 0.04}" y="${GROUND - 82}" width="${w * 0.08}" height="22" fill="${P.glass}" opacity="0.7"/>`;
  s += `<path d="M${dx - 10} ${GROUND - 92}L${dx + w * 0.08} ${GROUND - 106}L${dx + w * 0.16 + 10} ${GROUND - 92}Z" fill="${ROOF}"/>`;
  // downstairs window with bars
  const wx = o.gable === 'left' ? bx : x + w * 0.42;
  s += paned(rng, wx, GROUND - 92, Math.min(bw, w * 0.3), 50);
  s += rejas(wx - 2, GROUND - 94, Math.min(bw, w * 0.3) + 4, 54);
  if (o.garden) s += antejardin(rng, x - 4, w + 8);
  return s;
}

/** A plastered house from the sixties: flat roof, long windows, a garage, a stone zócalo. */
function casaPintada(rng: Rng, x: number, w: number, top: number, color: string): string {
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${GROUND - top}" fill="${color}"/>`;
  s += `<rect x="${x - 6}" y="${top - 8}" width="${w + 12}" height="10" fill="${P.concrete}"/>`;
  // eternit lean-to on the roof terrace, and the water tank
  s += `<path d="M${x + w * 0.55} ${top - 8}V${top - 34}L${x + w - 10} ${top - 22}V${top - 8}Z" fill="${ETERNIT}"/>`;
  s += `<rect x="${x + 18}" y="${top - 36}" width="30" height="28" rx="4" fill="${P.eternit}"/>`;
  const floors = Math.round((GROUND - top - 70) / 92);
  for (let f = 0; f < floors; f++) {
    const y = top + 24 + f * 92;
    s += windowRect(rng, { x: x + 16, y, w: w * 0.5, h: 50 });
    s += windowRect(rng, { x: x + w * 0.62, y, w: w * 0.28, h: 50 });
    s += `<rect x="${x + 10}" y="${y + 56}" width="${w * 0.5 + 12}" height="5" fill="${P.concrete}"/>`;
    if (f === 0) s += rejas(x + 10, y + 26, w * 0.5 + 12, 30);
  }
  // garage door and the zócalo
  s += `<rect x="${x + 14}" y="${GROUND - 76}" width="${w * 0.48}" height="76" fill="#6d6a62"/>`;
  s += `<path d="${Array.from({ length: 9 }, (_, i) => `M${x + 14} ${GROUND - 70 + i * 8}H${x + 14 + w * 0.48}`).join('')}" stroke="#57544d" stroke-width="2"/>`;
  s += `<rect x="${x + w * 0.66}" y="${GROUND - 84}" width="${w * 0.2}" height="84" fill="#3a271d"/>`;
  s += `<rect x="${x}" y="${GROUND - 18}" width="${w}" height="18" fill="#7b776d"/>`;
  return s;
}

/** The panadería on the corner: a hand-painted sign, bread on the shelves, the glass counter, warm light. */
function panaderia(x: number, w: number): string {
  const h = 80;
  const y = GROUND - h;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2b2420"/>`;
  s += `<rect class="tienda-light" x="${x + 5}" y="${y + 14}" width="${w - 10}" height="${h - 14}" fill="#f1dfb4" opacity="0.6"/>`;
  // on the shelves: loaves, almojábanas, roscones
  for (let i = 0; i < 2; i++) {
    const sy = y + 32 + i * 16;
    s += `<rect x="${x + 10}" y="${sy}" width="${w - 20}" height="3" fill="#7a5a3a"/>`;
    for (let bx = x + 17, k = i; bx < x + w - 14; bx += 11, k++) {
      s +=
        k % 3 === 0
          ? `<ellipse cx="${bx}" cy="${sy - 4}" rx="5" ry="3.6" fill="#c98b45"/>`
          : k % 3 === 1
            ? `<circle cx="${bx}" cy="${sy - 4}" r="3.6" fill="#e0b46a"/>`
            : `<circle cx="${bx}" cy="${sy - 4.5}" r="3.8" fill="none" stroke="#b9773a" stroke-width="2.4"/>`;
    }
  }
  // the glass counter, with what's fresh
  s += `<rect x="${x + w * 0.1}" y="${GROUND - 30}" width="${w * 0.8}" height="30" fill="#6b4a2e"/>`;
  s += `<rect x="${x + w * 0.12}" y="${GROUND - 28}" width="${w * 0.76}" height="14" fill="#f6ead0" opacity="0.7"/>`;
  for (let bx = x + w * 0.17; bx < x + w * 0.85; bx += 9) s += `<ellipse cx="${bx.toFixed(1)}" cy="${GROUND - 19}" rx="3.5" ry="2.5" fill="#d79a52"/>`;
  // a cardboard sign in the window
  s += `<rect x="${x + w - 46}" y="${y + 15}" width="38" height="11" fill="#e8dcc0"/><text x="${x + w - 27}" y="${y + 23}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="6" fill="#7a2b1e">PAN CALIENTE</text>`;
  // the shutter rolled up, the awning, the sign painted by hand
  s += `<rect x="${x}" y="${y}" width="${w}" height="13" fill="#8a8c88"/><path d="M${x} ${y + 5}H${x + w}M${x} ${y + 9}H${x + w}" stroke="#6d706b" stroke-width="1.5"/>`;
  const n = Math.max(4, Math.round(w / 18));
  for (let i = 0; i < n; i++) s += `<path d="M${(x - 8 + ((w + 16) * i) / n).toFixed(1)} ${y - 2}h${((w + 16) / n).toFixed(1)}l-3 22h-${((w + 16) / n).toFixed(1)}z" fill="${i % 2 ? '#efe6cf' : '#b5652f'}"/>`;
  s += `<rect x="${x - 10}" y="${y - 36}" width="${w + 20}" height="30" fill="${P.paper}"/>`;
  s += `<text x="${x + w / 2}" y="${y - 15}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="16" fill="#8a3a22" letter-spacing="0.5">PANADERÍA LA ESPIGA</text>`;
  return s;
}

/** An urapán on the sidewalk: a dark, heavy crown, the kind that lines Teusaquillo. */
function tree(rng: Rng, x: number, h: number, r: number): string {
  let s = `<path d="M${x - 5} ${SIDEWALK}L${x - 3} ${SIDEWALK - h * 0.55}L${x - 18} ${SIDEWALK - h * 0.8}M${x - 3} ${SIDEWALK - h * 0.55}L${x + 4} ${SIDEWALK - h * 0.9}" stroke="#3b2e25" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += `<rect x="${x - 7}" y="${SIDEWALK - h * 0.55}" width="12" height="${h * 0.55}" fill="#3b2e25"/>`;
  const cy = SIDEWALK - h * 0.82;
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    const cr = r * (0.28 + rng() * 0.22);
    const shade = cy + Math.sin(a) * d * 0.7 > cy ? 0 : 1 + Math.floor(rng() * 3);
    s += `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d * 0.7).toFixed(1)}" r="${cr.toFixed(1)}" fill="${LEAF[shade]}"/>`;
  }
  return s;
}

/** The aguacate cart on the corner: a wheelbarrow of avocados under a sheet of plastic. */
function aguacates(x: number): string {
  const y = SIDEWALK;
  let s = `<g class="aguacates">`;
  // the vendor, behind the cart, in a cap and a plastic bag for a raincoat
  s += `<path d="M${x + 58} ${y}L${x + 60} ${y - 22}M${x + 68} ${y}L${x + 66} ${y - 22}" stroke="#23252a" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M${x + 52} ${y - 20}Q${x + 50} ${y - 44} ${x + 63} ${y - 46}Q${x + 76} ${y - 44} ${x + 74} ${y - 20}Z" fill="#5d6b4f"/>`;
  s += `<path d="M${x + 48} ${y - 16}L${x + 56} ${y - 50}H${x + 70}L${x + 78} ${y - 16}Z" fill="#dfe6ea" opacity="0.35"/>`;
  s += `<circle cx="${x + 63}" cy="${y - 51}" r="6" fill="#7d5139"/><path d="M${x + 56} ${y - 54}Q${x + 63} ${y - 62} ${x + 70} ${y - 54}H${x + 74}" fill="#a8322a" stroke="#a8322a" stroke-width="2"/>`;
  // the wheelbarrow
  s += `<circle cx="${x - 6}" cy="${y - 7}" r="7" fill="#26282b"/><circle cx="${x - 6}" cy="${y - 7}" r="2.5" fill="#8a8e91"/>`;
  s += `<path d="M${x - 10} ${y - 16}L${x - 2} ${y - 34}H${x + 46}L${x + 40} ${y - 16}Z" fill="#7c8286"/>`;
  s += `<path d="M${x + 40} ${y - 20}L${x + 58} ${y - 26}M${x + 26} ${y - 16}L${x + 30} ${y}" stroke="#4a4f53" stroke-width="3"/>`;
  // the pile of aguacates
  const spots = [[2, -38], [11, -40], [20, -41], [29, -40], [38, -38], [7, -46], [16, -48], [25, -48], [34, -45], [12, -54], [22, -55], [30, -52], [18, -61]];
  for (const [ax, ay] of spots) s += `<ellipse cx="${x + ax}" cy="${y + ay}" rx="5.5" ry="4.5" fill="#2f4a25"/><ellipse cx="${x + ax - 1.5}" cy="${y + ay - 1.5}" rx="1.8" ry="1.2" fill="#6b8a4a"/>`;
  // a sheet of plastic over two sticks, and the cardboard sign
  s += `<path d="M${x - 6} ${y - 30}V${y - 72}M${x + 44} ${y - 30}V${y - 70}" stroke="#6b5136" stroke-width="2.5"/>`;
  s += `<path d="M${x - 14} ${y - 64}Q${x + 19} ${y - 82} ${x + 52} ${y - 62}L${x + 46} ${y - 50}Q${x + 19} ${y - 64} ${x - 8} ${y - 52}Z" fill="#cfe0e8" opacity="0.45"/>`;
  s += `<rect x="${x + 2}" y="${y - 30}" width="34" height="12" fill="#c9a571"/><text x="${x + 19}" y="${y - 21}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="7.5" fill="#2b2622">AGUACATE</text>`;
  return s + `</g>`;
}

// ---------- the street ----------

/** The block across the street, drawn over the far roofs. */
export function streetFront(rng: Rng, brick: { b1: string; b2: string; b3: string }, simple: boolean): string {
  const u = (p: string) => `url(#${p})`;
  return (
    casaInglesa(rng, { x: -30, w: 300, eave: 470, wall: u(brick.b1), gable: 'right', garden: true }, simple) +
    casaPintada(rng, 288, 230, 452, PLASTER.cream) +
    casaInglesa(rng, { x: 540, w: 290, eave: 476, wall: u(brick.b2), gable: 'left', garden: true, roof: ROOF_ALT }, simple) +
    casaInglesa(rng, { x: 850, w: 270, eave: 466, wall: u(brick.b3), gable: 'right', garden: true }, simple) +
    casaInglesa(rng, { x: 1140, w: 300, eave: 480, wall: u(brick.b1), gable: 'left' }, simple) +
    panaderia(1176, 128) +
    casaPintada(rng, 1456, 190, 470, PLASTER.white) +
    tree(rng, 470, 250, 92) +
    tree(rng, 1010, 210, 72)
  );
}

/** What stays on the far sidewalk all afternoon: the aguacate cart on the corner. */
export function streetCorner(): string {
  return aguacates(1384);
}
