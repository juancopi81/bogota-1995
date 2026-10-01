// What the test asks at the door and at the exit (see docs/test-plan.md).
// The three state-nostalgia items (Wildschut et al., 2006) sit among three
// ordinary mood items, asked the same way both times.

export interface Choice {
  id: string;
  label: string;
}

export interface Item {
  id: string;
  text: string;
  /** One of the three nostalgia items (the others are there to blend in). */
  nostalgia?: true;
}

export const LIVED: Choice[] = [
  { id: 'bogota', label: 'En Bogotá' },
  { id: 'colombia', label: 'En otra ciudad de Colombia' },
  { id: 'abroad', label: 'Fuera de Colombia' },
];

export const AGE: Choice[] = [
  { id: 'under10', label: 'Menos de 10' },
  { id: '10-14', label: '10 a 14' },
  { id: '15-19', label: '15 a 19' },
  { id: '20-24', label: '20 a 24' },
  { id: '25plus', label: '25 o más' },
  { id: 'unborn', label: 'No había nacido' },
];

export const MOOD: Item[] = [
  { id: 'tranquilo', text: 'Me siento tranquilo o tranquila.' },
  { id: 'nostalgico', text: 'Me siento bastante nostálgico o nostálgica.', nostalgia: true },
  { id: 'aburrido', text: 'Me siento aburrido o aburrida.' },
  { id: 'sentimientos', text: 'Tengo sentimientos de nostalgia.', nostalgia: true },
  { id: 'contento', text: 'Me siento contento o contenta.' },
  { id: 'ahora', text: 'Siento nostalgia en este momento.', nostalgia: true },
];

export const MOOD_ENDS = ['nada', 'totalmente'] as const;

export const TRIGGERS: Choice[] = [
  { id: 'radio', label: 'La radio' },
  { id: 'grabadora', label: 'La grabadora y el casete' },
  { id: 'telefono', label: 'El teléfono' },
  { id: 'tv', label: 'La televisión' },
  { id: 'ventana', label: 'La ventana y la calle' },
  { id: 'cuarto', label: 'Las cosas del cuarto' },
  { id: 'voces', label: 'Las voces' },
  { id: 'musica', label: 'La música' },
  { id: 'nada', label: 'Nada en particular' },
];

export const RETURN: Choice[] = [
  { id: 'si', label: 'Sí' },
  { id: 'talvez', label: 'Tal vez' },
  { id: 'no', label: 'No' },
];

/** Two items of the Southampton Nostalgia Scale, asked last. */
export const TRAIT: (Item & { ends: [string, string] })[] = [
  { id: 'often', text: 'En general, ¿qué tan seguido siente nostalgia?', ends: ['muy rara vez', 'muy seguido'] },
  { id: 'prone', text: '¿Qué tan propenso o propensa es a sentir nostalgia?', ends: ['nada', 'mucho'] },
];

/** The nostalgia score: the mean of the three nostalgia items, once all three are answered. */
export function nostalgiaScore(mood: Record<string, number>): number | null {
  const values = MOOD.filter((item) => item.nostalgia).map((item) => mood[item.id]);
  if (values.some((v) => typeof v !== 'number')) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}
