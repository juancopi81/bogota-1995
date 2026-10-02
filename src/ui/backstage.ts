// The backstage ("trastienda"): not part of the room. Load your own songs,
// the anthem and recorded voices (they stay in this browser), move the clock,
// erase the tape.
//
// Loading is one gesture: drop a folder (or a pile of files) anywhere, or pick
// one. Each file is recognized by its tags, its name or its folder; whatever
// can't be placed is listed so you can say what it is. A song list (a CSV)
// in the folder says exactly which file is which, and where the room differs
// from it.

import { library } from '../audio/library';
import { voices } from '../audio/voices';
import { tagsOfFile } from '../audio/tags';
import { isAudioName, plan, type Candidate, type Target } from '../audio/matching';
import { checkManifest, readManifest, type ManifestCheck } from '../audio/manifest';
import { SONGS, REQUESTABLE, song } from '../content/songs';
import { HOUSE_ANTHEM, HOUSE_MUSIC } from '../content/housemusic';
import { STATIONS } from '../content/stations';
import { allLines, SPEAKERS, type Speaker } from '../content/lines';
import { clock, formatTime, at } from '../world/clock';
import { flags, setName } from '../world/flags';
import { bus } from '../world/bus';
import type { Deck } from '../objects/deck';

interface Picked extends Candidate {
  file: File;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A song list exported from a spreadsheet. */
const isList = (f: File) => /\.(csv|tsv)$/i.test(f.name) || f.type === 'text/csv';
/** What the backstage takes from a drop: audio, and song lists. */
const wanted = (f: File) => isAudioName(f.name) || f.type.startsWith('audio/') || isList(f);

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

/** Every audio file in a drop, folders included (however deep). */
async function filesFromDrop(items: DataTransferItemList): Promise<Picked[]> {
  const out: Picked[] = [];
  // entries must be taken while the drop event is still running
  const entries = [...items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  const loose = entries.length ? [] : [...items].map((i) => i.getAsFile()).filter((f): f is File => !!f);
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      if (wanted(file)) out.push({ file, path: entry.fullPath.replace(/^\//, ''), tags: {} });
      return;
    }
    if (!entry.isDirectory) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const e of batch) await walk(e);
    }
  };
  for (const e of entries) await walk(e).catch(() => undefined);
  for (const file of loose) if (wanted(file)) out.push({ file, path: file.name, tags: {} });
  return out;
}

function filesFromInput(input: HTMLInputElement): Picked[] {
  return [...(input.files ?? [])]
    .filter(wanted)
    .map((file) => ({ file, path: file.webkitRelativePath || file.name, tags: {} }));
}

export class Backstage {
  private el!: HTMLElement;
  private clockEl!: HTMLElement;
  /** What the last load did (kept across re-renders). */
  private report = '';
  /** Files we couldn't place, waiting for you to say what they are. */
  private unknown: Picked[] = [];
  private busy = false;
  private eraseArmed = false;
  /** A quick listen to a loaded file, straight to the speakers (not through the room). */
  private preview: { id: string; src: AudioBufferSourceNode } | null = null;

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
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (e.key === '`' || e.key === 'º') this.toggle();
      if (e.key === 'Escape' && this.el.classList.contains('open')) this.toggle();
    });

    // drop files or a folder anywhere: the backstage opens and takes them
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    window.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
      if (!this.el.classList.contains('open')) this.toggle();
      this.el.classList.add('dropping');
    });
    window.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget) this.el.classList.remove('dropping');
    });
    window.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      this.el.classList.remove('dropping');
      const picked = filesFromDrop(e.dataTransfer!.items);
      void picked.then((files) => this.ingest(files));
    });

    bus.on('media:loaded', () => {
      if (!this.busy) this.render();
    });
    setInterval(() => {
      if (this.clockEl) this.clockEl.textContent = formatTime(clock.now());
    }, 1000);
    this.render();
  }

  toggle(): void {
    this.el.classList.toggle('open');
    if (this.el.classList.contains('open')) this.render();
  }

  // ---------- loading ----------

  private progress(text: string): void {
    const el = this.el.querySelector('.load-report');
    if (el) el.textContent = text;
  }

  /** Recognize a batch of files and load what can be placed. */
  private async ingest(picked: Picked[]): Promise<void> {
    if (this.busy) return;
    const lists = picked.filter((f) => isList(f.file));
    const files = picked.filter((f) => !isList(f.file));
    if (!files.length && !lists.length) {
      this.report = 'No encontré archivos de audio ahí.';
      this.render();
      return;
    }
    this.busy = true;
    this.render();
    try {
      // a song list in the folder says exactly what each file is
      let listed: Map<string, Target> | undefined;
      const listNotes: string[] = [];
      for (const l of lists) {
        const rows = readManifest(await l.file.text());
        if (!rows) continue;
        const check = checkManifest(rows, SONGS, STATIONS);
        listed = new Map([...(listed ?? []), ...check.files]);
        listNotes.push(this.describeList(l.path, rows.length, check));
      }
      for (let i = 0; i < files.length; i++) {
        if (i % 10 === 0) this.progress(`Revisando ${i + 1} de ${files.length}…`);
        files[i].tags = await tagsOfFile(files[i].file);
      }
      const lineIds = new Set(allLines().map((l) => l.id));
      const p = plan(files, SONGS, lineIds, listed);
      let songs = 0;
      let lines = 0;
      let anthem = false;
      const failed: string[] = [];
      for (let i = 0; i < p.load.length; i++) {
        const { file, match } = p.load[i];
        this.progress(`Cargando ${i + 1} de ${p.load.length}: ${this.describe(match.target)}…`);
        const ok = await this.load(match.target, file.file);
        if (!ok) failed.push(file.path);
        else if (match.target.kind === 'song') songs++;
        else if (match.target.kind === 'voice') lines++;
        else anthem = true;
      }
      const parts = [];
      if (songs) parts.push(`${songs} ${songs === 1 ? 'canción' : 'canciones'}`);
      if (anthem) parts.push('el himno');
      if (lines) parts.push(`${lines} ${lines === 1 ? 'voz' : 'voces'}`);
      const notes = [];
      if (p.duplicates.length) notes.push(`${p.duplicates.length} repetidos (me quedé con el más claro)`);
      if (failed.length) notes.push(`${failed.length} que el navegador no pudo leer: ${failed.map(escape).join(', ')}`);
      this.unknown = [...this.unknown, ...p.unknown];
      const loaded = files.length ? `${parts.length ? `Listo: ${parts.join(', ')}.` : 'No reconocí nada.'}${notes.length ? ` ${notes.join('. ')}.` : ''}` : '';
      this.report = [loaded, ...listNotes].filter(Boolean).join('<br>');
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async load(target: Target, file: File): Promise<boolean> {
    const data = await file.arrayBuffer();
    if (target.kind === 'voice') return voices.add(this.ctx, target.id, data);
    return library.upload(target.kind === 'anthem' ? 'anthem' : target.id, data);
  }

  private previewButton(id: string): string {
    const on = this.preview?.id === id;
    return `<button data-preview="${id}" title="${on ? 'Parar' : 'Oír unos segundos'}">${on ? '■' : '▶'}</button>`;
  }

  private async togglePreview(id: string): Promise<void> {
    const was = this.preview?.id;
    this.stopPreview();
    // your song, the anthem, or one of the house tracks ('house:<id>')
    const buffer = was === id ? undefined : id === 'anthem' ? library.anthem() : ((await library.whenAudio(id.startsWith('house:') ? id : `yours:${id}`)) ?? undefined);
    if (was !== id && buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.8;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
      src.stop(this.ctx.currentTime + 10);
      src.onended = () => {
        if (this.preview?.src !== src) return;
        this.preview = null;
        this.render();
      };
      this.preview = { id, src };
    }
    this.render();
  }

  private stopPreview(): void {
    const p = this.preview;
    this.preview = null;
    try {
      p?.src.stop();
    } catch {
      /* already over */
    }
  }

  /** What a song list says, next to what the room has. */
  private describeList(path: string, rows: number, check: ManifestCheck): string {
    const name = escape(path.split('/').pop() ?? path);
    if (!check.missing.length && !check.moved.length) return `Su lista <b>${name}</b> (${rows} filas) coincide con el cuarto.`;
    const out = [`Su lista <b>${name}</b> no coincide del todo con el cuarto:`];
    for (const r of check.missing) out.push(`· «${escape(r.title)}» (${escape(r.artist)}) no está en el cuarto.`);
    for (const m of check.moved) out.push(`· «${escape(m.row.title)}»: en su lista va en ${escape(m.listed)}; en el cuarto suena en ${escape(m.room.join(' y ') || 'ninguna')}.`);
    out.push('Si quiere el cuarto como su lista, pida el cambio.');
    return out.join('<br>');
  }

  private describe(t: Target): string {
    if (t.kind === 'anthem') return 'Himno Nacional';
    if (t.kind === 'voice') return t.id;
    return song(t.id).title;
  }

  // ---------- the panel ----------

  private render(): void {
    // don't pull the rug from under someone typing their name
    const typing = document.activeElement?.id === 'backstage-name' ? (document.activeElement as HTMLInputElement) : null;
    const caret = typing?.selectionStart ?? null;
    this.draw();
    if (typing) {
      const input = this.el.querySelector<HTMLInputElement>('#backstage-name')!;
      input.focus();
      if (caret !== null) input.setSelectionRange(caret, caret);
    }
  }

  private draw(): void {
    const spoken = allLines().filter((l) => l.who !== 'jugador');
    const recorded = spoken.filter((l) => voices.has(l.id)).length;
    const mine = SONGS.filter((s) => library.isUploaded(s.id)).length;

    // songs by station, each song once
    const shown = new Set<string>();
    // the station with the request line first: its songs matter most
    const stations = [...STATIONS].sort((a, b) => Number(!!b.requestLine) - Number(!!a.requestLine));
    const groups = stations.filter((s) => s.catalog.length).map((station) => {
      const ids = station.catalog.filter((id) => !shown.has(id));
      ids.forEach((id) => shown.add(id));
      return { label: station.label, ids };
    });
    const songRow = (id: string) => {
      const s = song(id);
      const requestable = REQUESTABLE.includes(id) ? ' <span class="tag" title="Se puede pedir en la cabina de Radioactiva">se puede pedir</span>' : '';
      const status = library.isUploaded(id)
        ? `<span class="ok">✓ suya</span> <small>${mmss(library.lengthOf(id) ?? 0)}</small> ${this.previewButton(id)} <button data-forget="${id}">Quitar</button>`
        : `<span class="muted">${library.houseLoaded.length ? 'suena la de la casa' : 'relleno'}</span> <label class="file">Cargar<input type="file" accept="audio/*" data-song="${id}" hidden></label>`;
      return `<div class="row"><span>${escape(s.title)}${requestable}<br><small>${escape(s.artist)} · ${s.year}</small></span><span>${status}</span></div>`;
    };

    // voices by who says them
    const byWho = new Map<Speaker, { done: number; total: number }>();
    for (const l of spoken) {
      const c = byWho.get(l.who) ?? { done: 0, total: 0 };
      c.total++;
      if (voices.has(l.id)) c.done++;
      byWho.set(l.who, c);
    }
    const chips = [...byWho]
      .map(([who, c]) => `<span class="chip${c.done === c.total ? ' full' : c.done ? ' some' : ''}">${escape(SPEAKERS[who].name)} ${c.done}/${c.total}</span>`)
      .join('');

    const options = [
      '<option value="">¿Qué es?</option>',
      ...SONGS.map((s) => `<option value="song:${s.id}">${escape(s.title)} — ${escape(s.artist)}${library.isUploaded(s.id) ? ' ✓' : ''}</option>`),
      '<option value="anthem">Himno Nacional</option>',
      '<option value="skip">No es nada de esto</option>',
    ].join('');
    const unknownRows = this.unknown
      .map((f, i) => `<div class="row"><span class="path">${escape(f.path)}${f.tags.title ? `<br><small>${escape(f.tags.title)}${f.tags.artist ? ` · ${escape(f.tags.artist)}` : ''}</small>` : ''}</span><select data-assign="${i}">${options}</select></div>`)
      .join('');
    const anthem = library.anthem();
    const ownAnthem = library.isUploaded('anthem');

    this.el.innerHTML = `
      <h2>Trastienda</h2>
      <p>Esto no es parte del cuarto. Aquí carga sus propios archivos: se quedan en este navegador y no se suben a ninguna parte.</p>

      <div class="drop">
        <strong>Arrastre aquí su música</strong>
        <span>Una carpeta entera sirve: las canciones, el himno y las voces se reconocen solas (por el título guardado en el archivo, el nombre o la carpeta).</span>
        <span class="pick">
          <label class="file">Elegir carpeta…<input type="file" data-folder hidden></label>
          <label class="file">Elegir archivos…<input type="file" accept="audio/*" multiple data-files hidden></label>
        </span>
        <small class="load-report" aria-live="polite">${this.busy ? 'Un momento…' : this.report}</small>
      </div>
      ${this.unknown.length ? `<h3>Sin reconocer (${this.unknown.length})</h3><p>Dígame qué es cada uno.</p>${unknownRows}` : ''}

      <h3>Canciones · ${mine} de ${SONGS.length} son suyas</h3>
      <p>Mientras no cargue la de verdad, en su puesto suena música de la casa (o un relleno con el mismo estilo, si no está).</p>
      ${groups.map((g) => `<h4>${escape(g.label)}</h4>${g.ids.map(songRow).join('')}`).join('')}

      <h3>Música de la casa</h3>
      <p>Canciones con licencia Creative Commons que vienen con el cuarto. No son de 1995: suenan en el puesto de las canciones que usted no ha cargado, y el locutor no dice que sean de ese año.</p>
      ${HOUSE_MUSIC.map((t) => {
        const here = library.houseLoaded.some((h) => h.id === t.id);
        return `<div class="row"><span>${escape(t.title)} <small>· ${escape(t.artist)} · ${t.year}</small><br><small><a href="${t.source}" target="_blank" rel="noopener">fuente</a> · <a href="${t.licenseUrl}" target="_blank" rel="noopener">${escape(t.license)}</a></small></span>
          <span>${here ? `<span class="ok">✓</span> ${this.previewButton(`house:${t.id}`)}` : '<span class="muted">falta el archivo</span>'}</span></div>`;
      }).join('')}

      <h3>Himno Nacional</h3>
      <p>A las 6:00 p.m. todas las emisoras y canales pasan el himno. Ya viene una grabación incluida; si carga la suya, tendrá preferencia.</p>
      <div class="row"><span>${escape(HOUSE_ANTHEM.title)}<br><small>Grabación incluida: ${escape(HOUSE_ANTHEM.artist)} · <a href="${HOUSE_ANTHEM.source}" target="_blank" rel="noopener">fuente</a> · <a href="${HOUSE_ANTHEM.licenseUrl}" target="_blank" rel="noopener">${escape(HOUSE_ANTHEM.license)}</a></small></span>
        <span>${anthem ? `<span class="ok">✓ ${ownAnthem ? 'suyo' : 'incluido'}</span> <small>${mmss(anthem.duration)}</small> ${this.previewButton('anthem')}` : '<span class="muted">falta el archivo</span>'}
          ${ownAnthem ? '<button data-forget="anthem">Quitar</button>' : ''}
          <label class="file">${ownAnthem ? 'Cambiar' : 'Cargar el suyo'}<input type="file" accept="audio/*" data-song="anthem" hidden></label></span></div>

      <h3>Voces · ${recorded} de ${spoken.length} líneas</h3>
      <p>Ya vienen todas las líneas fijas de los personajes, las emisoras y los programas de televisión. Los anuncios de la hora todavía aparecen como subtítulos. Puede reemplazar una línea con una grabación suya. Cada archivo se llama como el código de su línea (ver <code>docs/voice-script.md</code>), por ejemplo <code>llamada.andres.hola.m4a</code>. Arrástrelos arriba con lo demás.</p>
      <div class="chips">${chips}</div>

      <h3>Reloj</h3>
      <div class="row"><span class="clock">${formatTime(clock.now())}</span>
        <span><button data-skip="60">+1 min</button> <button data-skip="300">+5 min</button> <button data-to="${at(17, 58)}">Ir a las 5:58</button></span></div>
      <div class="row"><span>Empezar la tarde otra vez</span><button data-restart>Volver a las 5:30</button></div>

      <h3>Casete</h3>
      <div class="row"><span>Borrar todo lo grabado en los casetes</span><button data-erase class="${this.eraseArmed ? 'danger' : ''}">${this.eraseArmed ? '¿Seguro? Borrar' : 'Borrar'}</button></div>

      <h3>Su nombre</h3>
      <div class="row"><input type="text" id="backstage-name" value="${escape(flags.name)}" data-name placeholder="como lo llaman en su casa" style="font:inherit;padding:5px;width:100%"></div>
    `;
    this.clockEl = this.el.querySelector('.clock')!;
    this.wire();
  }

  private wire(): void {
    const q = <T extends Element>(sel: string) => this.el.querySelector<T>(sel)!;

    const folder = q<HTMLInputElement>('input[data-folder]');
    folder.webkitdirectory = true;
    folder.addEventListener('change', () => void this.ingest(filesFromInput(folder)));
    const files = q<HTMLInputElement>('input[data-files]');
    files.addEventListener('change', () => void this.ingest(filesFromInput(files)));

    this.el.querySelectorAll<HTMLInputElement>('input[data-song]').forEach((input) =>
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file) await library.upload(input.dataset.song!, await file.arrayBuffer());
        this.render();
      }),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-preview]').forEach((b) =>
      b.addEventListener('click', () => void this.togglePreview(b.dataset.preview!)),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-forget]').forEach((b) =>
      b.addEventListener('click', async () => {
        await library.forget(b.dataset.forget!);
        this.render();
      }),
    );
    this.el.querySelectorAll<HTMLSelectElement>('select[data-assign]').forEach((sel) =>
      sel.addEventListener('change', async () => {
        const picked = this.unknown[Number(sel.dataset.assign)];
        if (!picked || !sel.value) return;
        this.unknown = this.unknown.filter((f) => f !== picked);
        if (sel.value !== 'skip') {
          const target: Target = sel.value === 'anthem' ? { kind: 'anthem' } : { kind: 'song', id: sel.value.slice(5) };
          const ok = await this.load(target, picked.file);
          this.report = ok ? `Listo: ${escape(picked.path)} es ${escape(this.describe(target))}.` : `El navegador no pudo leer ${escape(picked.path)}.`;
        }
        this.render();
      }),
    );

    this.el.querySelectorAll<HTMLButtonElement>('button[data-skip]').forEach((b) =>
      b.addEventListener('click', () => clock.skip(Number(b.dataset.skip))),
    );
    q<HTMLButtonElement>('button[data-to]').addEventListener('click', (e) => {
      const target = Number((e.target as HTMLButtonElement).dataset.to);
      const now = clock.now();
      if (target > now) clock.skip(target - now);
    });
    q<HTMLButtonElement>('button[data-restart]').addEventListener('click', () => location.reload());
    // no confirm() dialogs (some places where the room runs don't show them): press twice
    q<HTMLButtonElement>('button[data-erase]').addEventListener('click', async () => {
      if (!this.eraseArmed) {
        this.eraseArmed = true;
        this.render();
        setTimeout(() => {
          if (!this.eraseArmed) return;
          this.eraseArmed = false;
          this.render();
        }, 4000);
        return;
      }
      this.eraseArmed = false;
      await this.deck.eraseAll();
      this.render();
    });
    q<HTMLInputElement>('input[data-name]').addEventListener('input', (e) => setName((e.target as HTMLInputElement).value));
  }
}
