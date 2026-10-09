// The rest of the apartment, heard through the door: your mother in the
// kitchen calling out.

import { lines, type Line } from '../content/lines';
import { lineDuration, speak } from '../audio/voices';
import type { AudioEngine } from '../audio/engine';
import { play } from '../audio/sfx';
import { subtitles } from '../ui/subtitles';

export const MAMA = lines('casa', {
  contesten: ['mama', '¡Contesten ese teléfono!'],
  telefono: ['mama', '¡Teléfono! ¡Es Andrés!'],
  noContesta: ['mama', 'Ay, no sé dónde se metió... Yo le digo que te llame, Andrés.'],
  onces: ['mama', '¡A tomar onces! ¡Hay chocolate con almojábanas!'],
  volumen: ['mama', '¡Bájele a ese radio, que no oigo ni lo que pienso!'],
  volumenTv: ['mama', '¡Bájele a ese televisor!'],
});

let engine: AudioEngine | null = null;
let clearTimer = 0;

export function mountHouse(e: AudioEngine): void {
  engine = e;
}

/** Your mother says something from the kitchen. */
export function mamaSays(line: Line): number {
  const dur = lineDuration(line, 13);
  const e = engine;
  if (e) speak(e.ctx, line.id, (buffer, offset) => play(e.ctx, buffer, e.channel('house').input, { gain: 1.1, offset }));
  subtitles.set('house', { label: 'Desde la cocina', line });
  clearTimeout(clearTimer);
  clearTimer = window.setTimeout(() => subtitles.set('house', null), dur * 1000 + 400);
  return dur;
}
