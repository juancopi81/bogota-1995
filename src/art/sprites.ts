// What moves down there: the vehicles (busetas in their liveries, yellow
// taxis, Renault 4s, Chevrolet Sprints, a sedan now and then) and the people on
// the far sidewalk, drawn at the origin in city-box units. At dusk everything
// goes blue-gray and the headlights come on.

import type { VehicleKind } from '../world/street';
import type { Walker } from '../world/life';
import { CART_REACH } from '../world/life';

export function mixNight(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, t: number) => Math.round(c + (t - c) * k);
  return `rgb(${mix((n >> 16) & 255, 20)},${mix((n >> 8) & 255, 28)},${mix(n & 255, 48)})`;
}

const wheel = (cx: number, r: number, y = -12) => `<circle cx="${cx}" cy="${y}" r="${r}" fill="#1d1f21"/><circle cx="${cx}" cy="${y}" r="${(r * 0.42).toFixed(1)}" fill="#8a8e92"/>`;

const glow = (x: number, y: number, dark: number) =>
  dark > 0.3 ? `<ellipse cx="${x}" cy="${y}" rx="40" ry="9" fill="#ffe2a0" opacity="${(0.25 * dark).toFixed(2)}"/>` : '';

export interface VehicleLook {
  kind: VehicleKind;
  dir: 1 | -1;
  colors: string[];
  route?: string;
}

/** A vehicle in profile, its left edge at x = 0 and the road at y = 0, facing the way it goes. */
export function vehicleSvg(v: VehicleLook, len: number, dark: number): string {
  const night = (hex: string) => mixNight(hex, dark * 0.7);
  const flip = v.dir === -1 ? ` transform="scale(-1 1) translate(-${len} 0)"` : '';
  // lettering stays readable when the vehicle faces the other way
  const unflip = (cx: number) => (v.dir === -1 ? ` transform="translate(${cx * 2} 0) scale(-1 1)"` : '');
  const glass = night('#39434a');
  let body = '';
  if (v.kind === 'buseta') {
    const [shell, band, line, nose] = v.colors.map(night);
    const [where, way = ''] = (v.route ?? '').split(' · ');
    body = `<rect x="4" y="-78" width="222" height="70" rx="10" fill="${shell}"/>
      <path d="M196 -44H216Q226 -44 226 -34V-14Q226 -8 220 -8H196Z" fill="${nose}"/>
      <rect x="4" y="-42" width="200" height="13" fill="${band}"/>
      <rect x="4" y="-27" width="222" height="2.5" fill="${line}"/>
      ${[20, 62, 104, 146].map((x) => `<rect x="${x}" y="-70" width="34" height="24" rx="3" fill="${glass}"/>`).join('')}
      <path d="M188 -70H214Q222 -70 222 -58V-46H188Z" fill="${night('#48545c')}"/>
      <rect x="189" y="-68" width="31" height="13" fill="${night('#f3efe2')}"/>
      <g${unflip(204.5)}>
        <text x="204.5" y="-62.4" font-size="4.4" text-anchor="middle" font-family="Anton, sans-serif" fill="#b3261e">${where}</text>
        <text x="204.5" y="-57" font-size="3.8" text-anchor="middle" font-family="Anton, sans-serif" fill="#1f3f7a">${way}</text>
      </g>
      <rect x="200" y="-10" width="30" height="6" fill="#2a2a2a"/>
      ${wheel(46, 14, -8)}${wheel(182, 14, -8)}
      <rect x="224" y="-22" width="6" height="6" fill="#ffd27a"/><rect x="0" y="-24" width="5" height="8" fill="#b3261e"/>
      ${glow(262, -16, dark)}`;
  } else if (v.kind === 'r4') {
    body = `<path d="M4 -14V-36Q4 -42 10 -43L16 -44L28 -64Q30 -67 36 -67H92Q98 -67 100 -62L106 -46L118 -44Q124 -43 124 -36V-14Z" fill="${night(v.colors[0])}"/>
      <path d="M32 -60L22 -46H56V-60Z M62 -60V-46H98L93 -60Z" fill="${glass}"/>
      <path d="M6 -30H122" stroke="#000" stroke-opacity="0.15" stroke-width="2"/>
      <rect x="118" y="-30" width="6" height="5" fill="#ffd27a"/><rect x="2" y="-30" width="5" height="6" fill="#b3261e"/>
      ${wheel(28, 11)}${wheel(100, 11)}${glow(154, -24, dark)}`;
  } else if (v.kind === 'sprint') {
    body = `<path d="M4 -14Q2 -38 16 -42L34 -60Q38 -63 46 -63H74Q84 -63 90 -54L98 -42Q112 -40 112 -28V-14Z" fill="${night(v.colors[0])}"/>
      <path d="M38 -57L26 -43H58V-57Z M64 -57V-43H92L84 -57Z" fill="${glass}"/>
      <rect x="106" y="-30" width="6" height="5" fill="#ffd27a"/><rect x="3" y="-30" width="5" height="6" fill="#b3261e"/>
      ${wheel(26, 10)}${wheel(90, 10)}${glow(142, -24, dark)}`;
  } else {
    // a taxi, or a sedan
    const w = len;
    const taxi = v.kind === 'taxi';
    body = `<path d="M6 -14Q4 -34 22 -36L40 -54Q46 -60 58 -60H88Q98 -60 104 -52L116 -36Q${w - 4} -34 ${w - 4} -14Z" fill="${night(v.colors[0])}"/>
      <path d="M46 -52H64V-38H34Z M70 -52H92L104 -38H70Z" fill="${glass}"/>
      ${taxi ? `<rect x="58" y="-66" width="20" height="7" fill="${night('#f4e7a1')}"/><path d="M8 -26H${w - 6}" stroke="#222" stroke-width="3" stroke-dasharray="6 6"/>` : ''}
      <rect x="${w - 8}" y="-28" width="5" height="5" fill="#ffd27a"/><rect x="3" y="-29" width="5" height="6" fill="#b3261e"/>
      ${wheel(32, 11)}${wheel(w - 30, 11)}${glow(w + 30, -24, dark)}`;
  }
  return `<g${flip}>${body}</g>`;
}

/** Someone on the sidewalk, feet at the origin, facing right; two strides and a standing pose. */
export function walkerSvg(w: Walker, dark: number): string {
  const night = (hex: string) => mixNight(hex, dark * 0.65);
  const legs = '#23252a';
  const coat = night(w.coat);
  const skin = night('#8a5d43');
  const leg = (a: number, b: number) => `<path d="M-3 -20L${a} 0M3 -20L${b} 0" stroke="${legs}" stroke-width="5" stroke-linecap="round"/>`;
  let s = `<g class="legs-a">${leg(-8, 7)}</g><g class="legs-b" style="display:none">${leg(4, -3)}</g><g class="legs-stand" style="display:none">${leg(-4, 4)}</g>`;
  s += `<path d="M-9 -18Q-10 -40 0 -42Q10 -40 9 -18Z" fill="${coat}"/>`;
  s += `<circle cx="1" cy="-47" r="6" fill="${skin}"/>`;
  if (w.paper) {
    s += `<path d="M-12 -54L14 -58L13 -52L-11 -48Z" fill="${night('#e8e4da')}"/><path d="M-7 -36L-10 -50M7 -36L11 -54" stroke="${coat}" stroke-width="4"/>`;
  } else if (w.umbrella) {
    const u = night(w.umbrella);
    s += `<path d="M6 -30V-64" stroke="#222" stroke-width="2"/>`;
    s += `<path d="M-16 -60Q6 -86 28 -60Q22 -63 17 -60Q11 -63 6 -60Q0 -63 -5 -60Q-11 -63 -16 -60Z" fill="${u}"/>`;
  }
  if (w.bread) s += `<rect x="-14" y="-28" width="9" height="12" rx="1" fill="${night('#d8c39a')}"/>`;
  if (w.flag) s += `<g class="arm-up" style="display:none"><path d="M-5 -36L-12 -58" stroke="${coat}" stroke-width="4.5" stroke-linecap="round"/><circle cx="-12.5" cy="-60" r="3" fill="${skin}"/></g>`;
  return `<g class="facing">${s}</g>`;
}

/** The reciclador and his cart (flattened cardboard, a sack of bottles), facing right: the cart goes first. */
export function recicladorSvg(dark: number): string {
  const night = (hex: string) => mixNight(hex, dark * 0.65);
  const wood = night('#6b5136');
  const c = CART_REACH;
  let s = '';
  // the cart, ahead of him
  s += `<circle cx="${c - 46}" cy="-9" r="9" fill="#26282b"/><circle cx="${c - 46}" cy="-9" r="3" fill="#7b7f83"/>`;
  s += `<path d="M${c - 92} -18H${c - 2}" stroke="${wood}" stroke-width="6"/>`;
  s += `<path d="M${c - 92} -18L${c - 102} -32" stroke="${wood}" stroke-width="4"/>`;
  s += `<path d="M${c - 90} -21V-44M${c - 6} -21V-44" stroke="${wood}" stroke-width="3"/>`;
  s += `<rect x="${c - 46}" y="-50" width="44" height="29" fill="${night('#b48a5a')}"/>`;
  s += `<path d="M${c - 46} -40H${c - 2}M${c - 46} -31H${c - 2}" stroke="${night('#94704a')}" stroke-width="2"/>`;
  s += `<path d="M${c - 88} -21Q${c - 92} -58 ${c - 70} -62Q${c - 48} -58 ${c - 50} -21Z" fill="${night('#e2ddd0')}"/>`;
  s += `<path d="M${c - 76} -62l2 -10M${c - 68} -62l-1 -12M${c - 61} -60l3 -8" stroke="${night('#5d8a6a')}" stroke-width="4" stroke-linecap="round"/>`;
  // him, leaning into the handles
  const legs = (a: number, b: number) => `<path d="M-2 -22L${a} 0M6 -22L${b} 0" stroke="#2e2a26" stroke-width="5" stroke-linecap="round"/>`;
  s += `<g class="legs-a">${legs(-6, 8)}</g><g class="legs-b" style="display:none">${legs(3, -1)}</g><g class="legs-stand" style="display:none">${legs(-2, 4)}</g>`;
  s += `<path d="M-6 -20Q-8 -42 2 -46Q14 -44 12 -20Z" fill="${night('#5a4a3c')}"/>`;
  s += `<path d="M6 -36L${c - 102} -31" stroke="${night('#5a4a3c')}" stroke-width="5" stroke-linecap="round"/>`;
  s += `<circle cx="-2" cy="-50" r="6" fill="${night('#6e4a35')}"/><path d="M-8 -53Q-2 -60 4 -53" fill="${night('#2f3a4a')}" stroke="${night('#2f3a4a')}" stroke-width="2"/>`;
  return `<g class="facing">${s}</g>`;
}
