// The test's screens: consent, the questions at the door and at the exit,
// the thanks, and the note for phones. Drawn over the stage in the title
// card's colors. Keys typed here never reach the room (the phone would dial
// them).

import { AGE, LIVED, MOOD, MOOD_ENDS, RETURN, TRAIT, TRIGGERS, type Choice, type Item } from './questions';
import type { DoorAnswers, ExitAnswers } from './record';
import { caption, type SharedMemory } from './memories';

const CONTACT = import.meta.env.VITE_RESEARCH_CONTACT ?? '';

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function overlay(host: HTMLElement, html: string): HTMLElement {
  const el = document.createElement('div');
  el.id = 'research';
  el.innerHTML = `<div class="panel">${html}</div>`;
  for (const type of ['keydown', 'keyup'] as const) el.addEventListener(type, (e) => e.stopPropagation());
  // keep the focus here, so typing never reaches the room behind
  el.tabIndex = -1;
  host.appendChild(el);
  el.focus({ preventScroll: true });
  return el;
}

const choices = (q: string, list: Choice[], multi = false) =>
  `<div class="choices${multi ? ' multi' : ''}" data-q="${q}">${list.map((c) => `<button type="button" data-id="${c.id}">${c.label}</button>`).join('')}</div>`;

const scale = (q: string, ends: readonly [string, string]) =>
  `<div class="scale" data-q="${q}"><small>${ends[0]}</small>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" data-v="${n}">${n}</button>`).join('')}<small>${ends[1]}</small></div>`;

const likert = (q: string, items: Item[]) =>
  `<div class="likert">${items.map((item) => `<div class="item"><span>${item.text}</span>${scale(`${q}.${item.id}`, MOOD_ENDS)}</div>`).join('')}</div>`;

/** The buttons of one screen, and what has been picked so far. */
class Picks {
  readonly one: Record<string, string> = {};
  readonly many: Record<string, Set<string>> = {};
  readonly number: Record<string, number> = {};

  constructor(el: HTMLElement, onChange: () => void) {
    el.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('button');
      const group = button?.closest<HTMLElement>('[data-q]');
      if (!button || !group) return;
      const q = group.dataset.q!;
      if (button.dataset.v) {
        this.number[q] = Number(button.dataset.v);
        for (const b of group.querySelectorAll('button')) b.classList.toggle('on', b === button);
      } else if (group.classList.contains('multi')) {
        const set = (this.many[q] ??= new Set());
        const id = button.dataset.id!;
        if (set.has(id)) set.delete(id);
        else set.add(id);
        button.classList.toggle('on', set.has(id));
      } else {
        this.one[q] = button.dataset.id!;
        for (const b of group.querySelectorAll('button')) b.classList.toggle('on', b === button);
      }
      onChange();
    });
  }

  scores(q: string, items: Item[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const item of items) if (this.number[`${q}.${item.id}`]) out[item.id] = this.number[`${q}.${item.id}`];
    return out;
  }
}

/** Whether the visitor takes part. Either way, the room opens next. */
export function consent(host: HTMLElement): Promise<boolean> {
  const el = overlay(
    host,
    `<h2>Antes de entrar</h2>
    <p>Este cuarto es parte de un experimento sobre la nostalgia. Si participa, le haremos unas preguntas cortas en la puerta y al salir, y guardaremos lo que hace adentro: qué toca y por cuánto tiempo.</p>
    <p>Es anónimo: no le pedimos su nombre ni su correo, ni guardamos datos que lo identifiquen. Puede salir cuando quiera. Para participar debe ser mayor de 18 años.</p>
    <p>Al salir puede dejar un recuerdo. Solo si usted lo autoriza, y después de leerlo, podremos mostrarlo a otros visitantes, sin datos suyos.</p>
    <p class="fine">Un proyecto independiente y sin ánimo de lucro, sin relación con las emisoras, los canales ni las marcas que aparecen en el cuarto.${CONTACT ? ` Preguntas: ${escape(CONTACT)}.` : ''}</p>
    <div class="actions"><button type="button" class="primary" data-act="yes">Acepto, sigamos</button><button type="button" class="quiet" data-act="no">Entrar sin participar</button></div>`,
  );
  return new Promise((resolve) => {
    el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (!act) return;
      el.remove();
      resolve(act === 'yes');
    });
  });
}

export function door(host: HTMLElement): Promise<DoorAnswers> {
  const el = overlay(
    host,
    `<h2>En la puerta</h2>
    <div class="q">En 1995, ¿dónde vivía?</div>${choices('lived', LIVED)}
    <div class="q">¿Cuántos años tenía en 1995?</div>${choices('age', AGE)}
    <div class="q">Ahora mismo, ¿qué tan de acuerdo está con cada frase?</div>${likert('mood', MOOD)}
    <div class="actions"><button type="button" class="primary" data-act="enter" disabled>Entrar al cuarto</button><span class="hint">Responda todo para entrar.</span></div>`,
  );
  const enter = el.querySelector<HTMLButtonElement>('[data-act="enter"]')!;
  const complete = () => !!picks.one.lived && !!picks.one.age && MOOD.every((item) => picks.number[`mood.${item.id}`]);
  const picks = new Picks(el, () => (enter.disabled = !complete()));
  return new Promise((resolve) => {
    enter.addEventListener('click', () => {
      if (!complete()) return;
      el.remove();
      resolve({ lived: picks.one.lived, age: picks.one.age, mood: picks.scores('mood', MOOD) });
    });
  });
}

/**
 * The exit questions, in two short steps so nothing hides below the fold: the
 * six phrases (the measure), then the rest, all optional, on one screen with
 * "Enviar" at its end. `onMood` gets the six as soon as they're in. Null if the
 * visitor goes back into the room instead.
 */
export function exit(host: HTMLElement, reason: 'button' | '6pm', onMood: (mood: Record<string, number>) => void = () => undefined): Promise<ExitAnswers | null> {
  const back = '<button type="button" class="quiet" data-act="back">Volver al cuarto</button>';
  const el = overlay(
    host,
    `<section data-step="1">
      <h2>${reason === '6pm' ? 'Ya pasaron las seis. Se acabó la tarde.' : 'Antes de irse'} <span class="step">1 de 2</span></h2>
      <div class="q">Ahora mismo, ¿qué tan de acuerdo está con cada frase?</div>${likert('mood', MOOD)}
      <div class="actions"><button type="button" class="primary" data-act="next" disabled>Siguiente</button>${back}<span class="hint">Responda las seis frases para seguir.</span></div>
    </section>
    <section data-step="2" hidden>
      <h2>Antes de irse <span class="step">2 de 2</span></h2>
      <div class="q">¿El cuarto le trajo algún recuerdo? Si quiere, escríbalo aquí (sin nombres ni datos personales).</div>
      <textarea data-f="memory" rows="3" maxlength="2000"></textarea>
      <label class="share"><input type="checkbox" data-f="share"> Pueden mostrar mi recuerdo a otros visitantes, sin datos míos.</label>
      <div class="q">¿Qué se lo trajo? Puede marcar varias.</div>${choices('triggers', TRIGGERS, true)}
      <div class="likert rows">
        <div class="item"><span>¿Volvería a entrar a este cuarto?</span>${choices('return', RETURN)}</div>
        ${TRAIT.map((item) => `<div class="item"><span>${item.text}</span>${scale(`trait.${item.id}`, item.ends)}</div>`).join('')}
      </div>
      <div class="q">¿Algo no le sonó a 1995, o no funcionó?</div>
      <textarea data-f="feedback" rows="2" maxlength="1000"></textarea>
      <div class="actions"><button type="button" class="primary" data-act="send">Enviar</button>${back}<span class="hint">Todo esto es opcional. Al enviar podrá leer recuerdos que dejaron otros visitantes.</span></div>
    </section>`,
  );
  const next = el.querySelector<HTMLButtonElement>('[data-act="next"]')!;
  const complete = () => MOOD.every((item) => picks.number[`mood.${item.id}`]);
  const picks = new Picks(el, () => (next.disabled = !complete()));
  const text = (f: string) => el.querySelector<HTMLTextAreaElement>(`[data-f="${f}"]`)!.value;
  return new Promise((resolve) => {
    el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'back') {
        el.remove();
        resolve(null);
      } else if (act === 'next' && complete()) {
        onMood(picks.scores('mood', MOOD));
        el.querySelector<HTMLElement>('[data-step="1"]')!.hidden = true;
        el.querySelector<HTMLElement>('[data-step="2"]')!.hidden = false;
        el.querySelector('.panel')!.scrollTop = 0;
      } else if (act === 'send' && complete()) {
        el.remove();
        resolve({
          mood: picks.scores('mood', MOOD),
          memory: text('memory'),
          shareMemory: el.querySelector<HTMLInputElement>('[data-f="share"]')!.checked,
          triggers: [...(picks.many.triggers ?? [])],
          returnIntent: picks.one.return ?? null,
          trait: picks.scores('trait', TRAIT),
          feedback: text('feedback'),
        });
      }
    });
  });
}

/** How many memories show at a time. */
const NOTES = 3;

const note = (m: SharedMemory) => `<figure class="note"><blockquote>${escape(m.text)}</blockquote><figcaption>${escape(caption(m))}</figcaption></figure>`;

/** The thanks, and the memories other visitors left (once they arrive, if there are any). */
export function thanks(host: HTMLElement, memories: Promise<SharedMemory[]>, shared = false): Promise<void> {
  const el = overlay(
    host,
    `<h2>Gracias</h2>
    <p>Sus respuestas quedaron guardadas. Si quiere, vuelva al cuarto: la tarde sigue.</p>
    ${shared ? '<p class="fine">Cuando lo leamos, su recuerdo podrá aparecer aquí para otros visitantes.</p>' : ''}
    <div class="memories" hidden>
      <div class="q">Recuerdos que dejaron otros visitantes</div>
      <div class="notes"></div>
      <button type="button" class="quiet" data-act="more" hidden>Leer otros</button>
    </div>
    <div class="actions"><button type="button" class="primary" data-act="back">Volver al cuarto</button></div>`,
  );
  let from = 0;
  let list: SharedMemory[] = [];
  const show = () => {
    const box = el.querySelector<HTMLElement>('.memories')!;
    box.hidden = list.length === 0;
    const batch = list.slice(from, from + NOTES);
    el.querySelector('.notes')!.innerHTML = batch.map(note).join('');
    el.querySelector<HTMLElement>('[data-act="more"]')!.hidden = list.length <= NOTES;
  };
  void memories.then((found) => {
    list = found;
    show();
  });
  return new Promise((resolve) => {
    el.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'more') {
        from = from + NOTES >= list.length ? 0 : from + NOTES;
        show();
      } else if (act === 'back') {
        el.remove();
        resolve();
      }
    });
  });
}

/** Phones and tablets: the room needs a computer (and headphones). */
export function needsComputer(): boolean {
  const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return touchOnly || Math.min(screen.width, screen.height) < 600;
}

/** The note a phone gets instead of the room, with ways to send the link to a computer. */
export function phoneNote(onAnyway: () => void): void {
  const el = document.createElement('div');
  el.id = 'phone-note';
  el.innerHTML = `
    <div class="place">Bogotá</div>
    <div class="date">Sábado 28 de octubre de 1995 · 5:30 p.m.</div>
    <p>Este cuarto se abre en un computador, con audífonos.</p>
    <p>Mándese el enlace y ábralo allá:</p>
    <input readonly value="${escape(location.href)}">
    <div class="buttons">
      ${'share' in navigator ? '<button type="button" data-act="share">Enviar el enlace</button>' : ''}
      <button type="button" data-act="copy">Copiar el enlace</button>
    </div>
    <button type="button" class="quiet" data-act="anyway">Entrar de todos modos</button>`;
  el.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    const act = button?.dataset.act;
    if (act === 'share') void navigator.share({ title: 'Bogotá 1995', url: location.href }).catch(() => undefined);
    if (act === 'copy') {
      const input = el.querySelector('input')!;
      input.select();
      void navigator.clipboard
        ?.writeText(location.href)
        .then(() => (button!.textContent = 'Copiado'))
        .catch(() => undefined);
    }
    if (act === 'anyway') {
      el.remove();
      onAnyway();
    }
  });
  document.body.appendChild(el);
}
