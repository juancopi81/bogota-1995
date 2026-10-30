// The hallway outside your room, drawn in the same 1600×900 box: the wall
// with a print of «Horizontes» (Francisco Antonio Cano, 1913, the copy every
// other living room had), the dog asleep on the floor, and your door, which
// is drawn on its own so it can swing open onto the room.

import { P } from './palette';

export const HALLWAY = {
  door: { x: 584, y: 68, w: 432, h: 726 },
  dog: { x: 228, y: 704, w: 364, h: 150 },
} as const;

const COAT = '#c98a4b';
const COAT_SHADE = '#a96c34';
const COAT_DEEP = '#8c5527';
const COAT_LIGHT = '#dfa868';
const NOSE = '#2e1d14';

const texture = `
  <filter id="hall-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" result="a"/>
    <feComposite in="a" in2="SourceGraphic" operator="in" result="grain"/>
    <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
  </filter>`;

/** Scallops along a line, for the feathering under the dog's belly and on its ear. */
function scallops(x0: number, x1: number, y: number, step: number, depth: number): string {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += step) d += ` q${step / 2} ${depth} ${step} 0`;
  return d;
}

/** The floor's long planks, their joints staggered. */
function planks(): string {
  let s = '';
  for (let row = 0; row < 4; row++) {
    const y = 800 + row * 25;
    s += `<rect y="${y}" width="1600" height="25" fill="${row % 2 ? '#3f2e22' : '#38291e'}"/><path d="M0 ${y}H1600" stroke="#2c2017" stroke-width="2"/>`;
    for (let x = ((row * 157) % 430) + 60; x < 1600; x += 430) s += `<path d="M${x} ${y}V${y + 25}" stroke="#2c2017" stroke-width="2"/>`;
  }
  return s;
}

/**
 * The print of «Horizontes», simplified: the woman in her headscarf with the
 * baby, the man in the straw hat pointing at the mountains. It hangs in the
 * hallway's dim light.
 */
function horizontes(x: number, y: number): string {
  const w = 304;
  const h = 166;
  const at = (u: number, v: number) => `${x + u} ${y + v}`;
  const skin = '#d29a74';
  const skinMan = '#c18556';
  return `
  <path d="M${x + 22} ${y - 18}L${x + w / 2} ${y - 46}L${x + w - 22} ${y - 18}" stroke="#1e1812" stroke-width="2" fill="none"/>
  <circle cx="${x + w / 2}" cy="${y - 46}" r="4" fill="#1e1812"/>
  <rect x="${x - 20}" y="${y - 20}" width="${w + 40}" height="${h + 40}" fill="#9a7a34"/>
  <rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" fill="#6e5524"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="#b8963e"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hall-sky)"/>
  <ellipse cx="${x + 238}" cy="${y + 104}" rx="56" ry="9" fill="#e9eef6" opacity="0.6"/>
  <ellipse cx="${x + 270}" cy="${y + 96}" rx="30" ry="7" fill="#e9eef6" opacity="0.5"/>
  <ellipse cx="${x + 36}" cy="${y + 112}" rx="34" ry="8" fill="#e9eef6" opacity="0.5"/>
  <path d="M${at(150, 166)} L${at(150, 146)} L${at(190, 130)} L${at(218, 140)} L${at(246, 124)} L${at(276, 138)} L${at(304, 128)} L${at(304, 166)} Z" fill="#7d8fbf"/>
  <path d="M${at(176, 166)} Q${at(236, 142)} ${at(304, 146)} L${at(304, 166)} Z" fill="#d8c08e"/>
  <path d="M${at(214, 166)} Q${at(262, 154)} ${at(304, 158)} L${at(304, 166)} Z" fill="#c4a873"/>
  <ellipse cx="${x + 24}" cy="${y + 150}" rx="28" ry="18" fill="#e6d6bb"/>
  <path d="M${at(96, 60)} Q${at(108, 70)} ${at(118, 88)} L${at(104, 96)} Q${at(98, 78)} ${at(90, 68)} Z" fill="#4f8f7a"/>
  <path d="M${at(30, 166)} L${at(36, 132)} L${at(98, 132)} L${at(104, 166)} Z" fill="#5677b0"/>
  <path d="M${at(42, 88)} Q${at(68, 80)} ${at(94, 90)} L${at(100, 140)} L${at(34, 142)} Z" fill="#f0ebe0"/>
  <path d="M${at(48, 52)} Q${at(46, 82)} ${at(36, 104)} L${at(50, 106)} Q${at(60, 84)} ${at(62, 66)} Z" fill="#3b2a22"/>
  <ellipse cx="${x + 72}" cy="${y + 64}" rx="14" ry="17" fill="${skin}"/>
  <path d="M${at(84, 60)} l7 5 l-6 3 Z" fill="${skin}"/>
  <path d="M${at(56, 58)} Q${at(64, 38)} ${at(86, 48)} Q${at(78, 52)} ${at(74, 58)} Q${at(64, 60)} ${at(58, 74)} Q${at(48, 86)} ${at(44, 96)} Q${at(46, 76)} ${at(56, 58)} Z" fill="#c8603a"/>
  <path d="M${at(62, 50)} q6 -4 12 -2 M${at(56, 64)} q4 -6 10 -6" stroke="#e8a04a" stroke-width="2" fill="none"/>
  <rect x="${x + 66}" y="${y + 78}" width="12" height="12" fill="${skin}"/>
  <ellipse cx="${x + 80}" cy="${y + 126}" rx="30" ry="15" fill="#f6f2ea"/>
  <circle cx="${x + 92}" cy="${y + 112}" r="9" fill="#e8b892"/>
  <path d="M${at(54, 124)} Q${at(78, 140)} ${at(104, 128)}" stroke="${skin}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M${at(104, 166)} L${at(108, 84)} Q${at(134, 72)} ${at(166, 82)} L${at(176, 166)} Z" fill="#ecbcaa"/>
  <path d="M${at(170, 86)} L${at(262, 60)}" stroke="${skinMan}" stroke-width="9" stroke-linecap="round"/>
  <path d="M${at(262, 60)} l12 -3" stroke="${skinMan}" stroke-width="3" stroke-linecap="round"/>
  <path d="M${at(158, 88)} L${at(188, 79)}" stroke="#ecbcaa" stroke-width="16" stroke-linecap="round"/>
  <rect x="${x + 128}" y="${y + 66}" width="13" height="14" fill="${skinMan}"/>
  <ellipse cx="${x + 140}" cy="${y + 58}" rx="14" ry="16" fill="${skinMan}"/>
  <path d="M${at(150, 64)} q5 1 8 -1" stroke="#3a2a20" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="${x + 134}" cy="${y + 44}" rx="34" ry="9" fill="#ead9a2" transform="rotate(-8 ${x + 134} ${y + 44})"/>
  <ellipse cx="${x + 131}" cy="${y + 36}" rx="17" ry="12" fill="#e3cf92"/>
  <path d="M${at(116, 40)} q15 4 30 -1" stroke="#c9b06a" stroke-width="2" fill="none"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1b140d" opacity="0.24"/>`;
}

/** The cocker spaniel, asleep with its head on its paws, its nose toward the door. */
function dog(): string {
  return `
  <g class="dog">
    <ellipse cx="420" cy="846" rx="190" ry="12" fill="#1a130e" opacity="0.45"/>
    <g class="dog-body">
      <path d="M268 784 q-30 -18 -38 4 q16 8 38 6 Z" fill="${COAT_SHADE}"/>
      <path d="M262 796 C262 762 292 744 328 746 C358 748 374 762 402 760 C432 758 448 746 474 752 L482 834 C440 842 330 844 292 838 C272 834 262 816 262 796 Z" fill="${COAT}"/>
      <path d="M276 800 C276 772 300 758 326 760 C356 762 368 786 360 812 C352 830 300 834 284 822 Z" fill="${COAT_SHADE}" opacity="0.55"/>
      <rect x="300" y="822" width="96" height="18" rx="9" fill="${COAT_LIGHT}"/>
      <path d="${scallops(392, 482, 836, 18, 14)}" stroke="${COAT_SHADE}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M318 758 q14 -8 28 0 q14 -8 28 0 M380 772 q14 -8 28 0 q14 -8 28 0 M300 786 q12 -8 24 0" stroke="${COAT_SHADE}" stroke-width="3" fill="none" opacity="0.6"/>
    </g>
    <rect x="442" y="818" width="142" height="24" rx="12" fill="${COAT}"/>
    <rect x="454" y="800" width="126" height="22" rx="11" fill="${COAT_LIGHT}"/>
    <path d="M566 806 v12 M574 806 v12 M570 824 v14 M578 824 v14" stroke="${COAT_SHADE}" stroke-width="2"/>
    <g class="dog-head">
      <ellipse cx="470" cy="790" rx="44" ry="40" fill="${COAT}"/>
      <ellipse cx="512" cy="766" rx="46" ry="40" fill="${COAT}"/>
      <ellipse cx="554" cy="788" rx="28" ry="21" fill="${COAT_LIGHT}"/>
      <ellipse cx="548" cy="800" rx="22" ry="11" fill="${COAT}"/>
      <ellipse cx="577" cy="781" rx="9" ry="7" fill="${NOSE}"/>
      <circle cx="574" cy="778" r="2" fill="#6b5446"/>
      <path d="M506 750 q12 -6 24 0" stroke="${COAT_SHADE}" stroke-width="2" fill="none" opacity="0.7"/>
      <path d="M512 763 q11 7 22 0" stroke="${NOSE}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M516 768 l-2 4 M523 770 v4 M530 768 l2 4" stroke="${NOSE}" stroke-width="1.5"/>
      <g class="dog-ear">
        <path d="M500 744 C 470 746 456 776 460 806 C 462 826 468 842 478 846 q6 6 12 -2 q6 6 12 -3 q7 4 11 -6 C 522 812 524 770 500 744 Z" fill="${COAT_SHADE}"/>
        <path d="M474 788 q6 10 2 22 M488 784 q6 12 2 26 M502 782 q5 12 1 24" stroke="${COAT_DEEP}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </g>
    </g>
  </g>`;
}

/** Everything but the door's leaf: the hallway, the open doorway behind the leaf, the dog. */
export function hallway(): string {
  const { x, y, w, h } = HALLWAY.door;
  return `
  <defs>
    ${texture}
    <linearGradient id="hall-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ea3d4"/><stop offset="1" stop-color="#b8cbe6"/></linearGradient>
    <linearGradient id="hall-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2b8"/><stop offset="1" stop-color="#d9bf86"/></linearGradient>
    <radialGradient id="hall-glow" cx="800" cy="810" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd68c" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd68c" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="800" fill="#4f4234" filter="url(#hall-grain)"/>
  <rect width="1600" height="800" fill="url(#hall-glow)"/>
  <rect y="776" width="1600" height="24" fill="${P.baseboard}"/>
  <rect y="800" width="1600" height="100" fill="#3b2b20"/>
  ${planks()}
  <ellipse cx="800" cy="808" rx="320" ry="18" fill="#ffd98a" opacity="0.26"/>
  <rect x="${x - 28}" y="${y - 24}" width="${w + 56}" height="${h + 30}" fill="${P.woodDark}"/>
  <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="#2a1d14"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h + 6}" fill="url(#hall-room)"/>
  <rect x="${x + 40}" y="${y + 60}" width="${w - 80}" height="${h - 160}" fill="${P.wall}" opacity="0.55"/>
  <rect x="${x}" y="${y + h}" width="${w}" height="6" fill="#ffd98a"/>
  <rect x="1078" y="418" width="40" height="64" rx="4" fill="#d9cfbd"/>
  <rect x="1091" y="436" width="14" height="26" rx="2" fill="#b5a88f"/>
  ${horizontes(1170, 212)}
  ${dog()}
  <rect class="flood" width="1600" height="900" fill="#ffd98a"/>`;
}

/** The leaf of your door, in its own box (w × h), with the sign you taped on almost straight. */
export function doorLeaf(): string {
  const { w, h } = HALLWAY.door;
  const hand = `font-family="Caveat, 'Marker Felt', cursive" font-weight="700"`;
  return `
  <rect width="${w}" height="${h}" fill="${P.wood}" filter="url(#hall-grain)"/>
  <path d="M60 0V${h} M150 0V${h} M290 0V${h} M370 0V${h}" stroke="${P.woodDark}" stroke-width="2" opacity="0.22"/>
  <rect x="38" y="40" width="356" height="300" rx="6" fill="#8f5f3f" stroke="${P.woodDark}" stroke-width="6"/>
  <rect x="50" y="52" width="332" height="276" rx="4" fill="none" stroke="${P.woodLight}" stroke-width="2" opacity="0.6"/>
  <rect x="38" y="372" width="356" height="318" rx="6" fill="#8f5f3f" stroke="${P.woodDark}" stroke-width="6"/>
  <rect x="50" y="384" width="332" height="294" rx="4" fill="none" stroke="${P.woodLight}" stroke-width="2" opacity="0.6"/>
  <circle cx="390" cy="404" r="22" fill="#a8822f"/>
  <circle cx="390" cy="404" r="15" fill="#c9a14a"/>
  <circle cx="385" cy="399" r="5" fill="#e6c77a"/>
  <path d="M387 440 h6 v14 h-6 Z" fill="#2a1d14"/>
  <defs>
    <filter id="sign-lift" x="-15%" y="-15%" width="135%" height="150%">
      <feDropShadow dx="6" dy="10" stdDeviation="7" flood-color="#1a0f08" flood-opacity="0.55"/>
    </filter>
    <filter id="tape-lift" x="-20%" y="-30%" width="140%" height="180%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#1a0f08" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="sign-paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbf1c4"/><stop offset="1" stop-color="#ecd88a"/>
    </linearGradient>
  </defs>
  <g transform="rotate(-5 222 166) translate(8 0)">
    <path d="M78 96 L360 88 L364 210 L336 244 L84 246 Z" fill="url(#sign-paper)" filter="url(#sign-lift)"/>
    <path d="M78 96 L360 88" stroke="#fffbe6" stroke-width="2" opacity="0.8"/>
    <path d="M364 210 L336 244 L341 216 Z" fill="#d6bf6c"/>
    <path d="M341 216 L364 210" stroke="#b89d4c" stroke-width="1.5"/>
    <text x="221" y="157" font-size="54" text-anchor="middle" textLength="248" lengthAdjust="spacingAndGlyphs" fill="#1d1712" stroke="#1d1712" stroke-width="1.4" stroke-linejoin="round" ${hand}>TOQUE ANTES</text>
    <text x="212" y="214" font-size="54" text-anchor="middle" textLength="206" lengthAdjust="spacingAndGlyphs" fill="#1d1712" stroke="#1d1712" stroke-width="1.4" stroke-linejoin="round" ${hand}>DE ENTRAR</text>
    <path d="M118 230 q88 9 176 -6" stroke="#c0281f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g filter="url(#tape-lift)" opacity="0.88">
      <rect x="92" y="78" width="58" height="22" fill="#f4efdc" transform="rotate(-18 121 89)"/>
      <rect x="312" y="74" width="58" height="22" fill="#f4efdc" transform="rotate(13 341 85)"/>
    </g>
  </g>`;
}
