// Spoken lines.
//
// Everything anybody says in the room (on the radio, the TV, the phone, from
// the kitchen) is a Line with a stable id. v0 shows lines as subtitles. When a
// recording exists for a line id (loaded in the backstage), it plays instead,
// still with its subtitle. `npm run voices` turns this registry into the
// recording script in docs/voice-script.md.

export type Speaker =
  | 'mamaAndres'
  | 'andres'
  | 'papaCarolina'
  | 'carolina'
  | 'abuelita'
  | 'mama'
  | 'tia'
  | 'hora117'
  | 'equivocado'
  | 'negocio'
  | 'locutorRadioactiva'
  | 'cabinaRadioactiva'
  | 'locutorSuper'
  | 'locutorTropicana'
  | 'locutorRCN'
  | 'cunas'
  | 'tvNovela'
  | 'tvNarrador'
  | 'tvPresentador'
  | 'jugador';

export const SPEAKERS: Record<Speaker, { name: string; direction: string }> = {
  mamaAndres: { name: 'Mamá de Andrés', direction: 'A Bogotá mother in her forties. Polite, a bit guarded with callers she does not know.' },
  andres: { name: 'Andrés', direction: 'Fifteen, your best friend from school. Fast, relaxed, very rolo.' },
  papaCarolina: { name: 'Papá de Carolina', direction: 'Fifties, formal and dry. Guards the phone.' },
  carolina: { name: 'Carolina', direction: 'Fifteen, a classmate. Friendly, a little shy on the phone.' },
  abuelita: { name: 'Abuelita', direction: 'Seventies, warm, talks a lot, never wants to hang up.' },
  mama: { name: 'Mamá', direction: 'Your mother, heard from the kitchen or on the other extension.' },
  tia: { name: 'Tía Gloria', direction: 'Your aunt, on the phone with your mother.' },
  hora117: { name: '117 · Hora exacta', direction: 'A mature, serious recorded woman\'s voice.' },
  equivocado: { name: 'Número equivocado', direction: 'Assorted strangers: a señora, a señor.' },
  negocio: { name: 'Dependiente', direction: 'Whoever answers the phone at a shop: the pharmacy, the pizzería.' },
  locutorRadioactiva: { name: 'Locutor · Radioactiva', direction: 'Young FM rock DJ, energetic, talks over the intros.' },
  cabinaRadioactiva: { name: 'Cabina · Radioactiva', direction: 'Takes song requests on the phone, quick and busy.' },
  locutorSuper: { name: 'Locutor · Súper Estación', direction: 'Smooth pop FM voice.' },
  locutorTropicana: { name: 'Locutor · Tropicana', direction: 'Loud, happy tropical-radio voice.' },
  locutorRCN: { name: 'Locutor · RCN', direction: 'Formal AM news voice.' },
  cunas: { name: 'Cuñas (anuncios)', direction: 'Radio ad voices, bright and fast.' },
  tvNovela: { name: 'TV · Telenovela', direction: 'Melodramatic actors.' },
  tvNarrador: { name: 'TV · Narrador', direction: 'Calm documentary narrator.' },
  tvPresentador: { name: 'TV · Presentador', direction: 'Saturday TV host.' },
  jugador: { name: 'Usted', direction: 'What you say (never recorded; shown as your choice).' },
};

export interface Line {
  /** Stable id; a recording named after it replaces the subtitle-only version. */
  id: string;
  who: Speaker;
  text: string;
}

const registry = new Map<string, Line>();

/** Define a group of lines: `lines('llamada.andres', { hola: ['mamaAndres', '¿Aló?'] })`. */
export function lines<K extends string>(group: string, defs: Record<K, [Speaker, string]>): Record<K, Line> {
  const out = {} as Record<K, Line>;
  for (const key of Object.keys(defs) as K[]) {
    const [who, text] = defs[key];
    const line: Line = { id: `${group}.${key}`, who, text };
    registry.set(line.id, line);
    out[key] = line;
  }
  return out;
}

/** A line built at runtime (the time, a dedication...). Never recorded. */
export function dynamicLine(who: Speaker, text: string): Line {
  return { id: '', who, text };
}

export function allLines(): Line[] {
  return [...registry.values()];
}

/** Seconds it takes to say a line when there is no recording. */
export function estimateSpeech(text: string, pace = 14.5): number {
  const pauses = (text.match(/[.,;:!?¿¡…—]/g) ?? []).length * 0.12;
  return Math.max(1.1, 0.35 + text.length / pace + pauses);
}
