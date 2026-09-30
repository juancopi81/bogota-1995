// The bedroom, drawn as a flat stage set in a 1600×900 box.
//
// Layers (back to front): the city (seen through the window hole), the wall
// with everything standing against it, the phone on the floor, the bed in the
// foreground. Positions of the things other modules animate or overlay are
// exported below.

import { P } from './palette';

export const ROOM = {
  window: { x: 540, y: 110, w: 460, h: 360 },
  tvScreen: { x: 1115, y: 322, w: 138, h: 112 },
  clock: { cx: 1354, cy: 452, r: 13 },
  grabadora: { x: 104, y: 392, w: 300, h: 156 },
  tv: { x: 1090, y: 130, w: 250, h: 345 },
  phone: { x: 1170, y: 730, w: 300, h: 130 },
  deckWindow: { x: 222, y: 462, w: 64, h: 40 },
} as const;

const paperTexture = (id: string, base: number) => `
  <filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${base}" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" result="a"/>
    <feComposite in="a" in2="SourceGraphic" operator="in" result="grain"/>
    <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
  </filter>`;

// Days of October 1995. The 1st was a Sunday; Monday the 16th was the Día de
// la Raza holiday (moved from the 12th by the Ley Emiliani).
function calendar(x: number, y: number, cell: number): string {
  let s = '';
  const heads = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  heads.forEach((h, i) => {
    s += `<text x="${x + i * cell + cell / 2}" y="${y}" font-size="${cell * 0.55}" text-anchor="middle" fill="${i === 0 ? '#b3261e' : P.ink}" font-family="Anton, sans-serif">${h}</text>`;
  });
  for (let d = 1; d <= 31; d++) {
    const idx = d - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const red = col === 0 || d === 16;
    const cx = x + col * cell + cell / 2;
    const cy = y + (row + 1) * cell * 0.95;
    s += `<text x="${cx}" y="${cy}" font-size="${cell * 0.5}" text-anchor="middle" fill="${red ? '#b3261e' : P.ink}" font-family="'Special Elite', monospace">${d}</text>`;
    if (d < 28) {
      s += `<path d="M${cx - cell * 0.32} ${cy - cell * 0.42}L${cx + cell * 0.32} ${cy + cell * 0.08}" stroke="${P.pencil}" stroke-width="1.1" opacity="0.8"/>`;
    }
    if (d === 28) {
      s += `<circle cx="${cx}" cy="${cy - cell * 0.17}" r="${cell * 0.42}" fill="none" stroke="${P.pencil}" stroke-width="1.2"/>`;
    }
  }
  return s;
}

function curtain(x: number, w: number, top: number, bottom: number, flip: boolean): string {
  const folds = 6;
  let s = `<path d="M${x} ${top} H${x + w} V${bottom} Q ${x + w / 2} ${bottom + 14} ${x} ${bottom} Z" fill="${P.curtain}"/>`;
  for (let i = 0; i < folds; i++) {
    const fx = x + (w / folds) * i + (flip ? 4 : 0);
    s += `<path d="M${fx + 3} ${top} C ${fx + 9} ${top + 120} ${fx - 2} ${bottom - 120} ${fx + 6} ${bottom + (i % 2 ? 6 : 0)}" stroke="${P.curtainDark}" stroke-width="${5 + (i % 3)}" fill="none" opacity="0.55"/>`;
  }
  // a small printed motif, the kind every 90s curtain had
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 3; col++) {
      const mx = x + 14 + col * (w / 3) + (row % 2) * 10;
      const my = top + 26 + row * 38;
      s += `<path d="M${mx} ${my} l4 -6 l4 6 l-4 6z" fill="#8a6124" opacity="0.35"/>`;
    }
  }
  return s;
}

/** The wall and everything standing against it. The window is a hole. */
export function wallSvg(): string {
  const { window: win } = ROOM;
  const wallHole = `M0 0H1600V710H0Z M${win.x} ${win.y}V${win.y + win.h}H${win.x + win.w}V${win.y}Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" class="room-svg">
  <defs>
    ${paperTexture('tex-wall', 0.9)}
    ${paperTexture('tex-wood', 0.05)}
    <linearGradient id="wall-light" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.10"/>
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="0.55" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dfe8ee" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#dfe8ee" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#dfe8ee" stop-opacity="0.12"/>
    </linearGradient>
    <radialGradient id="screen-off" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#4b5856"/>
      <stop offset="1" stop-color="#1f2626"/>
    </radialGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9ccce"/>
      <stop offset="1" stop-color="#9a9ea2"/>
    </linearGradient>
  </defs>

  <!-- wall -->
  <path d="${wallHole}" fill="${P.wall}" fill-rule="evenodd" filter="url(#tex-wall)"/>
  <path d="${wallHole}" fill="url(#wall-light)" fill-rule="evenodd"/>
  <rect x="0" y="690" width="1600" height="20" fill="${P.baseboard}"/>

  <!-- the window: white-painted steel frame, a transom, two sliding panes -->
  <g class="window-frame">
    <rect x="${win.x - 16}" y="${win.y - 16}" width="${win.w + 32}" height="${win.h + 32}" fill="none" stroke="#cfc8b8" stroke-width="10"/>
    <rect x="${win.x - 6}" y="${win.y - 6}" width="${win.w + 12}" height="${win.h + 12}" fill="none" stroke="${P.frame}" stroke-width="12"/>
    <rect x="${win.x}" y="${win.y + 92}" width="${win.w}" height="10" fill="${P.frame}"/>
    <rect class="glass" x="${win.x}" y="${win.y}" width="${win.w}" height="92" fill="url(#glass)"/>
    <g class="pane-left">
      <rect x="${win.x}" y="${win.y + 102}" width="${win.w / 2 + 6}" height="${win.h - 102}" fill="url(#glass)"/>
      <rect x="${win.x + win.w / 2 - 2}" y="${win.y + 102}" width="10" height="${win.h - 102}" fill="${P.frame}"/>
    </g>
    <g class="pane-right">
      <rect x="${win.x + win.w / 2 + 6}" y="${win.y + 102}" width="${win.w / 2 - 6}" height="${win.h - 102}" fill="url(#glass)"/>
      <rect x="${win.x + win.w / 2 + 6}" y="${win.y + 102}" width="8" height="${win.h - 102}" fill="${P.frame}"/>
      <rect x="${win.x + win.w / 2 + 16}" y="${win.y + 220}" width="6" height="26" rx="2" fill="#8d8a82"/>
    </g>
    <rect x="${win.x - 20}" y="${win.y + win.h + 6}" width="${win.w + 40}" height="16" fill="#d8d1c3"/>
    <rect x="${win.x - 20}" y="${win.y + win.h + 20}" width="${win.w + 40}" height="5" fill="#b9b1a1"/>
  </g>

  <g class="hot" data-hot="window"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="transparent"/></g>

  <!-- a sábila (aloe) in a clay pot on the sill -->
  <g transform="translate(${win.x + 20} ${win.y + win.h - 34})">
    <path d="M6 40 L10 24 H38 L42 40Z" fill="#a6553a"/>
    <rect x="8" y="20" width="32" height="6" fill="#8e452e"/>
    <path d="M24 22 C 18 6 10 -6 2 -14 C 14 -6 22 4 26 20Z" fill="#6e8f5c"/>
    <path d="M24 22 C 26 2 30 -10 40 -22 C 34 -6 30 8 28 22Z" fill="#7b9b66"/>
    <path d="M22 22 C 14 14 6 12 -4 12 C 8 8 16 12 24 20Z" fill="#62824f"/>
    <path d="M26 22 C 34 12 42 10 52 10 C 42 14 34 18 28 22Z" fill="#6e8f5c"/>
  </g>

  <!-- curtains on a wooden rod -->
  <rect x="${win.x - 80}" y="${win.y - 22}" width="${win.w + 160}" height="8" rx="4" fill="${P.woodDark}"/>
  ${curtain(win.x - 78, 96, win.y - 16, win.y + win.h + 52, false)}
  <g class="curtain-right">${curtain(win.x + win.w - 18, 96, win.y - 16, win.y + win.h + 52, true)}</g>

  <!-- Rock al Parque 95: a photocopied flyer, masking tape on the corners -->
  <g transform="translate(76 150) rotate(-2)">
    <rect width="160" height="226" fill="#f2f0ea"/>
    <rect x="10" y="10" width="140" height="206" fill="none" stroke="#1b1b1b" stroke-width="3"/>
    <text x="80" y="52" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="34" fill="#141414">ROCK AL</text>
    <text x="80" y="90" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="38" fill="#141414">PARQUE</text>
    <path d="M24 108 H136" stroke="#141414" stroke-width="3"/>
    <g fill="#141414" opacity="0.9">
      <path d="M40 176 q 10 -30 20 0 q 10 -34 22 0 q 12 -28 22 0 q 10 -22 20 0 v 18 h-84z"/>
      <path d="M58 150 l 10 -30 l 5 2 l -9 30z"/>
      <circle cx="102" cy="136" r="6"/>
    </g>
    <text x="80" y="204" text-anchor="middle" font-family="'Special Elite', monospace" font-size="10.5" fill="#141414">MAYO 26·27·28·29 1995</text>
    <text x="80" y="121" text-anchor="middle" font-family="'Special Elite', monospace" font-size="8.5" fill="#141414">PARQUE SIMÓN BOLÍVAR</text>
    <text x="80" y="221" text-anchor="middle" font-family="Anton, sans-serif" font-size="8" fill="#141414" letter-spacing="1">ENTRADA LIBRE</text>
    <rect x="-8" y="-6" width="34" height="13" fill="#d9c79c" opacity="0.85" transform="rotate(-18)"/>
    <rect x="138" y="-10" width="34" height="13" fill="#d9c79c" opacity="0.85" transform="rotate(14 150 0)"/>
    <rect width="160" height="226" fill="#000" opacity="0.05" filter="url(#tex-wall)"/>
  </g>

  <!-- the almanaque from the bakery, October 1995 -->
  <g transform="translate(262 116)">
    <path d="M70 -12 L 4 6 M70 -12 L 136 6" stroke="#6b5a46" stroke-width="1.5"/>
    <circle cx="70" cy="-12" r="3" fill="#555"/>
    <rect width="140" height="252" fill="${P.paper}"/>
    <rect x="8" y="8" width="124" height="86" fill="#6f8aa3"/>
    <path d="M8 70 C 40 50 70 64 100 46 C 116 38 126 44 132 42 V94 H8Z" fill="#4e6b47"/>
    <path d="M8 84 C 50 76 90 88 132 80 V94 H8Z" fill="#3e5b3a"/>
    <ellipse cx="96" cy="30" rx="18" ry="7" fill="#dfe5ea" opacity="0.8"/>
    <text x="70" y="110" text-anchor="middle" font-family="Anton, sans-serif" font-size="11" fill="#9a2a22">PANADERÍA LA FLORIDA</text>
    <text x="70" y="121" text-anchor="middle" font-family="'Special Elite', monospace" font-size="6.5" fill="${P.ink}">Cra. 13 No. 60-24 · Tel. 2 49 51 17</text>
    <text x="70" y="137" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" fill="${P.ink}" letter-spacing="1">OCTUBRE 1995</text>
    ${calendar(10, 151, 17.2)}
  </g>

  <!-- desk -->
  <g class="desk">
    <rect x="56" y="546" width="452" height="16" fill="${P.woodLight}"/>
    <rect x="56" y="560" width="452" height="4" fill="${P.woodDark}"/>
    <rect x="66" y="564" width="150" height="130" fill="${P.wood}" filter="url(#tex-wood)"/>
    <rect x="76" y="574" width="130" height="34" fill="${P.woodLight}" opacity="0.5"/>
    <rect x="76" y="614" width="130" height="34" fill="${P.woodLight}" opacity="0.5"/>
    <rect x="76" y="654" width="130" height="34" fill="${P.woodLight}" opacity="0.5"/>
    <rect x="128" y="587" width="26" height="6" rx="3" fill="#3f2a1a"/>
    <rect x="128" y="627" width="26" height="6" rx="3" fill="#3f2a1a"/>
    <rect x="128" y="667" width="26" height="6" rx="3" fill="#3f2a1a"/>
    <rect x="216" y="564" width="282" height="24" fill="${P.wood}"/>
    <rect x="482" y="588" width="16" height="106" fill="${P.woodDark}"/>
  </g>

  <!-- a mug of BIC pens -->
  <g transform="translate(66 514)">
    <path d="M2 -12 L -6 -46 M10 -12 L 14 -50 M16 -12 L 26 -40" stroke="#e8e4da" stroke-width="4" stroke-linecap="round"/>
    <path d="M-6 -46 l -1 -6 M14 -50 v -6 M26 -40 l 2 -6" stroke="${P.pencil}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M22 -12 L 32 -52" stroke="#e1b43c" stroke-width="4" stroke-linecap="round"/>
    <rect x="-4" y="-14" width="34" height="46" rx="4" fill="#3d6e8c"/>
    <rect x="-4" y="-2" width="34" height="8" fill="#e8e1cf" opacity="0.7"/>
  </g>

  <!-- the grabadora on the desk (details live in the close-up) -->
  <g class="hot" data-hot="grabadora">
    <rect x="96" y="380" width="324" height="176" fill="transparent"/>
    <path d="M150 424 V 404 Q 150 394 162 394 H 352 Q 364 394 364 404 V 424" stroke="#2c2d30" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="108" y="420" width="300" height="126" rx="14" fill="url(#silver)"/>
    <rect x="108" y="420" width="300" height="126" rx="14" fill="none" stroke="#6f7478" stroke-width="2"/>
    <circle cx="162" cy="486" r="42" fill="#2e3033"/>
    <circle cx="162" cy="486" r="42" fill="none" stroke="#8b8f93" stroke-width="3"/>
    <circle cx="162" cy="486" r="14" fill="#1d1e20"/>
    <circle cx="354" cy="486" r="42" fill="#2e3033"/>
    <circle cx="354" cy="486" r="42" fill="none" stroke="#8b8f93" stroke-width="3"/>
    <circle cx="354" cy="486" r="14" fill="#1d1e20"/>
    <rect x="214" y="428" width="88" height="24" rx="3" fill="#20242a"/>
    <path d="M220 440 H296" stroke="#d9c690" stroke-width="1" stroke-dasharray="2 4"/>
    <rect class="dial-needle" x="251" y="431" width="2" height="18" fill="#e04a2f"/>
    <rect x="218" y="458" width="72" height="48" rx="4" fill="#26282c"/>
    <rect x="${ROOM.deckWindow.x}" y="${ROOM.deckWindow.y}" width="${ROOM.deckWindow.w}" height="${ROOM.deckWindow.h}" rx="3" fill="#3b3f45"/>
    <g class="deck-cassette" opacity="1">
      <rect x="228" y="468" width="52" height="30" rx="2" fill="#e8e3d6"/>
      <circle class="reel-l" cx="243" cy="484" r="6" fill="#4a3a2c"/>
      <circle class="reel-r" cx="265" cy="484" r="6" fill="#4a3a2c"/>
    </g>
    <g fill="#3a3c40">
      <rect x="218" y="512" width="10" height="16" rx="1"/>
      <rect x="230" y="512" width="10" height="16" rx="1"/>
      <rect x="242" y="512" width="10" height="16" rx="1"/>
      <rect x="254" y="512" width="10" height="16" rx="1"/>
      <rect x="266" y="512" width="10" height="16" rx="1"/>
      <rect x="278" y="512" width="10" height="16" rx="1"/>
    </g>
    <rect x="218" y="512" width="10" height="16" rx="1" fill="${P.rec}"/>
    <circle class="rec-led" cx="296" cy="520" r="3" fill="#5a1a14"/>
  </g>

  <!-- cassettes: a pile of cases and one standing, handwritten -->
  <g class="cassettes">
    <rect x="414" y="530" width="74" height="12" fill="#2d2f33"/><rect x="418" y="532" width="66" height="8" fill="#d8cfb8"/>
    <rect x="410" y="518" width="74" height="12" fill="#2d2f33"/><rect x="414" y="520" width="66" height="8" fill="#c14b3a"/>
    <rect x="416" y="506" width="74" height="12" fill="#2d2f33"/><rect x="420" y="508" width="66" height="8" fill="#e0d4a8"/>
  </g>

  <!-- the desk chair, pulled out, back to us, with Friday's uniform on it -->
  <g class="chair">
    <!-- far legs and the seat behind the backrest -->
    <rect x="338" y="668" width="7" height="50" fill="${P.woodDark}"/>
    <rect x="415" y="668" width="7" height="50" fill="${P.woodDark}"/>
    <rect x="330" y="656" width="100" height="14" rx="2" fill="${P.wood}"/>
    <!-- the gray pants, hanging over the seat -->
    <path d="M338 662 H 424 L 428 708 Q 414 712 402 706 L 396 684 L 388 706 Q 374 712 362 706 L 352 684 L 342 708 Q 334 710 332 704 Z" fill="#7b7e83"/>
    <path d="M352 684 L 350 706 M 396 684 L 398 706 M 362 668 Q 366 686 360 704" stroke="#5f6267" stroke-width="2" fill="none"/>
    <!-- the backrest: two posts that are also the near legs, two rails -->
    <rect x="318" y="566" width="10" height="172" rx="2" fill="${P.wood}"/>
    <rect x="432" y="566" width="10" height="172" rx="2" fill="${P.wood}"/>
    <rect x="322" y="624" width="116" height="9" fill="${P.woodDark}"/>
    <rect x="312" y="564" width="136" height="16" rx="4" fill="${P.woodLight}"/>
    <!-- the school sweater (saco), thrown over the backrest, crest and all -->
    <path d="M314 568 Q 380 548 446 568 L 452 616 Q 446 640 440 646 H 322 Q 314 640 310 616 Z" fill="#1f2b47"/>
    <path d="M322 638 H 440 L 438 648 H 324 Z" fill="#2c3b5e"/>
    <path d="M356 560 L 380 588 L 404 560" stroke="#2c3b5e" stroke-width="5" fill="none"/>
    <path d="M312 574 C 300 600 304 650 306 690 L 322 692 C 322 650 326 610 326 580 Z" fill="#1b2640"/>
    <path d="M448 574 C 460 600 456 650 454 690 L 438 692 C 438 650 434 610 434 580 Z" fill="#1b2640"/>
    <rect x="304" y="684" width="20" height="10" rx="2" fill="#2c3b5e"/>
    <rect x="436" y="684" width="20" height="10" rx="2" fill="#2c3b5e"/>
    <!-- the crest: a small shield, gold and red -->
    <path d="M414 588 h16 v8 q0 9 -8 13 q-8 -4 -8 -13 z" fill="#b8322a" stroke="#e1b43c" stroke-width="2"/>
    <path d="M422 591 v14" stroke="#e1b43c" stroke-width="1.5"/>
    <!-- the tie, hanging off the top rail -->
    <path d="M352 566 l7 -3 l7 3 l-3 8 h-8 z" fill="#5d1b25"/>
    <path d="M355 574 h8 l5 74 l-9 10 l-9 -10 z" fill="#6d1f2a"/>
    <path d="M354 590 l12 -8 M353 606 l14 -9 M352 622 l16 -10 M352 638 l16 -10" stroke="#c9b27a" stroke-width="2" opacity="0.8"/>
  </g>

  <!-- white school tennis shoes, kicked off by the dresser -->
  <g class="shoes">
    <ellipse cx="1022" cy="756" rx="78" ry="7" fill="#000" opacity="0.16"/>
    <path d="M958 750 Q 956 734 972 730 L 1000 722 Q 1012 718 1022 728 L 1030 738 Q 1040 742 1040 750 Z" fill="#ecebe6"/>
    <path d="M956 750 H 1041 V 756 H 956 Z" fill="#c4a578"/>
    <path d="M984 726 L 1004 738 M 990 723 L 1010 736 M 996 721 L 1014 733" stroke="#b9b6ad" stroke-width="2"/>
    <path d="M962 744 Q 998 740 1034 746" stroke="#2f5da8" stroke-width="3" fill="none"/>
    <!-- the other one, on its side, sole to us -->
    <path d="M1046 760 Q 1040 742 1058 736 H 1094 Q 1108 738 1106 752 Q 1104 762 1090 762 H 1056 Q 1048 762 1046 760 Z" fill="#c4a578"/>
    <path d="M1056 742 H 1094 M 1054 750 H 1098 M 1056 757 H 1092" stroke="#a88c62" stroke-width="2"/>
    <path d="M1060 736 Q 1072 726 1090 730 L 1094 736 Z" fill="#ecebe6"/>
  </g>

  <!-- the school backpack (morral), dropped under the window -->
  <g class="backpack" transform="translate(716 598)">
    <ellipse cx="62" cy="106" rx="70" ry="8" fill="#000" opacity="0.18"/>
    <path d="M14 104 C 4 60 10 20 40 8 H 86 C 114 20 122 60 112 104 Z" fill="#26375e"/>
    <path d="M40 8 C 44 -10 82 -10 86 8" stroke="#1b2743" stroke-width="7" fill="none"/>
    <path d="M22 70 H 104 V 100 Q 62 108 22 100Z" fill="#2e4372"/>
    <path d="M22 70 H 104" stroke="#c9b27a" stroke-width="2" stroke-dasharray="3 2"/>
    <rect x="56" y="62" width="14" height="6" rx="2" fill="#c9b27a"/>
    <path d="M18 40 C 30 30 50 28 62 30" stroke="#1b2743" stroke-width="3" fill="none"/>
    <circle cx="92" cy="40" r="9" fill="#e6c02a"/><path d="M88 38 h2 M94 38 h2 M87 43 q5 4 10 0" stroke="#3a2a0a" stroke-width="1.6" fill="none"/>
    <path d="M32 30 L 50 24 L 54 36 L 36 42Z" fill="#d6563f" opacity="0.9"/>
  </g>

  <!-- dresser with the TV on a crocheted doily -->
  <g class="dresser">
    <rect x="1076" y="474" width="298" height="14" fill="${P.woodLight}"/>
    <rect x="1084" y="488" width="282" height="198" fill="${P.wood}" filter="url(#tex-wood)"/>
    ${[498, 562, 626]
      .map(
        (y) => `<rect x="1096" y="${y}" width="258" height="54" fill="${P.woodLight}" opacity="0.45"/>
      <circle cx="1170" cy="${y + 27}" r="6" fill="#3f2a1a"/><circle cx="1280" cy="${y + 27}" r="6" fill="#3f2a1a"/>`,
      )
      .join('')}
    <rect x="1090" y="686" width="14" height="14" fill="${P.woodDark}"/><rect x="1346" y="686" width="14" height="14" fill="${P.woodDark}"/>
  </g>
  <g class="doily">
    <path d="M1096 470 H1352 V482 ${Array.from({ length: 16 }, () => `a 8 8 0 0 1 -16 0`).join(' ')} Z" fill="#f4f1e8"/>
    <path d="M1100 476 H1348" stroke="#d8d2c2" stroke-width="1" stroke-dasharray="3 3"/>
  </g>

  <!-- the TV: a small color set with knobs, rabbit ears with foil on the tips -->
  <g class="hot" data-hot="tv">
    <rect x="1090" y="130" width="250" height="345" fill="transparent"/>
    <path class="ear-l" d="M1210 300 L 1150 150" stroke="#8d9296" stroke-width="3"/>
    <path class="ear-r" d="M1214 300 L 1290 138" stroke="#8d9296" stroke-width="3"/>
    <path class="foil-l" d="M1142 142 l 10 -4 l 6 6 l -2 10 l -10 2 l -6 -6z" fill="#cfd3d6"/>
    <path class="foil-r" d="M1286 130 l 10 -2 l 5 7 l -3 9 l -10 1 l -5 -7z" fill="#d7dbde"/>
    <ellipse cx="1212" cy="302" rx="22" ry="9" fill="#2a2b2d"/>
    <rect x="1098" y="304" width="228" height="170" rx="10" fill="${P.tvBody}"/>
    <rect x="1098" y="304" width="228" height="12" rx="6" fill="${P.tvBodyLight}"/>
    <rect x="1107" y="315" width="154" height="126" rx="16" fill="#1e1f20"/>
    <rect class="tv-screen-off" x="${ROOM.tvScreen.x}" y="${ROOM.tvScreen.y}" width="${ROOM.tvScreen.w}" height="${ROOM.tvScreen.h}" rx="12" fill="url(#screen-off)"/>
    <path d="M1124 330 q 30 -6 60 2" stroke="#fff" stroke-opacity="0.12" stroke-width="5" fill="none"/>
    <rect x="1268" y="318" width="50" height="146" rx="4" fill="#3b3733"/>
    <circle cx="1293" cy="346" r="15" fill="#2a2725"/><circle cx="1293" cy="346" r="15" fill="none" stroke="#6b6560" stroke-width="2"/>
    <rect class="tv-knob-mark" x="1292" y="333" width="3" height="10" fill="#d9d4cc"/>
    <circle cx="1293" cy="388" r="10" fill="#2a2725"/><circle cx="1293" cy="388" r="10" fill="none" stroke="#6b6560" stroke-width="2"/>
    <rect x="1280" y="410" width="26" height="12" rx="2" fill="#1f1d1b"/>
    <circle class="tv-led" cx="1311" cy="416" r="2.5" fill="#3a1410"/>
    ${[432, 440, 448, 456].map((y) => `<rect x="1277" y="${y}" width="32" height="3" fill="#1f1d1b"/>`).join('')}
    <text x="1184" y="458" text-anchor="middle" font-family="Anton, sans-serif" font-size="9" fill="#a39c94" letter-spacing="2">COLOR</text>
  </g>

  <!-- alarm clock: two bells and a handle (its hands keep the afternoon's time) -->
  <g class="hot" data-hot="clock">
  <rect x="${ROOM.clock.cx - 24}" y="${ROOM.clock.cy - 26}" width="48" height="54" fill="transparent"/>
  <g class="alarm-clock" transform="translate(${ROOM.clock.cx} ${ROOM.clock.cy})">
    <circle cx="-9" cy="-14" r="6" fill="#b8bcbe"/><circle cx="9" cy="-14" r="6" fill="#b8bcbe"/>
    <path d="M-8 18 l -4 5 M8 18 l 4 5" stroke="#555" stroke-width="3"/>
    <circle r="${ROOM.clock.r + 3}" fill="#a42c25"/>
    <circle r="${ROOM.clock.r}" fill="#f2ede0"/>
    <line class="hand-h" x1="0" y1="0" x2="0" y2="-7" stroke="#222" stroke-width="2" stroke-linecap="round"/>
    <line class="hand-m" x1="0" y1="0" x2="0" y2="-10.5" stroke="#222" stroke-width="1.4" stroke-linecap="round"/>
    <circle r="1.4" fill="#222"/>
  </g>
  </g>

  <!-- the Colombia pennant -->
  <g transform="translate(1316 150) rotate(-6)">
    <path d="M0 0 L 0 58 L 96 29Z" fill="#f2c200"/>
    <path d="M0 29 L 0 44 L 47 36.5 L 47 21.5Z" fill="#1d3f8f" opacity="0"/>
    <path d="M0 29 L 0 43.5 L 48 35 L 48 29Z" fill="#1d3f8f"/>
    <path d="M0 43.5 L 0 58 L 48 35Z" fill="#c8102e"/>
    <rect x="-5" y="-2" width="7" height="62" fill="#6b4a2e"/>
    <text x="22" y="24" font-family="Anton, sans-serif" font-size="10" fill="#1d3f8f">COLOMBIA</text>
  </g>

  <!-- light switch -->
  <g class="hot" data-hot="switch">
    <rect x="1377" y="356" width="24" height="36" rx="3" fill="#ece6d6" stroke="#bdb5a3"/>
    <rect class="switch-toggle" x="1386" y="366" width="6" height="10" rx="2" fill="#cfc6b2"/>
  </g>

  <!-- the doorway: the door is ajar, the hallway is dark -->
  <rect x="1412" y="76" width="200" height="634" fill="${P.woodDark}"/>
  <rect x="1428" y="92" width="200" height="618" fill="#1a1612"/>
  <path d="M1428 92 L 1470 92 L 1470 710 L 1428 710Z" fill="#2a221b"/>
  <path d="M1470 100 L 1600 60 L 1600 750 L 1470 704Z" fill="${P.woodLight}" filter="url(#tex-wood)"/>
  <path d="M1486 140 L 1580 116 L 1580 360 L 1486 372Z M1486 420 L 1580 412 L 1580 670 L 1486 660Z" fill="none" stroke="${P.woodDark}" stroke-width="4" opacity="0.6"/>
  <circle cx="1494" cy="410" r="7" fill="#c9a352"/>
  <path d="M1432 700 L 1470 696" stroke="#e7d9b5" stroke-width="2" opacity="0.25"/>
</svg>`;
}

/** The carpet (behind the phone and the bed). */
export function floorSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" class="room-svg">
  <defs>
    <filter id="tex-carpet" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="in" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
    </filter>
    <radialGradient id="floor-light" cx="0.48" cy="0.1" r="0.6">
      <stop offset="0" stop-color="#fff" stop-opacity="0.13"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="706" width="1600" height="194" fill="${P.carpet}" filter="url(#tex-carpet)"/>
  <rect x="0" y="706" width="1600" height="194" fill="url(#floor-light)"/>
  <rect x="0" y="706" width="1600" height="10" fill="#000" opacity="0.12"/>
</svg>`;
}

/** The phone on the floor by the door, its cord running out to the hallway. */
export function phoneSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" class="room-svg">
  <path d="M1452 708 C 1440 730 1470 752 1436 770 C 1410 784 1420 800 1398 806" stroke="#2c2620" stroke-width="3" fill="none"/>
  <g class="hot" data-hot="phone">
    <rect x="${ROOM.phone.x}" y="${ROOM.phone.y}" width="${ROOM.phone.w}" height="${ROOM.phone.h}" fill="transparent"/>
    <!-- the libreta -->
    <g transform="translate(1184 800) rotate(-8)">
      <rect width="92" height="54" rx="3" fill="#6e2a24"/>
      <rect x="4" y="3" width="84" height="48" rx="2" fill="none" stroke="#c9a352" stroke-width="1" opacity="0.7"/>
      <text x="46" y="32" text-anchor="middle" font-family="'Special Elite', monospace" font-size="10" fill="#d8b866">TELÉFONOS</text>
      <rect x="88" y="4" width="6" height="46" fill="#e8dfc8"/>
    </g>
    <!-- the phone -->
    <ellipse cx="1350" cy="834" rx="82" ry="14" fill="#000" opacity="0.18"/>
    <path d="M1282 830 L 1296 776 Q 1300 762 1316 762 H 1386 Q 1402 762 1406 776 L 1420 830 Z" fill="${P.ivory}"/>
    <path d="M1282 830 H 1420" stroke="${P.ivoryDark}" stroke-width="6"/>
    <circle cx="1351" cy="806" r="21" fill="${P.ivoryDark}"/>
    <circle class="dial-plate" cx="1351" cy="806" r="18" fill="#d7ccb2" stroke="#b3a585" stroke-width="1"/>
    ${Array.from({ length: 10 }, (_, i) => {
      const a = ((-60 - i * 30) * Math.PI) / 180;
      return `<circle cx="${1351 + Math.cos(a) * 12}" cy="${806 + Math.sin(a) * 12}" r="3" fill="#8f8266"/>`;
    }).join('')}
    <circle cx="1351" cy="806" r="6" fill="#efe8d6"/>
    <g class="handset-off">
      <path d="M1206 858 Q 1200 842 1216 838 H 1300 Q 1316 840 1312 856 L 1302 862 Q 1298 852 1288 852 H 1226 Q 1216 852 1212 862 Z" fill="#ebe1c8" transform="rotate(-8 1260 850)"/>
    </g>
    <g class="handset-on-cradle">
      <path d="M1294 768 Q 1290 752 1306 750 H 1396 Q 1412 752 1408 768 L 1398 772 Q 1394 764 1384 764 H 1318 Q 1308 764 1304 772 Z" fill="#ebe1c8"/>
      <ellipse cx="1302" cy="764" rx="16" ry="9" fill="#e6dbc0"/>
      <ellipse cx="1400" cy="764" rx="16" ry="9" fill="#e6dbc0"/>
    </g>
    <path d="M1286 800 C 1270 806 1276 818 1262 822 C 1250 826 1256 838 1244 842" stroke="#d8ccb0" stroke-width="4" fill="none" stroke-dasharray="3 2"/>
  </g>
</svg>`;
}

/** The foot of the bed in the foreground, under the tiger blanket. */
export function bedSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" class="room-svg">
  <defs>
    <filter id="tex-fleece" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.3 0" result="a"/>
      <feComposite in="a" in2="SourceGraphic" operator="in" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
    </filter>
    <clipPath id="blanket-clip">
      <path d="M-20 770 C 120 752 300 748 470 760 C 540 766 600 778 640 800 L 668 920 H -20 Z"/>
    </clipPath>
  </defs>
  <rect x="-20" y="880" width="700" height="30" fill="#3d2a1c"/>
  <g clip-path="url(#blanket-clip)">
    <rect x="-20" y="740" width="700" height="180" fill="${P.tiger}" filter="url(#tex-fleece)"/>
    <path d="M-20 790 C 60 780 120 800 180 786 C 140 812 60 806 -20 820Z" fill="${P.tigerDark}"/>
    <path d="M40 840 C 110 818 170 836 240 816 C 200 852 120 856 40 860Z" fill="${P.tigerDark}"/>
    <path d="M230 772 C 280 790 330 772 380 786 C 336 806 280 800 230 800Z" fill="${P.tigerDark}"/>
    <path d="M300 850 C 360 826 420 846 480 826 C 450 862 380 866 300 872Z" fill="${P.tigerDark}"/>
    <path d="M430 776 C 480 794 520 784 572 800 C 530 814 480 808 430 800Z" fill="${P.tigerDark}"/>
    <path d="M520 860 C 560 842 600 850 650 838 C 630 870 580 876 520 882Z" fill="${P.tigerDark}"/>
    <path d="M110 760 C 150 776 190 770 220 762" stroke="${P.tigerLight}" stroke-width="10" fill="none" opacity="0.6"/>
    <!-- a glimpse of the tiger's face printed on the fleece -->
    <g transform="translate(640 812)">
      <ellipse cx="-40" cy="10" rx="30" ry="20" fill="${P.fleece}" opacity="0.9"/>
      <ellipse cx="-44" cy="6" rx="9" ry="6" fill="#d9b23a"/>
      <ellipse cx="-43" cy="6" rx="3" ry="5" fill="${P.tigerDark}"/>
    </g>
    <!-- nobody made the bed: the blanket's pulled askew and rucked up -->
    <path d="M60 812 C 120 796 180 818 250 800 M 150 846 C 210 828 260 850 330 834" stroke="${P.tigerLight}" stroke-width="7" fill="none" opacity="0.45"/>
  </g>
  <!-- the sheet showing where the blanket slid off -->
  <path d="M-20 770 C 40 762 90 760 130 762 C 120 776 70 788 -20 796 Z" fill="#ece6d6"/>
  <path d="M10 772 C 40 770 70 772 104 768" stroke="#cfc6b2" stroke-width="2" fill="none"/>
  <path d="M-20 770 C 120 752 300 748 470 760 C 540 766 600 778 640 800" stroke="${P.tigerLight}" stroke-width="4" fill="none" opacity="0.5"/>

  <!-- homework on the bed: a spiral notebook, a pencil, and the Álgebra de Baldor on top -->
  <g transform="translate(372 806) rotate(-7)">
    <rect x="0" y="0" width="118" height="80" rx="3" fill="#2f6f9f"/>
    <rect x="80" y="10" width="26" height="18" rx="2" fill="#f2d24a" transform="rotate(8 93 19)"/>
    ${Array.from({ length: 9 }, (_, i) => `<circle cx="4" cy="${8 + i * 8}" r="2.4" fill="none" stroke="#c9ccce" stroke-width="1.5"/>`).join('')}
  </g>
  <path d="M362 874 L 452 858" stroke="#e8b923" stroke-width="7" stroke-linecap="round"/>
  <path d="M452 858 L 462 856" stroke="#e59aa0" stroke-width="7" stroke-linecap="round"/>
  <path d="M358 875 L 350 877" stroke="#3a3a3a" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(448 776) rotate(9)">
    <rect x="-3" y="4" width="126" height="92" rx="3" fill="#000" opacity="0.2"/>
    <rect x="0" y="0" width="120" height="90" rx="3" fill="#6f2a1d"/>
    <rect x="116" y="0" width="6" height="90" rx="2" fill="#efe7d4"/>
    <text x="58" y="20" text-anchor="middle" font-family="Anton, sans-serif" font-size="17" fill="#f0dfb0" letter-spacing="1">ÁLGEBRA</text>
    <!-- the man in the turban on the cover -->
    <ellipse cx="58" cy="44" rx="17" ry="10" fill="#ece3cc"/>
    <ellipse cx="58" cy="52" rx="10" ry="11" fill="#c8946a"/>
    <path d="M47 55 Q 58 76 69 55 Q 64 64 58 64 Q 52 64 47 55 Z" fill="#3a2418"/>
    <path d="M40 76 Q 58 66 76 76 V 82 H 40 Z" fill="#8d4a2a"/>
    <text x="58" y="87" text-anchor="middle" font-family="'Special Elite', monospace" font-size="8" fill="#f0dfb0" letter-spacing="1">BALDOR</text>
  </g>
</svg>`;
}
