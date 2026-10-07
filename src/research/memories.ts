// The memories other visitors left on the way out, for the thanks screen:
// only the ones they agreed to share and the researcher has read and
// approved in the sheet (see docs/research-setup.md). Without a sheet, in
// development, a few examples show what it will look like.

export interface SharedMemory {
  text: string;
  /** Their answers at the door (ids from questions.ts), for a line under the memory. */
  age: string;
  lived: string;
  /** An example shown in development, not a visitor's. */
  example?: boolean;
}

const MAX_TEXT = 600;

const AGE_AT: Record<string, string> = {
  under10: 'Tenía menos de 10 años en 1995',
  '10-14': 'Tenía de 10 a 14 años en 1995',
  '15-19': 'Tenía de 15 a 19 años en 1995',
  '20-24': 'Tenía de 20 a 24 años en 1995',
  '25plus': 'Tenía 25 o más en 1995',
};
const LIVED_IN: Record<string, string> = { bogota: 'vivía en Bogotá', colombia: 'vivía en otra ciudad de Colombia', abroad: 'vivía fuera de Colombia' };

/** "Tenía de 15 a 19 años en 1995, vivía en Bogotá". */
export function caption(m: SharedMemory): string {
  if (m.example) return 'Ejemplo: aquí aparecen los recuerdos que usted apruebe en la hoja';
  if (m.age === 'unborn') return 'No había nacido en 1995';
  return [AGE_AT[m.age], LIVED_IN[m.lived]].filter(Boolean).join(', ');
}

/** What the sheet answered, checked: a list of memories with text, or nothing. */
export function parseMemories(data: unknown): SharedMemory[] {
  const list = (data as { memories?: unknown } | null)?.memories;
  if (!Array.isArray(list)) return [];
  const out: SharedMemory[] = [];
  for (const item of list) {
    const m = item as Record<string, unknown> | null;
    const text = typeof m?.text === 'string' ? m.text.trim() : '';
    if (!text) continue;
    out.push({ text: text.slice(0, MAX_TEXT), age: String(m?.age ?? ''), lived: String(m?.lived ?? '') });
    if (out.length >= 40) break;
  }
  return out;
}

/** Asks the sheet for the approved memories. Nothing if it can't be reached, is slow, or isn't set up for it yet. */
export async function fetchMemories(url: string, timeoutMs = 8000): Promise<SharedMemory[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}recuerdos=1`, { signal: ctrl.signal });
    if (!res.ok) return [];
    return parseMemories(await res.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Made-up examples for development, so the thanks screen can be seen without a sheet. */
export const EXAMPLES: SharedMemory[] = [
  { text: 'Los sábados grabábamos canciones de la radio con mi hermana, peleando por quién le daba a REC antes de que hablara el locutor.', age: '', lived: '', example: true },
  { text: 'El teléfono de disco en el corredor, y mi mamá gritando que colgara porque iba a llamar mi papá.', age: '', lived: '', example: true },
  { text: 'Mirar llover por la ventana esperando que pasara la buseta. Olía a pan de la panadería de la esquina.', age: '', lived: '', example: true },
];
