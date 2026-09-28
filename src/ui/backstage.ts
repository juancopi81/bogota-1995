// The backstage ("trastienda"): not part of the room. Load your own songs,
// the anthem and recorded voices (they stay in this browser), move the clock,
// erase the tape.

import { library } from '../audio/library';
import { voices } from '../audio/voices';
import { SONGS } from '../content/songs';
import { allLines } from '../content/lines';
import { clock, formatTime, at } from '../world/clock';
import { flags, setName } from '../world/flags';
import { bus } from '../world/bus';
import type { Deck } from '../objects/deck';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Guess which song a file is, from its name ("03 - Florecita Rockera.mp3"). */
export function matchSong(filename: string): string | null {
  const name = normalize(filename.replace(/\.[a-z0-9]+$/i, ''));
  let best: { id: string; score: number } | null = null;
  for (const s of SONGS) {
    const title = normalize(s.title);
    if (!title) continue;
    const score = name.includes(title) ? title.length + (name.includes(normalize(s.artist)) ? 5 : 0) : 0;
    if (score > 0 && (!best || score > best.score)) best = { id: s.id, score };
  }
  return best?.id ?? null;
}

export class Backstage {
  private el!: HTMLElement;
  private clockEl!: HTMLElement;

  constructor(
    private readonly ctx: AudioContext,
    private readonly deck: Deck,
  ) {}

  mount(): void {
    const toggle = document.createElement('button');
    toggle.id = 'backstage-toggle';
    toggle.title = 'Trastienda (tecla `)';
    toggle.textContent = '⚙';
    toggle.addEventListener('click', () => this.toggle());
    document.body.appendChild(toggle);

    this.el = document.createElement('div');
    this.el.id = 'backstage';
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === 'º') this.toggle();
      if (e.key === 'Escape' && this.el.classList.contains('open')) this.toggle();
    });
    bus.on('media:loaded', () => this.render());
    setInterval(() => {
      if (this.clockEl) this.clockEl.textContent = formatTime(clock.now());
    }, 1000);
    this.render();
  }

  toggle(): void {
    this.el.classList.toggle('open');
    if (this.el.classList.contains('open')) this.render();
  }

  private render(): void {
    const recorded = allLines().filter((l) => voices.has(l.id)).length;
    const total = allLines().length;
    this.el.innerHTML = `
      <h2>Trastienda</h2>
      <p>Esto no es parte del cuarto. Aquí carga sus propios archivos: se quedan en este navegador y no se suben a ninguna parte.</p>

      <h3>Canciones</h3>
      <p>Mientras no cargue la canción de verdad, suena un relleno. Puede cargar varias a la vez: se reconocen por el nombre del archivo.</p>
      <div class="row"><span><label class="file">Cargar varias…<input type="file" accept="audio/*" multiple data-bulk hidden></label></span><small class="bulk-result"></small></div>
      ${SONGS.map(
        (s) => `<div class="row"><span>${s.title}<br><small>${s.artist} · ${s.year}</small></span>
          <span>${library.isUploaded(s.id) ? `<span class="ok">✓ suyo</span> <button data-forget="${s.id}">Quitar</button>` : `<label class="file">Cargar<input type="file" accept="audio/*" data-song="${s.id}" hidden></label>`}</span></div>`,
      ).join('')}

      <h3>Himno Nacional</h3>
      <p>A las 6:00 p.m. todas las emisoras y canales pasan el himno. Cargue una grabación para que suene.</p>
      <div class="row"><span>Himno Nacional de la República de Colombia</span>
        <span>${library.anthem() ? `<span class="ok">✓</span> <button data-forget="anthem">Quitar</button>` : `<label class="file">Cargar<input type="file" accept="audio/*" data-song="anthem" hidden></label>`}</span></div>

      <h3>Voces</h3>
      <p>${recorded} de ${total} líneas tienen voz grabada. Nombre cada archivo con el código de la línea (ver <code>docs/voice-script.md</code>), por ejemplo <code>llamada.andres.hola.m4a</code>, y cárguelos todos juntos.</p>
      <div class="row"><label class="file">Cargar grabaciones…<input type="file" accept="audio/*" multiple data-voices hidden></label><small class="voice-result"></small></div>

      <h3>Reloj</h3>
      <div class="row"><span class="clock">${formatTime(clock.now())}</span>
        <span><button data-skip="60">+1 min</button> <button data-skip="300">+5 min</button> <button data-to="${at(17, 58)}">Ir a las 5:58</button></span></div>
      <div class="row"><span>Empezar la tarde otra vez</span><button data-restart>Volver a las 5:30</button></div>

      <h3>Casete</h3>
      <div class="row"><span>Borrar todo lo grabado en los casetes</span><button data-erase>Borrar</button></div>

      <h3>Su nombre</h3>
      <div class="row"><input type="text" value="${flags.name.replace(/"/g, '&quot;')}" data-name placeholder="como lo llaman en su casa" style="font:inherit;padding:5px;width:100%"></div>
    `;
    this.clockEl = this.el.querySelector('.clock')!;

    this.el.querySelectorAll<HTMLInputElement>('input[data-song]').forEach((input) =>
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) await library.upload(input.dataset.song!, await file.arrayBuffer());
        this.render();
      }),
    );
    this.el.querySelector<HTMLInputElement>('input[data-bulk]')!.addEventListener('change', async (e) => {
      const files = [...((e.target as HTMLInputElement).files ?? [])];
      const found: string[] = [];
      for (const file of files) {
        const id = matchSong(file.name);
        if (id && (await library.upload(id, await file.arrayBuffer()))) found.push(id);
      }
      this.render();
      this.el.querySelector('.bulk-result')!.textContent = `${found.length} de ${files.length} reconocidas`;
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-forget]').forEach((b) =>
      b.addEventListener('click', async () => {
        await library.forget(b.dataset.forget!);
        this.render();
      }),
    );
    this.el.querySelector<HTMLInputElement>('input[data-voices]')!.addEventListener('change', async (e) => {
      const files = [...((e.target as HTMLInputElement).files ?? [])];
      const ids = new Set(allLines().map((l) => l.id));
      let ok = 0;
      for (const file of files) {
        const id = file.name.replace(/\.[a-z0-9]+$/i, '');
        if (ids.has(id) && (await voices.add(this.ctx, id, await file.arrayBuffer()))) ok++;
      }
      this.render();
      this.el.querySelector('.voice-result')!.textContent = `${ok} de ${files.length} cargadas`;
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-skip]').forEach((b) =>
      b.addEventListener('click', () => clock.skip(Number(b.dataset.skip))),
    );
    this.el.querySelector<HTMLButtonElement>('button[data-to]')!.addEventListener('click', (e) => {
      const target = Number((e.target as HTMLButtonElement).dataset.to);
      const now = clock.now();
      if (target > now) clock.skip(target - now);
    });
    this.el.querySelector<HTMLButtonElement>('button[data-restart]')!.addEventListener('click', () => location.reload());
    this.el.querySelector<HTMLButtonElement>('button[data-erase]')!.addEventListener('click', async () => {
      if (confirm('¿Borrar todo lo grabado?')) await this.deck.eraseAll();
    });
    this.el.querySelector<HTMLInputElement>('input[data-name]')!.addEventListener('input', (e) => setName((e.target as HTMLInputElement).value));
  }
}
