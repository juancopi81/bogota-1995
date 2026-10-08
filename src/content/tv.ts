// Television, Saturday 28 October 1995, 5:30 p.m. Three channels reach
// Bogotá on VHF: Cadena Uno (7), Canal A (9) and Canal 3 (11), which becomes
// Señal Colombia in December. Everything else on the knob is snow.
//
// The programs and ads here are invented placeholders. When this copy of the
// room can play YouTube, Cadena Uno and Canal A air real 1995 programs in
// full from 5:30 (content/clips.ts), then real clips and ads; when it can't,
// they fall back to these.

import { lines, type Line } from './lines';
import { SCHEDULES, onSchedule, type Clip } from './clips';
import type { Style } from '../audio/music';

export type SceneId = 'novela' | 'novela-close' | 'bumper-uno' | 'presenta' | 'ad-chocolate' | 'ad-blancor' | 'ad-casablanca' | 'paramo' | 'bumper-tres' | 'musical' | 'bumper-a';

export type TvSegment =
  | { kind: 'scene'; scene: SceneId; lines: Line[]; bed?: Style; min?: number }
  | { kind: 'clip'; clip: Clip; /** Its place in the channel's timetable. */ entry?: number }
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
  /** Real programs in full from 5:30 on, back to back, when they can play (content/clips.ts). */
  schedule?: Clip[];
  /** The channel's card: what's on screen while a real clip loads or after it ends. */
  card: SceneId;
}

/**
 * What a channel's timetable airs from `start` until its next program, when
 * real programs can play: its card before 5:30, the program (from however far
 * in it is), or the card for what's left of a program whose video ran out
 * early. Null where there's no timetable, once it's over, or where YouTube
 * refused that program, so the usual running order fills in (and the next
 * program still comes on at its time). The anthem (from `anthemAt`, `anthem`
 * seconds long) pauses it.
 */
export function timetable(
  def: ChannelDef,
  start: number,
  anthemAt: number,
  anthem: number,
  usable: (clip: Clip) => boolean,
  ended: ReadonlySet<number>,
): TvSegment | null {
  if (!def.schedule?.length) return null;
  if (start < 0) return { kind: 'scene', scene: def.card, lines: [], min: -start };
  const on = onSchedule(def.schedule, start, anthemAt, anthem);
  if (!on || !usable(on.clip)) return null;
  if (ended.has(on.index)) return { kind: 'scene', scene: def.card, lines: [], min: on.clip.dur };
  return { kind: 'clip', clip: on.clip, entry: on.index };
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
    schedule: SCHEDULES[7],
  },
  {
    number: 9,
    name: 'Canal A',
    ideal: [-18, 58],
    strength: 0.8,
    card: 'bumper-a',
    realClips: true,
    schedule: SCHEDULES[9],
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
