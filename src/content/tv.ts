// Television, Saturday 28 October 1995, 5:30 p.m. Three channels reach
// Bogotá on VHF: Cadena Uno (7), Canal A (9) and Canal 3 (11), which becomes
// Señal Colombia in December. Everything else on the knob is snow.
//
// The programs and ads here are invented placeholders. Canal A airs the
// approved real clips (content/clips.ts) whenever this copy of the room can
// play them, and falls back to its invented programs when it can't.

import { lines, type Line } from './lines';
import type { Clip } from './clips';
import type { Style } from '../audio/music';

export type SceneId = 'novela' | 'novela-close' | 'bumper-uno' | 'presenta' | 'ad-chocolate' | 'ad-blancor' | 'ad-casablanca' | 'paramo' | 'bumper-tres' | 'musical' | 'bumper-a';

export type TvSegment =
  | { kind: 'scene'; scene: SceneId; lines: Line[]; bed?: Style; min?: number }
  | { kind: 'clip'; clip: Clip }
  | { kind: 'anthem' };

export interface ChannelDef {
  number: number;
  name: string;
  /** Rabbit-ear angles (degrees from vertical, left rod negative) that pull it in best. */
  ideal: [number, number];
  /** How strong the signal is in Chapinero to begin with (0–1). */
  strength: number;
  /** The invented running order. */
  program: TvSegment[];
  /** Airs the approved real clips instead, when they can play. */
  realClips?: boolean;
  /** Its running order with real ad breaks instead of the invented ads, when they can play. */
  realAds?: (ads: Clip[]) => TvSegment[];
  /** The channel's card: what's on screen while a real clip loads or after it ends. */
  card: SceneId;
}

/** Canal A with real clips: its card between each one. */
export function clipProgram(clips: Clip[]): TvSegment[] {
  return clips.flatMap((clip): TvSegment[] => [
    { kind: 'scene', scene: 'bumper-a', lines: [], min: 4 },
    { kind: 'clip', clip },
  ]);
}

const NOVELA = lines('tv.novela', {
  n1: ['tvNovela', '—Usted me mintió, Rodrigo. Todo este tiempo me mintió.'],
  n2: ['tvNovela', '—Déjeme explicarle, Maritza. No es lo que usted cree.'],
  n3: ['tvNovela', '—¿Y qué es lo que yo creo? ¡Que usted se va a casar con ella por la plata de la hacienda!'],
  n4: ['tvNovela', '—¡Yo a usted la quiero! ¡Siempre la he querido!'],
  n5: ['tvNovela', '—Pues demuéstrelo. Esta misma noche, delante de su mamá.'],
  n6: ['tvNovela', '—Maritza... si hago eso, mi mamá me deshereda.'],
  n7: ['tvNovela', '—Entonces quédese con su plata, Rodrigo. Y olvídese de mí.'],
  sigue: ['tvPresentador', '«Corazón de lluvia» continúa... después de estos mensajes.'],
  presenta: ['tvPresentador', 'Producciones Andinas presenta: «Corazón de lluvia».'],
});

const ADS = lines('tv.cunas', {
  chocolate: ['cunas', 'Chocolate La Sabana. El chocolate de las onces bogotanas... ¡con queso, mejor!'],
  blancor: ['cunas', '¿La camisa del colegio quedó gris? Detergente Blancor: ¡blanquita, como nueva!'],
  casablanca: ['cunas', 'Almacenes Casablanca: llegó la temporada de fin de año. ¡Estrene!'],
});

const TRES = lines('tv.canal3', {
  id: ['tvNarrador', 'Canal 3. Televisión educativa y cultural.'],
  p1: ['tvNarrador', 'El páramo: un ecosistema que solo existe en unos pocos lugares del mundo. Colombia tiene la mayor parte.'],
  p2: ['tvNarrador', 'El frailejón crece apenas un centímetro al año. Uno de un metro de alto puede tener cien años.'],
  p3: ['tvNarrador', 'De páramos como Chingaza, a pocos kilómetros de Bogotá, viene el agua que llega a las casas de la ciudad.'],
  p4: ['tvNarrador', 'Cuando baja la niebla, el páramo parece otro mundo. Aquí la lluvia se guarda, gota a gota.'],
});

const CANAL_A = lines('tv.canala', {
  hola: ['tvPresentador', '¡Bienvenidos a «Sábado Musical»! Hoy, los videos más pedidos de la semana.'],
  sigue: ['tvPresentador', 'Y seguimos con otro video que llegó directo de Buenos Aires...'],
  cierre: ['tvPresentador', 'Ya volvemos, después de comerciales. ¡No se vayan!'],
});

// Cadena Uno: «Corazón de lluvia», then the ads, then the channel's card
const UNO_NOVELA: TvSegment[] = [
  { kind: 'scene', scene: 'presenta', lines: [NOVELA.presenta], bed: 'balada', min: 6 },
  { kind: 'scene', scene: 'novela', lines: [NOVELA.n1, NOVELA.n2, NOVELA.n3], bed: 'balada' },
  { kind: 'scene', scene: 'novela-close', lines: [NOVELA.n4, NOVELA.n5], bed: 'balada' },
  { kind: 'scene', scene: 'novela', lines: [NOVELA.n6, NOVELA.n7, NOVELA.sigue], bed: 'balada' },
];
const UNO_CARD: TvSegment = { kind: 'scene', scene: 'bumper-uno', lines: [], min: 5 };

export const CHANNELS: ChannelDef[] = [
  {
    number: 7,
    name: 'Cadena Uno',
    ideal: [-34, 38],
    strength: 0.95,
    card: 'bumper-uno',
    program: [
      ...UNO_NOVELA,
      { kind: 'scene', scene: 'ad-chocolate', lines: [ADS.chocolate], bed: 'pop', min: 12 },
      { kind: 'scene', scene: 'ad-blancor', lines: [ADS.blancor], bed: 'pop', min: 12 },
      { kind: 'scene', scene: 'ad-casablanca', lines: [ADS.casablanca], bed: 'pop', min: 10 },
      UNO_CARD,
    ],
    // each round of the telenovela gets a different stretch of the real 1995 ads
    realAds: (ads) => ads.flatMap((clip): TvSegment[] => [...UNO_NOVELA, { kind: 'clip', clip }, UNO_CARD]),
  },
  {
    number: 9,
    name: 'Canal A',
    ideal: [-18, 58],
    strength: 0.8,
    card: 'bumper-a',
    realClips: true,
    program: [
      { kind: 'scene', scene: 'bumper-a', lines: [], min: 5 },
      { kind: 'scene', scene: 'musical', lines: [CANAL_A.hola], bed: 'rock', min: 60 },
      { kind: 'scene', scene: 'musical', lines: [CANAL_A.sigue], bed: 'pop', min: 60 },
      { kind: 'scene', scene: 'musical', lines: [CANAL_A.cierre], bed: 'rock', min: 12 },
      { kind: 'scene', scene: 'ad-casablanca', lines: [ADS.casablanca], bed: 'pop', min: 10 },
      { kind: 'scene', scene: 'ad-chocolate', lines: [ADS.chocolate], bed: 'pop', min: 12 },
    ],
  },
  {
    number: 11,
    name: 'Canal 3',
    ideal: [-62, 14],
    strength: 0.55,
    card: 'bumper-tres',
    program: [
      { kind: 'scene', scene: 'bumper-tres', lines: [TRES.id], min: 6 },
      { kind: 'scene', scene: 'paramo', lines: [TRES.p1, TRES.p2], bed: 'balada', min: 30 },
      { kind: 'scene', scene: 'paramo', lines: [TRES.p3, TRES.p4], bed: 'balada', min: 30 },
    ],
  },
];
