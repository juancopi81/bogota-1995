// The alarm clock up close: a red twin-bell wind-up despertador on the
// dresser, next to the TV's lace doily. Its alarm hand stays on six, set for
// school days.

export const FACE = { cx: 800, cy: 430, r: 206 };

export function clockSvg(): string {
  const { cx, cy, r } = FACE;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const hour = i % 5 === 0;
    return `<rect x="${cx - (hour ? 3 : 1.2)}" y="${cy - r + 10}" width="${hour ? 6 : 2.4}" height="${hour ? 22 : 11}" fill="#26241f" transform="rotate(${i * 6} ${cx} ${cy})"/>`;
  }).join('');
  const numerals = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const a = (n * Math.PI) / 6;
    const x = cx + Math.sin(a) * (r - 62);
    const y = cy - Math.cos(a) * (r - 62) + 17;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="Anton, sans-serif" font-size="46" fill="#26241f">${n}</text>`;
  }).join('');
  const bell = (x: number) => `
    <circle cx="${x}" cy="208" r="84" fill="url(#c-bell)"/>
    <path d="M${x - 70} 208 A70 70 0 0 1 ${x + 70} 208" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="6"/>
    <circle cx="${x}" cy="120" r="12" fill="#8f9498"/>`;
  return `<svg class="art" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="c-bell" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="#eef0f1"/><stop offset="0.6" stop-color="#a9aeb2"/><stop offset="1" stop-color="#6c7176"/>
    </radialGradient>
    <radialGradient id="c-case" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#cf4034"/><stop offset="1" stop-color="#7d1f19"/>
    </radialGradient>
    <radialGradient id="c-face" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" stop-color="#f6f2e7"/><stop offset="1" stop-color="#e2dac6"/>
    </radialGradient>
  </defs>

  <!-- the wall and the top of the dresser -->
  <rect width="1600" height="900" fill="#d6cdb8"/>
  <rect y="700" width="1600" height="200" fill="#8a5a3a"/>
  <rect y="700" width="1600" height="10" fill="#a06b46"/>
  <!-- the edge of the TV's doily -->
  <path d="M1180 700 H1600 V728 H1180 Z" fill="#ece6d8"/>
  ${Array.from({ length: 14 }, (_, i) => `<circle cx="${1196 + i * 30}" cy="728" r="15" fill="#ece6d8"/>`).join('')}
  <ellipse cx="800" cy="722" rx="270" ry="20" fill="#000" opacity="0.28"/>

  <!-- legs, bells, hammer and handle -->
  <path d="M672 600 L628 716 M928 600 L972 716" stroke="#2f3033" stroke-width="18" stroke-linecap="round"/>
  <path d="M704 176 Q800 70 896 176" stroke="#9aa0a4" stroke-width="14" fill="none" stroke-linecap="round"/>
  ${bell(640)}${bell(960)}
  <rect x="792" y="150" width="16" height="70" fill="#8f9498"/>
  <circle cx="800" cy="150" r="13" fill="#6c7176"/>

  <!-- the case, the chrome ring and the face -->
  <circle cx="${cx}" cy="${cy}" r="${r + 44}" fill="url(#c-case)"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 44}" fill="none" stroke="#5c1612" stroke-width="5"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 16}" fill="#c3c7ca"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#c-face)"/>
  ${ticks}
  ${numerals}
  <text x="${cx}" y="${cy + 78}" text-anchor="middle" font-family="'Special Elite', monospace" font-size="15" fill="#6d665a" letter-spacing="3">HONG KONG</text>

  <!-- the alarm hand, set for six -->
  <g transform="translate(${cx} ${cy}) rotate(180)"><path d="M-2.5 0 V-128 L0 -140 L2.5 -128 V0Z" fill="#c9a227"/></g>
  <!-- hands -->
  <g transform="translate(${cx} ${cy})">
    <g id="c-hour"><path d="M-10 22 L-5 -104 L0 -122 L5 -104 L10 22Z" fill="#1d1c1a"/></g>
    <g id="c-min"><path d="M-7 28 L-3.5 -160 L0 -180 L3.5 -160 L7 28Z" fill="#1d1c1a"/></g>
    <g id="c-sec"><path d="M-1.6 40 V-188 H1.6 V40Z" fill="#b8322a"/><circle cy="40" r="8" fill="#b8322a"/></g>
    <circle r="11" fill="#1d1c1a"/><circle r="4" fill="#c3c7ca"/>
  </g>
  <!-- the glass -->
  <path d="M${cx - 150} ${cy - 110} Q${cx - 80} ${cy - 185} ${cx + 30} ${cy - 192}" stroke="#fff" stroke-opacity="0.3" stroke-width="20" fill="none" stroke-linecap="round"/>
</svg>`;
}
