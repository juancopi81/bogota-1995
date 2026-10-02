// The street across from the window, drawn three ways to choose from (round 6
// mockups): A, a quiet Teusaquillo street of brick houses; B, a busy Chapinero
// street with shops; C, today's mix of houses and apartment blocks, with the
// fixes both share. What they all fix: roofs that read as clay tile, not
// brick; facades that aren't all the same brick; trees, people under
// umbrellas, the aguacate cart on the corner, the reciclador and his cart, and
// more cars, taxis and busetas.

import { P } from './palette';
import { windowRect } from './city';
import type { Rng } from '../util/rng';

export type Barrio = 'a' | 'b' | 'c';

// clay tile, darkened by the rain
const ROOF = '#5c3226';
const ROOF_ALT = '#6a3a2b';
const ROOF_LINE = '#3b1d15';
const ROOF_EDGE = '#80513f';
const ETERNIT = '#8d918d';
const PLASTER = { cream: '#ddd3bc', white: '#e4e1d8', mint: '#9db5a1', ochre: '#c6a463', blue: '#9fb3c0' };
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

/** A shopfront: a hand-painted sign, an awning, the lit inside, the shutter half up. */
function shop(x: number, w: number, sign: string, opts: { sign?: string; ink?: string; awning?: [string, string]; h?: number } = {}): string {
  const h = opts.h ?? 76;
  const y = GROUND - h;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2b2622"/>`;
  s += `<rect class="tienda-light" x="${x + 5}" y="${y + 14}" width="${w - 10}" height="${h - 14}" fill="#e3ecd6" opacity="0.55"/>`;
  // shelves and the counter
  for (let i = 0; i < 2; i++) {
    const sy = y + 26 + i * 18;
    s += `<rect x="${x + 10}" y="${sy}" width="${w - 20}" height="3" fill="#7a5a3a"/>`;
    for (let bx = x + 14; bx < x + w - 14; bx += 7) s += `<rect x="${bx}" y="${sy - 9}" width="4" height="9" fill="${['#b33a2e', '#3d6e8c', '#d9a531', '#e8e4da', '#4b7a43'][(bx + i) % 5]}" opacity="0.8"/>`;
  }
  s += `<rect x="${x + w * 0.1}" y="${GROUND - 26}" width="${w * 0.8}" height="26" fill="#6b4a2e"/>`;
  // the metal shutter, rolled half up
  s += `<rect x="${x}" y="${y}" width="${w}" height="14" fill="#8a8c88"/><path d="M${x} ${y + 5}H${x + w}M${x} ${y + 10}H${x + w}" stroke="#6d706b" stroke-width="1.5"/>`;
  // awning
  if (opts.awning) {
    const [a, b] = opts.awning;
    const n = Math.max(4, Math.round(w / 18));
    let stripes = '';
    for (let i = 0; i < n; i++) stripes += `<path d="M${x - 8 + ((w + 16) * i) / n} ${y - 2}h${(w + 16) / n}l-3 22h-${(w + 16) / n}z" fill="${i % 2 ? b : a}"/>`;
    s += stripes;
  }
  // the sign, painted by hand
  s += `<rect x="${x - 6}" y="${y - 34}" width="${w + 12}" height="28" fill="${opts.sign ?? P.paper}"/>`;
  const size = Math.min(19, ((w + 4) / Math.max(1, sign.length)) * 1.75);
  s += `<text x="${x + w / 2}" y="${y - 13}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="${size.toFixed(1)}" fill="${opts.ink ?? '#b03026'}" letter-spacing="0.5">${sign}</text>`;
  return s;
}

/** A three- or four-storey brick building with iron balconies, shops downstairs. */
function edificio(rng: Rng, x: number, w: number, top: number, wall: string, shops: string): string {
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${GROUND - top}" fill="${wall}"/>`;
  s += `<rect x="${x - 5}" y="${top - 9}" width="${w + 10}" height="11" fill="${P.concrete}"/>`;
  s += `<rect x="${x + w - 60}" y="${top - 40}" width="34" height="31" rx="4" fill="${P.eternit}"/>`;
  s += `<path d="M${x + 30} ${top - 9}V${top - 62}M${x + 16} ${top - 54}H${x + 44}M${x + 20} ${top - 44}H${x + 40}" stroke="#2c3033" stroke-width="2" fill="none"/>`;
  const floors = Math.floor((GROUND - 96 - top) / 82);
  const cols = Math.max(2, Math.round(w / 92));
  const gap = w / cols;
  for (let f = 0; f < floors; f++) {
    const y = top + 22 + f * 82;
    for (let c = 0; c < cols; c++) {
      const wx = x + c * gap + gap * 0.18;
      const ww = gap * 0.64;
      s += windowRect(rng, { x: wx, y, w: ww, h: 54 });
      // a balcony on some windows: slab and iron railing
      if ((f + c) % 2 === 0) {
        s += `<rect x="${wx - 8}" y="${y + 54}" width="${ww + 16}" height="6" fill="${P.concrete}"/>`;
        s += rejas(wx - 6, y + 30, ww + 12, 24);
      } else {
        s += `<rect x="${wx - 4}" y="${y + 56}" width="${ww + 8}" height="4" fill="${P.concrete}" opacity="0.7"/>`;
      }
    }
    s += `<rect x="${x}" y="${y + 66}" width="${w}" height="4" fill="${P.concrete}" opacity="0.45"/>`;
  }
  return s + shops;
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

// ---------- people ----------

interface Walker {
  x: number;
  /** Feet. */
  y?: number;
  coat: string;
  umbrella?: string | null;
  dir?: 1 | -1;
  /** Holding a newspaper over the head instead. */
  paper?: boolean;
}

function person(p: Walker): string {
  const y = p.y ?? SIDEWALK;
  const d = p.dir ?? 1;
  const f = (n: number) => (p.x + n * d).toFixed(1);
  let s = `<g class="person">`;
  s += `<path d="M${f(-5)} ${y}L${f(-3)} ${y - 20}M${f(5)} ${y}L${f(3)} ${y - 20}" stroke="#23252a" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M${f(-9)} ${y - 18}Q${f(-10)} ${y - 40} ${f(0)} ${y - 42}Q${f(10)} ${y - 40} ${f(9)} ${y - 18}Z" fill="${p.coat}"/>`;
  s += `<circle cx="${f(1)}" cy="${y - 47}" r="6" fill="#8a5d43"/>`;
  if (p.paper) {
    s += `<path d="M${f(-12)} ${y - 54}L${f(14)} ${y - 58}L${f(13)} ${y - 52}L${f(-11)} ${y - 48}Z" fill="#e8e4da"/><path d="M${f(-8)} ${y - 52}H${f(9)}" stroke="#8a8a84" stroke-width="1"/>`;
    s += `<path d="M${f(-7)} ${y - 36}L${f(-10)} ${y - 50}M${f(7)} ${y - 36}L${f(11)} ${y - 54}" stroke="${p.coat}" stroke-width="4"/>`;
  } else if (p.umbrella) {
    s += `<path d="M${f(6)} ${y - 30}L${f(6)} ${y - 64}" stroke="#222" stroke-width="2"/>`;
    s += `<path d="M${f(-16)} ${y - 60}Q${f(6)} ${y - 86} ${f(28)} ${y - 60}Q${f(22)} ${y - 63} ${f(17)} ${y - 60}Q${f(11)} ${y - 63} ${f(6)} ${y - 60}Q${f(0)} ${y - 63} ${f(-5)} ${y - 60}Q${f(-11)} ${y - 63} ${f(-16)} ${y - 60}Z" fill="${p.umbrella}"/>`;
  }
  return s + `</g>`;
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

/** The reciclador pushing his cart: flattened cardboard and a sack of bottles. */
function reciclador(x: number, dir: 1 | -1 = -1): string {
  const y = SIDEWALK;
  const f = (n: number) => (x + n * dir).toFixed(1);
  let s = `<g class="reciclador">`;
  // the cart, ahead of him
  s += `<circle cx="${f(-58)}" cy="${y - 9}" r="9" fill="#26282b"/><circle cx="${f(-58)}" cy="${y - 9}" r="3" fill="#7b7f83"/>`;
  s += `<path d="M${f(-104)} ${y - 18}H${f(-14)}" stroke="#6b5136" stroke-width="6"/>`;
  s += `<path d="M${f(-14)} ${y - 18}L${f(4)} ${y - 32}" stroke="#6b5136" stroke-width="4"/>`;
  s += `<path d="M${f(-102)} ${y - 21}V${y - 44}M${f(-18)} ${y - 21}V${y - 44}" stroke="#6b5136" stroke-width="3"/>`;
  // cardboard, folded flat and tied
  s += `<rect x="${Math.min(+f(-100), +f(-56))}" y="${y - 50}" width="44" height="29" fill="#b48a5a"/>`;
  s += `<path d="M${f(-100)} ${y - 40}H${f(-56)}M${f(-100)} ${y - 31}H${f(-56)}" stroke="#94704a" stroke-width="2"/>`;
  // the sack of bottles
  s += `<path d="M${f(-58)} ${y - 21}Q${f(-62)} ${y - 58} ${f(-40)} ${y - 62}Q${f(-18)} ${y - 58} ${f(-20)} ${y - 21}Z" fill="#e2ddd0"/>`;
  s += `<path d="M${f(-46)} ${y - 62}l2 -10M${f(-38)} ${y - 62}l-1 -12M${f(-31)} ${y - 60}l3 -8" stroke="#5d8a6a" stroke-width="4" stroke-linecap="round"/>`;
  // him, leaning into the handles
  s += `<path d="M${f(14)} ${y}L${f(12)} ${y - 22}M${f(24)} ${y}L${f(18)} ${y - 22}" stroke="#2e2a26" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M${f(6)} ${y - 20}Q${f(4)} ${y - 42} ${f(14)} ${y - 46}Q${f(26)} ${y - 44} ${f(24)} ${y - 20}Z" fill="#5a4a3c"/>`;
  s += `<path d="M${f(8)} ${y - 36}L${f(2)} ${y - 32}" stroke="#5a4a3c" stroke-width="5" stroke-linecap="round"/>`;
  s += `<circle cx="${f(10)}" cy="${y - 50}" r="6" fill="#6e4a35"/><path d="M${f(4)} ${y - 53}Q${f(10)} ${y - 60} ${f(16)} ${y - 53}" fill="#2f3a4a" stroke="#2f3a4a" stroke-width="2"/>`;
  return s + `</g>`;
}

/** A chaza: the little kiosk of sweets and cigarettes on the sidewalk. */
function chaza(x: number): string {
  const y = SIDEWALK;
  return `<g class="chaza">
    <rect x="${x}" y="${y - 44}" width="40" height="44" fill="#d9a531"/>
    <rect x="${x + 3}" y="${y - 40}" width="34" height="18" fill="#efe6cf" opacity="0.8"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${x + 6 + i * 8}" y="${y - 36}" width="5" height="10" fill="${['#b33a2e', '#3d6e8c', '#e8e4da', '#4b7a43'][i]}"/>`).join('')}
    <path d="M${x - 6} ${y - 48}H${x + 46}L${x + 40} ${y - 58}H${x}Z" fill="#c8302a"/>
    <path d="M${x + 4} ${y}V${y - 6}M${x + 36} ${y}V${y - 6}" stroke="#26282b" stroke-width="3"/>
  </g>`;
}

// ---------- vehicles, parked or stopped ----------

function wheel(cx: number, cy: number, r: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1d1f21"/><circle cx="${cx}" cy="${cy}" r="${r * 0.42}" fill="#8a8e92"/>`;
}

/** A Renault 4: the box with a hatch that half the country drove. */
function renault4(x: number, y: number, color: string, dir: 1 | -1 = 1): string {
  const t = dir === 1 ? `translate(${x} ${y})` : `translate(${x + 124} ${y}) scale(-1 1)`;
  return `<g class="car r4" transform="${t}">
    <path d="M4 -14V-36Q4 -42 10 -43L16 -44L28 -64Q30 -67 36 -67H92Q98 -67 100 -62L106 -46L118 -44Q124 -43 124 -36V-14Z" fill="${color}"/>
    <path d="M32 -60L22 -46H56V-60Z M62 -60V-46H98L93 -60Z" fill="#39434a"/>
    <path d="M6 -30H122" stroke="#000" stroke-opacity="0.15" stroke-width="2"/>
    <rect x="118" y="-30" width="6" height="5" fill="#ffd27a"/><rect x="2" y="-30" width="5" height="6" fill="#b3261e"/>
    ${wheel(28, -12, 11)}${wheel(100, -12, 11)}
  </g>`;
}

function sprint(x: number, y: number, color: string, dir: 1 | -1 = 1): string {
  const t = dir === 1 ? `translate(${x} ${y})` : `translate(${x + 114} ${y}) scale(-1 1)`;
  return `<g class="car sprint" transform="${t}">
    <path d="M4 -14Q2 -38 16 -42L34 -60Q38 -63 46 -63H74Q84 -63 90 -54L98 -42Q112 -40 112 -28V-14Z" fill="${color}"/>
    <path d="M38 -57L26 -43H58V-57Z M64 -57V-43H92L84 -57Z" fill="#39434a"/>
    <rect x="106" y="-30" width="6" height="5" fill="#ffd27a"/><rect x="3" y="-30" width="5" height="6" fill="#b3261e"/>
    ${wheel(26, -12, 10)}${wheel(90, -12, 10)}
  </g>`;
}

function taxi(x: number, y: number, dir: 1 | -1 = 1): string {
  const t = dir === 1 ? `translate(${x} ${y})` : `translate(${x + 130} ${y}) scale(-1 1)`;
  return `<g class="car taxi" transform="${t}">
    <path d="M6 -14Q4 -34 22 -36L40 -54Q46 -60 58 -60H88Q98 -60 104 -52L116 -36Q126 -34 126 -14Z" fill="#e9c21c"/>
    <path d="M46 -52H64V-38H34Z M70 -52H92L104 -38H70Z" fill="#39434a"/>
    <rect x="58" y="-66" width="20" height="7" fill="#f4e7a1"/>
    <path d="M8 -26H124" stroke="#222" stroke-width="3" stroke-dasharray="6 6"/>
    <rect x="120" y="-28" width="5" height="5" fill="#ffd27a"/>
    ${wheel(32, -12, 11)}${wheel(100, -12, 11)}
  </g>`;
}

/** A buseta pulled over with its door open, someone climbing in. */
function busetaStopped(x: number, y: number, route: [string, string], dir: 1 | -1 = 1): string {
  const t = dir === 1 ? `translate(${x} ${y})` : `translate(${x + 230} ${y}) scale(-1 1)`;
  const unflip = dir === 1 ? '' : ` transform="translate(409 0) scale(-1 1)"`;
  return `<g class="buseta" transform="${t}">
    <rect x="4" y="-78" width="222" height="70" rx="10" fill="#f0ece1"/>
    <path d="M196 -44H216Q226 -44 226 -34V-14Q226 -8 220 -8H196Z" fill="#d4552b"/>
    <rect x="4" y="-42" width="200" height="13" fill="#c9982f"/>
    <rect x="4" y="-27" width="222" height="2.5" fill="#b3321f"/>
    ${[20, 62, 104].map((wx) => `<rect x="${wx}" y="-70" width="34" height="24" rx="3" fill="#39434a"/>`).join('')}
    <rect x="148" y="-70" width="34" height="62" fill="#22282c"/>
    <path d="M188 -70H214Q222 -70 222 -58V-46H188Z" fill="#48545c"/>
    <rect x="189" y="-68" width="31" height="13" fill="#f3efe2"/>
    <g${unflip}><text x="204.5" y="-62.4" font-size="4.4" text-anchor="middle" font-family="Anton, sans-serif" fill="#b3261e">${route[0]}</text>
    <text x="204.5" y="-57" font-size="3.8" text-anchor="middle" font-family="Anton, sans-serif" fill="#1f3f7a">${route[1]}</text></g>
    <rect x="200" y="-10" width="30" height="6" fill="#2a2a2a"/>
    ${wheel(46, -8, 14)}${wheel(182, -8, 14)}
    <rect x="224" y="-22" width="6" height="6" fill="#ffd27a"/>
  </g>`;
}

// ---------- the three streets ----------

export interface BarrioArt {
  /** The buildings across the street, drawn over the far roofs. */
  front: string;
  /** People, vendors and stopped vehicles, drawn over the street. */
  street: string;
}

export function barrio(which: Barrio, rng: Rng, brick: { b1: string; b2: string; b3: string }, simple: boolean): BarrioArt {
  const u = (p: string) => `url(#${p})`;
  if (which === 'a') {
    // a quiet Teusaquillo street: brick houses with front gardens, one painted, a big urapán
    const front =
      casaInglesa(rng, { x: -30, w: 300, eave: 470, wall: u(brick.b1), gable: 'right', garden: true }, simple) +
      casaPintada(rng, 288, 230, 452, PLASTER.cream) +
      casaInglesa(rng, { x: 540, w: 290, eave: 476, wall: u(brick.b2), gable: 'left', garden: true, roof: ROOF_ALT }, simple) +
      casaInglesa(rng, { x: 850, w: 270, eave: 466, wall: u(brick.b3), gable: 'right', garden: true }, simple) +
      casaInglesa(rng, { x: 1140, w: 300, eave: 480, wall: u(brick.b1), gable: 'left' }, simple) +
      shop(1176, 128, 'TIENDA LA ESPERANZA', { awning: ['#2f6d4f', '#e8e4da'] }) +
      casaPintada(rng, 1456, 190, 470, PLASTER.white) +
      tree(rng, 470, 250, 92) +
      tree(rng, 1010, 210, 72);
    const street =
      renault4(330, 768, '#d7d3c4', -1) +
      person({ x: 690, coat: '#3a4d6b', umbrella: '#1d1e21', dir: -1 }) +
      reciclador(1040, -1) +
      person({ x: 1250, coat: '#7a2b2b', umbrella: '#a8322a', dir: 1 }) +
      aguacates(1380) +
      taxi(860, 842, 1);
    return { front, street };
  }
  if (which === 'b') {
    // a busy Chapinero street: walk-ups with shops, a buseta picking people up, traffic behind it
    const front =
      edificio(rng, -20, 300, 360, u(brick.b3), shop(-4, 130, 'DROGUERÍA EL SOL', { sign: '#2f6d4f', ink: '#f2ede0' }) + shop(142, 130, 'CIGARRERÍA', { awning: ['#c8302a', '#efe6cf'] })) +
      edificio(rng, 296, 260, 410, PLASTER.cream, shop(312, 230, 'PANADERÍA LA ESPIGA', { awning: ['#d9a531', '#efe6cf'], ink: '#7a3d2c' })) +
      casaInglesa(rng, { x: 580, w: 260, eave: 480, wall: u(brick.b1), gable: 'right' }, simple) +
      edificio(rng, 860, 300, 340, u(brick.b2), shop(876, 128, 'MISCELÁNEA', { sign: '#3d6e8c', ink: '#f2ede0' }) + shop(1020, 124, 'TIENDA', { awning: ['#2f6d4f', '#e8e4da'] })) +
      edificio(rng, 1180, 240, 400, PLASTER.ochre, shop(1196, 208, 'FRUTERÍA', { awning: ['#4b7a43', '#efe6cf'] })) +
      edificio(rng, 1440, 200, 330, u(brick.b1), shop(1452, 170, 'ALMACÉN', { sign: '#7a2b2b', ink: '#f2ede0' })) +
      tree(rng, 560, 200, 66);
    const street =
      chaza(560) +
      person({ x: 318, coat: '#2f3a4a', umbrella: '#1d1e21' }) +
      person({ x: 352, coat: '#6b4a5a', umbrella: '#3d6e8c', dir: -1 }) +
      person({ x: 700, coat: '#4a4a4a', paper: true, dir: -1 }) +
      reciclador(1000, 1) +
      person({ x: 1150, coat: '#7a2b2b', umbrella: '#a8322a', dir: -1 }) +
      aguacates(1300) +
      busetaStopped(260, 796, ['CHAPINERO', 'CL 72'], -1) +
      taxi(500, 796, -1) +
      renault4(646, 796, '#9fb3c0', -1) +
      sprint(880, 842, '#7d2b2b', 1) +
      taxi(1180, 842, 1);
    return { front, street };
  }
  // c: today's mix, with what A and B fix
  const front =
    edificio(rng, -20, 330, 336, u(brick.b1), shop(-4, 160, 'CIGARRERÍA', { awning: ['#c8302a', '#efe6cf'] })) +
    casaInglesa(rng, { x: 340, w: 270, eave: 470, wall: u(brick.b2), gable: 'left', garden: true }, simple) +
    casaPintada(rng, 628, 240, 452, PLASTER.cream) +
    edificio(rng, 890, 290, 372, u(brick.b3), '') +
    casaInglesa(rng, { x: 1196, w: 250, eave: 470, wall: u(brick.b2), gable: 'right' }, simple) +
    shop(1206, 160, 'TIENDA LA ESPERANZA', { awning: ['#2f6d4f', '#e8e4da'] }) +
    edificio(rng, 1460, 180, 350, u(brick.b1), '') +
    tree(rng, 610, 230, 80);
  const street =
    person({ x: 300, coat: '#3a4d6b', umbrella: '#1d1e21', dir: 1 }) +
    reciclador(560, -1) +
    person({ x: 1180, coat: '#7a2b2b', umbrella: '#a8322a', dir: 1 }) +
    aguacates(1396) +
    busetaStopped(960, 796, ['UNICENTRO', 'CRA 15'], -1) +
    renault4(300, 842, '#d7d3c4', 1);
  return { front, street };
}
