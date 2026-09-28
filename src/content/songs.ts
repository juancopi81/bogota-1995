// The songs on the air. Titles only: the audio is a placeholder until you
// load your own file for a song in the backstage (it stays in your browser).

import type { Song } from '../broadcast/types';

export const SONGS: Song[] = [
  // Radioactiva 97.9 — rock en español (and some pop), the week El Dorado came out
  { id: 'bolero-falaz', title: 'Bolero falaz', artist: 'Aterciopelados', year: 1995, style: 'rock' },
  { id: 'florecita-rockera', title: 'Florecita rockera', artist: 'Aterciopelados', year: 1995, style: 'rock' },
  { id: 'ella-uso-mi-cabeza', title: 'Ella usó mi cabeza como un revólver', artist: 'Soda Stereo', year: 1995, style: 'rock' },
  { id: 'matador', title: 'Matador', artist: 'Los Fabulosos Cadillacs', year: 1993, style: 'rock' },
  { id: 'la-ingrata', title: 'La ingrata', artist: 'Café Tacvba', year: 1994, style: 'rock' },
  { id: 'lamento-boliviano', title: 'Lamento boliviano', artist: 'Enanitos Verdes', year: 1994, style: 'rock' },
  { id: 'afuera', title: 'Afuera', artist: 'Caifanes', year: 1994, style: 'rock' },

  // Súper Estación 88.9 — pop, in Spanish and English
  { id: 'estoy-aqui', title: 'Estoy aquí', artist: 'Shakira', year: 1995, style: 'pop' },
  { id: 'donde-jugaran', title: '¿Dónde jugarán los niños?', artist: 'Maná', year: 1992, style: 'pop' },
  { id: 'zombie', title: 'Zombie', artist: 'The Cranberries', year: 1994, style: 'rock' },
  { id: 'kiss-from-a-rose', title: 'Kiss from a Rose', artist: 'Seal', year: 1994, style: 'balada' },
  { id: 'gangstas-paradise', title: "Gangsta's Paradise", artist: 'Coolio', year: 1995, style: 'pop' },

  // Tropicana 102.9 — vallenato, salsa, merengue
  { id: 'tierra-del-olvido', title: 'La tierra del olvido', artist: 'Carlos Vives', year: 1995, style: 'tropical' },
  { id: 'gota-fria', title: 'La gota fría', artist: 'Carlos Vives', year: 1993, style: 'tropical' },
  { id: 'cali-pachanguero', title: 'Cali pachanguero', artist: 'Grupo Niche', year: 1984, style: 'salsa' },
  { id: 'una-aventura', title: 'Una aventura', artist: 'Grupo Niche', year: 1989, style: 'salsa' },
  { id: 'rebelion', title: 'Rebelión', artist: 'Joe Arroyo', year: 1986, style: 'salsa' },
  { id: 'ojala-que-llueva-cafe', title: 'Ojalá que llueva café', artist: 'Juan Luis Guerra', year: 1989, style: 'tropical' },
];

const byId = new Map(SONGS.map((s) => [s.id, s]));

export function song(id: string): Song {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown song ${id}`);
  return s;
}

/** The songs you can ask for on the Radioactiva request line. */
export const REQUESTABLE = ['florecita-rockera', 'bolero-falaz', 'ella-uso-mi-cabeza', 'matador'];
