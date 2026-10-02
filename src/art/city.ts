// The view from the window: Teusaquillo brick, the street three floors down,
// and the cerros to the east with Monserrate's white church on its peak.
// Drawn in a 1600×900 box; the room shows a slice of it through the window.

import { P } from './palette';
import { mulberry32, type Rng } from '../util/rng';
import { barrio, type Barrio } from './barrio';

/** Round 6 mockups: ?barrio=a|b|c draws one of the three streets to choose from. */
function mockup(): Barrio | null {
  const v = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('barrio');
  return v === 'a' || v === 'b' || v === 'c' ? v : null;
}

const W = 1600;

export function brickPattern(id: string, color: string): string {
  return `
  <pattern id="${id}" width="18" height="10" patternUnits="userSpaceOnUse">
    <rect width="18" height="10" fill="${color}"/>
    <path d="M0 0.5H18M0 5.5H18M4.5 0.5V5.5M13.5 5.5V10" stroke="${P.mortar}" stroke-opacity="0.35" stroke-width="0.9"/>
  </pattern>`;
}

export interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Windows that light up at dusk, each with its own moment. */
export function windowRect(rng: Rng, win: Win, frame = true): string {
  const th = (0.15 + rng() * 0.8).toFixed(2);
  const warm = rng() < 0.8 ? P.glassLit : '#cfe0ea';
  const f = frame
    ? `<rect x="${win.x - 3}" y="${win.y - 3}" width="${win.w + 6}" height="${win.h + 6}" fill="${P.frame}"/>`
    : '';
  const bar = win.w > 22 ? `<rect x="${win.x + win.w / 2 - 1}" y="${win.y}" width="2" height="${win.h}" fill="${P.frame}"/>` : '';
  return `${f}<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="${P.glass}"/>
    <rect class="win" data-th="${th}" x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="${warm}" opacity="0"/>
    <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h * 0.35}" fill="#fff" opacity="0.06"/>${bar}`;
}

function apartmentBlock(rng: Rng, x: number, top: number, w: number, bottom: number, floors: number, cols: number, pattern: string): string {
  const floorH = (bottom - top - 40) / floors;
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" fill="url(#${pattern})"/>`;
  // parapet and roof clutter: water tanks and antennas, every roof in the city had them
  s += `<rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="10" fill="${P.concrete}"/>`;
  const tanks = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < tanks; i++) {
    const tx = x + 20 + rng() * (w - 70);
    s += `<rect x="${tx}" y="${top - 38}" width="34" height="30" rx="4" fill="${P.eternit}"/>
      <ellipse cx="${tx + 17}" cy="${top - 38}" rx="17" ry="4" fill="#6f7579"/>`;
  }
  const ants = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < ants; i++) {
    const ax = x + 10 + rng() * (w - 20);
    const ah = 30 + rng() * 40;
    s += `<path d="M${ax} ${top - 8}V${top - 8 - ah}M${ax - 16} ${top - 8 - ah + 6}H${ax + 16}M${ax - 11} ${top - 8 - ah + 16}H${ax + 11}M${ax - 7} ${top - 8 - ah + 25}H${ax + 7}" stroke="#2c3033" stroke-width="2" fill="none"/>`;
  }
  const margin = 18;
  const gap = (w - margin * 2) / cols;
  for (let f = 0; f < floors; f++) {
    const wy = top + 22 + f * floorH;
    // floor slab lines: exposed concrete bands
    s += `<rect x="${x}" y="${wy + floorH - 12}" width="${w}" height="5" fill="${P.concrete}" opacity="0.55"/>`;
    for (let c = 0; c < cols; c++) {
      const wx = x + margin + c * gap + 6;
      s += windowRect(rng, { x: wx, y: wy, w: gap - 20, h: floorH - 28 });
    }
  }
  return s;
}

/** A Teusaquillo house: brick, steep tile roof, a bay window, a chimney. */
function teusaquilloHouse(rng: Rng, x: number, w: number, eave: number, bottom: number, pattern: string): string {
  const peak = eave - w * 0.42;
  const cx = x + w / 2;
  let s = '';
  // chimney
  const chx = x + w * (rng() < 0.5 ? 0.22 : 0.7);
  s += `<rect x="${chx}" y="${peak + 30}" width="22" height="${eave - peak}" fill="${P.brickDark}"/><rect x="${chx - 3}" y="${peak + 26}" width="28" height="7" fill="${P.concrete}"/>`;
  s += `<rect x="${x}" y="${eave}" width="${w}" height="${bottom - eave}" fill="url(#${pattern})"/>`;
  // roof with tile rows
  s += `<path d="M${x - 14} ${eave + 4}L${cx} ${peak}L${x + w + 14} ${eave + 4}Z" fill="${P.tile}"/>`;
  for (let i = 1; i < 6; i++) {
    const yy = peak + ((eave - peak) * i) / 6;
    const half = ((yy - peak) / (eave - peak)) * (w / 2 + 14);
    s += `<path d="M${cx - half} ${yy}H${cx + half}" stroke="#5f2d20" stroke-width="2" opacity="0.5"/>`;
  }
  // gable window
  s += windowRect(rng, { x: cx - 16, y: eave - 58, w: 32, h: 38 });
  // bay window on the first floor
  const bay = { x: x + w * 0.12, y: eave + 40, w: w * 0.36, h: 70 };
  s += `<rect x="${bay.x - 8}" y="${bay.y - 12}" width="${bay.w + 16}" height="${bay.h + 24}" fill="${P.brickDark}"/>`;
  s += windowRect(rng, bay);
  s += windowRect(rng, { x: x + w * 0.6, y: eave + 44, w: w * 0.26, h: 62 });
  // ground floor: door and a window with bars
  s += `<rect x="${x + w * 0.62}" y="${bottom - 96}" width="${w * 0.2}" height="96" fill="#3b2a20"/>`;
  s += windowRect(rng, { x: x + w * 0.14, y: bottom - 90, w: w * 0.3, h: 58 });
  s += `<path d="${Array.from({ length: 6 }, (_, i) => `M${x + w * 0.14 + (i * w * 0.3) / 5} ${bottom - 90}V${bottom - 32}`).join('')}" stroke="#222" stroke-width="2"/>`;
  return s;
}

export interface CityOptions {
  /** Unique prefix for ids (the room and the close-up each draw their own copy). */
  id: string;
  /** Draw fewer small details (for the little window in the room). */
  simple?: boolean;
}

export function citySvg({ id, simple = false }: CityOptions): string {
  const rng = mulberry32(1995);
  const which = mockup();
  const art = which ? barrio(which, mulberry32(1995), { b1: `${id}-b1`, b2: `${id}-b2`, b3: `${id}-b3` }, simple) : null;
  const b1 = `${id}-b1`;
  const b2 = `${id}-b2`;
  const b3 = `${id}-b3`;

  const cerroFar =
    'M0 330 C 120 300 220 250 330 262 C 430 272 480 230 560 236 C 660 244 720 200 820 214 C 900 225 960 196 1040 205 C 1120 214 1150 170 1230 176 C 1320 183 1380 150 1450 160 C 1520 170 1570 200 1600 196 V620 H0Z';
  const cerroMid =
    'M0 400 C 90 380 170 352 260 360 C 350 368 420 320 500 330 C 590 342 660 300 740 312 C 830 326 900 296 980 300 C 1050 304 1100 262 1140 238 C 1160 226 1178 214 1190 212 C 1204 214 1222 230 1246 250 C 1300 290 1360 262 1420 250 C 1470 240 1500 205 1528 198 C 1552 204 1580 236 1600 244 V640 H0Z';

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" class="city-svg">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.skyTop}"/>
      <stop offset="0.55" stop-color="${P.skyMid}"/>
      <stop offset="1" stop-color="${P.skyLow}"/>
    </linearGradient>
    <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.skyLow}" stop-opacity="0"/>
      <stop offset="1" stop-color="${P.skyLow}" stop-opacity="0.75"/>
    </linearGradient>
    <linearGradient id="${id}-street" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.asphaltWet}"/>
      <stop offset="1" stop-color="${P.asphalt}"/>
    </linearGradient>
    <radialGradient id="${id}-lamp">
      <stop offset="0" stop-color="${P.sodium}" stop-opacity="0.95"/>
      <stop offset="0.25" stop-color="${P.sodium}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${P.sodium}" stop-opacity="0"/>
    </radialGradient>
    ${brickPattern(b1, P.brick)}
    ${brickPattern(b2, P.brickLight)}
    ${brickPattern(b3, P.brickDark)}
  </defs>
  <rect width="1600" height="900" fill="url(#${id}-sky)"/>
  <g class="cerros">
    <path d="${cerroFar}" fill="${P.cerroFar}"/>
    <path d="${cerroMid}" fill="${P.cerroMid}"/>
    <!-- Monserrate: the white sanctuary on the peak -->
    <g class="monserrate" transform="translate(1176 196)">
      <rect x="0" y="4" width="26" height="14" fill="#e9e6de"/>
      <rect x="8" y="-8" width="9" height="14" fill="#f1eee7"/>
      <path d="M8 -8 L12.5 -15 L17 -8Z" fill="#e0dcd2"/>
    </g>
    <g class="mons-lights" opacity="0">
      <circle cx="1189" cy="206" r="10" fill="url(#${id}-lamp)"/>
      <circle cx="1181" cy="213" r="2" fill="#ffe2a6"/><circle cx="1197" cy="212" r="2" fill="#ffe2a6"/><circle cx="1189" cy="200" r="1.8" fill="#fff1cf"/>
    </g>
    <!-- Guadalupe, further south, with its statue -->
    <path d="M1526 186 v-12 M1522 178 h8" stroke="#dcd8cf" stroke-width="3"/>
    <path d="M0 470 C 200 440 420 460 640 440 C 860 420 1080 452 1300 430 C 1450 416 1540 430 1600 426 V660 H0Z" fill="${P.cerroNear}" opacity="0.55"/>
  </g>
  <rect class="mist" x="0" y="300" width="1600" height="260" fill="url(#${id}-haze)" opacity="0.7"/>
  ${which ? `<g class="neblina" fill="#c9d0d3">
    <ellipse cx="300" cy="300" rx="380" ry="26" opacity="0.55"/>
    <ellipse cx="980" cy="262" rx="300" ry="20" opacity="0.5"/>
    <ellipse cx="1420" cy="236" rx="240" ry="18" opacity="0.45"/>
  </g>` : ''}
  <g class="far-roofs" opacity="0.8">`;

  // A band of far rooftops and eucalyptus between the street and the hills
  for (let x = -20; x < W; ) {
    const w = 60 + rng() * 110;
    const h = 30 + rng() * 60;
    const top = 470 - h;
    if (rng() < 0.22) {
      s += `<ellipse cx="${x + w / 2}" cy="${top + 10}" rx="${w * 0.35}" ry="${h * 0.9}" fill="#4f5d4c"/>`;
    } else {
      s += `<rect x="${x}" y="${top}" width="${w}" height="${h + 40}" fill="${rng() < 0.5 ? '#8e5d4b' : '#9b6a55'}"/>`;
      if (!simple) {
        for (let i = 0; i < w / 26; i++) {
          s += `<rect class="win" data-th="${(0.2 + rng() * 0.75).toFixed(2)}" x="${x + 6 + i * 26}" y="${top + 10}" width="12" height="10" fill="${P.glassLit}" opacity="0"/>`;
        }
      }
    }
    x += w - 6;
  }
  s += `</g><rect x="0" y="400" width="1600" height="100" fill="url(#${id}-haze)" opacity="0.35"/>`;

  // The street-front: apartment blocks and Teusaquillo houses
  s += `<g class="block">`;
  if (art) s += art.front;
  else {
  s += apartmentBlock(rng, -10, 336, 330, 720, 6, 4, b1);
  s += teusaquilloHouse(rng, 340, 270, 470, 720, b2);
  s += teusaquilloHouse(rng, 630, 250, 480, 720, b1);
  s += apartmentBlock(rng, 900, 372, 280, 720, 5, 3, b3);
  s += teusaquilloHouse(rng, 1196, 250, 470, 720, b2);
  s += apartmentBlock(rng, 1460, 350, 170, 720, 6, 2, b1);

  // The corner shop (tienda) on the ground floor of the right-hand house
  s += `
    <rect x="1206" y="636" width="160" height="84" fill="#2b2622"/>
    <rect class="tienda-light" x="1212" y="642" width="148" height="70" fill="#dfeedd" opacity="0.55"/>
    <rect x="1230" y="660" width="40" height="52" fill="#b33a2e" opacity="0.8"/>
    <rect x="1284" y="656" width="62" height="12" fill="#7a5a3a"/><rect x="1284" y="676" width="62" height="12" fill="#7a5a3a"/>
    <rect x="1196" y="606" width="180" height="30" fill="${P.paper}"/>
    <text x="1286" y="627" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="19" fill="#b03026" letter-spacing="1">TIENDA LA ESPERANZA</text>
    <rect x="1382" y="640" width="40" height="40" rx="4" fill="#c8302a"/>
    <text x="1402" y="664" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="9" fill="#fff">GASEOSAS</text>`;
  }
  s += `</g>`;

  // Power and telephone lines, sagging from pole to pole
  s += `<g class="cables" stroke="#23272a" stroke-width="2" fill="none" opacity="0.8">
    <path d="M-10 560 Q 130 600 260 574 Q 520 618 820 572 Q 1100 616 1360 568 Q 1500 598 1610 580"/>
    <path d="M-10 546 Q 140 580 260 560 Q 540 598 820 558 Q 1090 596 1360 552 Q 1500 580 1610 566"/>
    <path d="M260 574 Q 300 520 330 470" stroke-width="1.5"/>
    <path d="M1360 568 Q 1420 540 1470 470" stroke-width="1.5"/>
  </g>`;

  // Street level: far sidewalk, the road (wet), our side
  s += `
  <rect x="0" y="716" width="1600" height="26" fill="${P.sidewalk}"/>
  <rect x="0" y="740" width="1600" height="6" fill="${P.curb}"/>
  <rect x="0" y="746" width="1600" height="154" fill="url(#${id}-street)"/>
  <g class="reflections" opacity="0.35">
    <rect x="120" y="760" width="160" height="4" fill="#9fb0bb"/>
    <rect x="560" y="790" width="260" height="3" fill="#9fb0bb"/>
    <rect x="1010" y="770" width="190" height="4" fill="#9fb0bb"/>
    <rect x="1240" y="760" width="140" height="6" class="tienda-reflection" fill="#dfeedd"/>
  </g>
  <path d="M0 824 H 1600" stroke="#d8d2b5" stroke-width="5" stroke-dasharray="46 40" opacity="0.5"/>
  ${art ? `<g class="street-life">${art.street}</g>` : ''}
  <g class="traffic"></g>
  <rect x="0" y="872" width="1600" height="28" fill="${P.sidewalk}"/>`;

  // Street lamps (sodium) — they come on at dusk
  for (const lx of [250, 820, 1360]) {
    s += `<g class="lamp"><path d="M${lx} 742 V 520 q 0 -18 24 -18 h 20" stroke="#2c3033" stroke-width="7" fill="none"/>
      <rect x="${lx + 38}" y="498" width="26" height="10" rx="4" fill="#3a3f43"/>
      <circle class="lamp-glow" cx="${lx + 51}" cy="512" r="70" fill="url(#${id}-lamp)" opacity="0"/>
      <ellipse class="lamp-pool" cx="${lx + 51}" cy="790" rx="120" ry="22" fill="${P.sodium}" opacity="0"/></g>`;
  }

  s += `<rect class="night" width="1600" height="900" fill="#0d1628" opacity="0" style="mix-blend-mode:multiply"/>`;
  s += `</svg>`;
  return s;
}
