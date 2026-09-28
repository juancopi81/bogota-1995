// What's on the screen, drawn at 320×240 like a broadcast picture.
// Deliberately simple shapes: the tube, the snow and the scanlines do the rest.

import type { SceneId } from '../content/tv';

type Ctx = CanvasRenderingContext2D;

export const TV_W = 320;
export const TV_H = 240;

function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, font = 'Anton, Impact, sans-serif', align: CanvasTextAlign = 'center') {
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function face(ctx: Ctx, x: number, y: number, s: number, hair: string, skin: string, woman: boolean, talking: boolean, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // shoulders
  ctx.fillStyle = woman ? '#9e2230' : '#e9e4d8';
  ctx.beginPath();
  ctx.ellipse(0, 78, 58, 40, 0, Math.PI, 0);
  ctx.fill();
  // hair behind
  ctx.fillStyle = hair;
  if (woman) {
    ctx.beginPath();
    ctx.ellipse(0, 12, 34, 52, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // face
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 31, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-9, 24, 18, 22);
  // hair on top
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(0, -18, 26, woman ? 17 : 14, 0, Math.PI, 0);
  ctx.fill();
  // eyes, with a blink now and then
  const blink = Math.sin(t * 1.3 + x) > 0.97;
  ctx.fillStyle = '#1a1412';
  if (blink) {
    ctx.fillRect(-11, -3, 7, 1.5);
    ctx.fillRect(4, -3, 7, 1.5);
  } else {
    ctx.beginPath();
    ctx.ellipse(-8, -3, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -3, 2.6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // brows: furrowed, it's a telenovela
  ctx.strokeStyle = hair;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-13, -11);
  ctx.lineTo(-4, -9);
  ctx.moveTo(13, -11);
  ctx.lineTo(4, -9);
  ctx.stroke();
  if (!woman) {
    ctx.fillStyle = hair;
    ctx.fillRect(-9, 11, 18, 4); // the mustache
  }
  const open = talking ? 1.5 + Math.abs(Math.sin(t * 13)) * 3.5 : 1;
  ctx.fillStyle = woman ? '#8d1f2a' : '#5a2a22';
  ctx.beginPath();
  ctx.ellipse(0, 18, 6, open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hacienda(ctx: Ctx, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, TV_H);
  g.addColorStop(0, '#5b3b28');
  g.addColorStop(1, '#2e1d14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TV_W, TV_H);
  // a window with the night outside, and rain
  ctx.fillStyle = '#1b2640';
  ctx.fillRect(208, 30, 80, 110);
  ctx.strokeStyle = '#d9c9a8';
  ctx.lineWidth = 4;
  ctx.strokeRect(208, 30, 80, 110);
  ctx.beginPath();
  ctx.moveTo(248, 30);
  ctx.lineTo(248, 140);
  ctx.moveTo(208, 85);
  ctx.lineTo(288, 85);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,210,230,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const x = 210 + ((i * 37 + t * 60) % 78);
    const y = 32 + ((i * 53 + t * 140) % 100);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + 7);
    ctx.stroke();
  }
  // a lamp's warm pool
  const lamp = ctx.createRadialGradient(60, 70, 4, 60, 70, 110);
  lamp.addColorStop(0, 'rgba(255,200,120,0.55)');
  lamp.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.fillStyle = '#e8d7b0';
  ctx.beginPath();
  ctx.moveTo(48, 48);
  ctx.lineTo(72, 48);
  ctx.lineTo(80, 70);
  ctx.lineTo(40, 70);
  ctx.fill();
}

function productCard(ctx: Ctx, bg: string, fg: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) ctx.fillRect(0, i * 44, TV_W, 20);
  ctx.globalAlpha = 1;
}

export function drawScene(ctx: Ctx, scene: SceneId | 'anthem', t: number, speaking: number): void {
  switch (scene) {
    case 'presenta': {
      ctx.fillStyle = '#0a0d1c';
      ctx.fillRect(0, 0, TV_W, TV_H);
      const a = Math.min(1, t / 1.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#3f6e5a';
      ctx.beginPath();
      ctx.moveTo(110, 110);
      ctx.lineTo(140, 70);
      ctx.lineTo(160, 95);
      ctx.lineTo(180, 60);
      ctx.lineTo(210, 110);
      ctx.fill();
      text(ctx, 'PRODUCCIONES ANDINAS', 160, 132, 16, '#e8e1cf');
      text(ctx, 'presenta', 160, 152, 12, '#b9c4d0', "'Special Elite', monospace");
      if (t > 2.5) {
        ctx.globalAlpha = Math.min(1, (t - 2.5) / 1.5);
        text(ctx, 'Corazón de lluvia', 160, 196, 26, '#f2c46d', 'Caveat, cursive');
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'novela':
    case 'novela-close': {
      hacienda(ctx, t);
      const close = scene === 'novela-close';
      const zoom = 1 + Math.min(0.25, t * 0.012);
      ctx.save();
      ctx.translate(TV_W / 2, TV_H);
      ctx.scale(zoom, zoom);
      ctx.translate(-TV_W / 2, -TV_H);
      if (close) {
        // alternate close-ups by who is talking
        if (speaking % 2 === 0) face(ctx, 160, 120, 2.1, '#2a1a12', '#c89475', false, true, t);
        else face(ctx, 160, 120, 2.1, '#1a110c', '#d8a584', true, true, t);
      } else {
        face(ctx, 105, 150, 1.25, '#2a1a12', '#c89475', false, speaking % 2 === 1, t);
        face(ctx, 215, 146, 1.2, '#1a110c', '#d8a584', true, speaking % 2 === 0, t);
      }
      ctx.restore();
      break;
    }
    case 'bumper-uno': {
      const g = ctx.createLinearGradient(0, 0, 0, TV_H);
      g.addColorStop(0, '#0b2a6e');
      g.addColorStop(1, '#061234');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TV_W, TV_H);
      const sweep = ((t * 90) % 520) - 100;
      const s = ctx.createLinearGradient(sweep - 40, 0, sweep + 40, 0);
      s.addColorStop(0, 'rgba(255,255,255,0)');
      s.addColorStop(0.5, 'rgba(255,255,255,0.25)');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, TV_W, TV_H);
      text(ctx, 'CADENA UNO', 160, 110, 34, '#f3f1ea');
      text(ctx, 'canal 7 · Santa Fe de Bogotá', 160, 142, 11, '#b7c7e8', "'Special Elite', monospace");
      break;
    }
    case 'bumper-a': {
      ctx.fillStyle = '#b3261e';
      ctx.fillRect(0, 0, TV_W, TV_H);
      ctx.fillStyle = '#f2c200';
      ctx.beginPath();
      ctx.arc(160, 110, 56 + Math.sin(t * 3) * 3, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'A', 160, 112, 70, '#b3261e');
      text(ctx, 'CANAL A', 160, 196, 18, '#fff');
      break;
    }
    case 'bumper-tres': {
      ctx.fillStyle = '#e9e2cf';
      ctx.fillRect(0, 0, TV_W, TV_H);
      text(ctx, '3', 160, 100, 90, '#2d6a4f');
      text(ctx, 'CANAL 3', 160, 172, 18, '#2d6a4f');
      text(ctx, 'televisión educativa y cultural', 160, 194, 10, '#55615a', "'Special Elite', monospace");
      break;
    }
    case 'ad-chocolate': {
      productCard(ctx, '#6b3b22', '#a7663d');
      // a cup of hot chocolate, steaming, and a piece of cheese
      ctx.fillStyle = '#f0e9da';
      ctx.fillRect(110, 110, 80, 64);
      ctx.beginPath();
      ctx.ellipse(150, 110, 40, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a2e17';
      ctx.beginPath();
      ctx.ellipse(150, 110, 34, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const x0 = 135 + i * 15;
        for (let y = 0; y < 40; y += 2) ctx.lineTo(x0 + Math.sin(y * 0.2 + t * 3 + i) * 5, 100 - y);
        ctx.stroke();
      }
      ctx.fillStyle = '#f3e3a1';
      ctx.fillRect(206, 150, 44, 22);
      text(ctx, 'CHOCOLATE', 160, 34, 24, '#f7e6c4');
      text(ctx, 'LA SABANA', 160, 60, 20, '#f2c46d');
      text(ctx, '¡con queso, mejor!', 160, 206, 20, '#f7e6c4', 'Caveat, cursive');
      break;
    }
    case 'ad-blancor': {
      productCard(ctx, '#1e4e9c', '#4b8ad6');
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(118, 70, 84, 104);
      ctx.fillStyle = '#e03a2f';
      ctx.fillRect(118, 70, 84, 26);
      text(ctx, 'BLANCOR', 160, 84, 16, '#fff');
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 12; i++) {
        const bx = 60 + ((i * 53) % 210);
        const by = 200 - ((t * 30 + i * 37) % 180);
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, '¡Blanquita, como nueva!', 160, 206, 20, '#fff', 'Caveat, cursive');
      break;
    }
    case 'ad-casablanca': {
      productCard(ctx, '#f2ede2', '#d7cdb8');
      ctx.fillStyle = '#b3261e';
      ctx.fillRect(40, 60, 240, 90);
      text(ctx, 'ALMACENES', 160, 86, 18, '#fff');
      text(ctx, 'CASABLANCA', 160, 118, 32, '#fff');
      const pop = 1 + Math.max(0, Math.sin(t * 4)) * 0.12;
      ctx.save();
      ctx.translate(160, 190);
      ctx.scale(pop, pop);
      text(ctx, '¡ESTRENE!', 0, 0, 30, '#b3261e');
      ctx.restore();
      break;
    }
    case 'paramo': {
      const g = ctx.createLinearGradient(0, 0, 0, TV_H);
      g.addColorStop(0, '#9aa7ad');
      g.addColorStop(0.55, '#c3c8c2');
      g.addColorStop(1, '#6e7a52');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TV_W, TV_H);
      ctx.fillStyle = '#6b7a5a';
      ctx.beginPath();
      ctx.moveTo(0, 130);
      ctx.quadraticCurveTo(80, 90, 160, 120);
      ctx.quadraticCurveTo(250, 146, 320, 110);
      ctx.lineTo(320, 240);
      ctx.lineTo(0, 240);
      ctx.fill();
      ctx.fillStyle = '#7f7d4f';
      ctx.fillRect(0, 170, 320, 70);
      ctx.fillStyle = '#6a8aa0';
      ctx.beginPath();
      ctx.ellipse(230, 176, 60, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // frailejones: a woolly stem and a rosette of silver leaves
      const pan = (t * 2) % 30;
      for (let i = 0; i < 9; i++) {
        const x = ((i * 47 + 20 - pan) % 360) - 20;
        const h = 26 + (i % 3) * 14;
        const y = 205 - (i % 2) * 12;
        ctx.fillStyle = '#5e4a36';
        ctx.fillRect(x - 3, y - h, 6, h);
        ctx.fillStyle = '#c9cfb4';
        for (let l = 0; l < 7; l++) {
          ctx.save();
          ctx.translate(x, y - h);
          ctx.rotate(-Math.PI / 2 + (l - 3) * 0.42);
          ctx.beginPath();
          ctx.ellipse(8, 0, 9, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      // fog drifting
      for (let i = 0; i < 3; i++) {
        const fx = ((t * (6 + i * 3) + i * 120) % 480) - 160;
        const fog = ctx.createRadialGradient(fx, 120 + i * 18, 5, fx, 120 + i * 18, 120);
        fog.addColorStop(0, 'rgba(235,238,236,0.55)');
        fog.addColorStop(1, 'rgba(235,238,236,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, TV_W, TV_H);
      }
      break;
    }
    case 'musical': {
      const hue = (t * 20) % 360;
      ctx.fillStyle = `hsl(${hue}, 45%, 18%)`;
      ctx.fillRect(0, 0, TV_W, TV_H);
      for (let i = 0; i < 7; i++) {
        const x = 160 + Math.cos(t * (0.6 + i * 0.13) + i) * 110;
        const y = 120 + Math.sin(t * (0.8 + i * 0.11) + i * 2) * 70;
        ctx.fillStyle = `hsla(${(hue + i * 50) % 360}, 70%, 55%, 0.55)`;
        ctx.beginPath();
        ctx.arc(x, y, 18 + i * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // a band on a stage, in silhouette
      ctx.fillStyle = '#0d0d10';
      for (const [x, h] of [[90, 70], [160, 84], [230, 72]] as const) {
        ctx.beginPath();
        ctx.ellipse(x, 240 - h, 11, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 16, 250 - h, 32, h);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 12, 150, 22);
      text(ctx, 'SÁBADO MUSICAL', 75, 23, 13, '#f2c46d');
      break;
    }
  }
}

/** The flag for the anthem, waving. */
export function drawAnthem(ctx: Ctx, t: number): void {
  ctx.fillStyle = '#6f8fa8';
  ctx.fillRect(0, 0, TV_W, TV_H);
  const bands: [string, number, number][] = [
    ['#f2c200', 0, 0.5],
    ['#1d3f8f', 0.5, 0.75],
    ['#c8102e', 0.75, 1],
  ];
  const x0 = 40;
  const w = 240;
  const top = 50;
  const h = 140;
  for (let x = 0; x < w; x += 2) {
    const wave = Math.sin(x * 0.04 - t * 3) * 6 * (x / w);
    const shade = 0.85 + Math.sin(x * 0.04 - t * 3 + 1) * 0.15;
    for (const [color, a, b] of bands) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.fillRect(x0 + x, top + a * h + wave, 2, (b - a) * h + 0.5);
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade).toFixed(3)})`;
      ctx.fillRect(x0 + x, top + a * h + wave, 2, (b - a) * h + 0.5);
    }
  }
  ctx.fillStyle = '#4a3b2a';
  ctx.fillRect(x0 - 6, top - 6, 5, 190);
  text(ctx, 'Himno Nacional de la República de Colombia', 160, 214, 12, '#f5f2ea', "'Special Elite', monospace");
}
