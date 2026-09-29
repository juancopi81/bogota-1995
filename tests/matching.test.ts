import { describe, expect, it } from 'vitest';
import { readTags, tagsOfFile } from '../src/audio/tags';
import { classify, normalize, plan, type Candidate } from '../src/audio/matching';
import { SONGS } from '../src/content/songs';

// ---------- building tagged files by hand ----------

const latin1 = (s: string) => [...s].map((c) => c.charCodeAt(0));
const utf8 = (s: string) => [...new TextEncoder().encode(s)];
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const syncsafe = (n: number) => [(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127];
const buf = (bytes: number[]) => new Uint8Array(bytes).buffer;

function id3v23(frames: [string, number[]][]): ArrayBuffer {
  const body = frames.flatMap(([id, data]) => [...latin1(id), ...be32(data.length), 0, 0, ...data]);
  return buf([...latin1('ID3'), 3, 0, 0, ...syncsafe(body.length + 20), ...body, ...new Array(20).fill(0), 0xff, 0xfb, 0x90, 0x00]);
}

function id3v24(frames: [string, number[]][]): ArrayBuffer {
  const body = frames.flatMap(([id, data]) => [...latin1(id), ...syncsafe(data.length), 0, 0, ...data]);
  return buf([...latin1('ID3'), 4, 0, 0, ...syncsafe(body.length), ...body]);
}

function box(type: string, content: number[]): number[] {
  return [...be32(content.length + 8), ...latin1(type), ...content];
}

describe('readTags', () => {
  it('reads ID3v2.3 in Latin-1 and UTF-16', () => {
    const utf16 = [1, 0xff, 0xfe, ...[...'Bolero falaz'].flatMap((c) => [c.charCodeAt(0), 0])];
    const tags = readTags(id3v23([['TIT2', utf16], ['TPE1', [0, ...latin1('Aterciopelados')]], ['TALB', [0, ...latin1('El Dorado')]]]));
    expect(tags).toEqual({ title: 'Bolero falaz', artist: 'Aterciopelados', album: 'El Dorado' });
  });

  it('reads ID3v2.4 in UTF-8', () => {
    const tags = readTags(id3v24([['TIT2', [3, ...utf8('¿Dónde jugarán los niños?')]], ['TPE1', [3, ...utf8('Maná')]]]));
    expect(tags.title).toBe('¿Dónde jugarán los niños?');
    expect(tags.artist).toBe('Maná');
  });

  it('reads ID3v2.2 and falls back to ID3v1', () => {
    const v22body = [...latin1('TT2'), 0, 0, 7, 0, ...latin1('Afuera')];
    const v22 = [...latin1('ID3'), 2, 0, 0, ...syncsafe(v22body.length), ...v22body];
    expect(readTags(buf(v22)).title).toBe('Afuera');

    const pad = (s: string) => [...latin1(s), ...new Array(30 - s.length).fill(0)];
    const v1 = [...new Array(400).fill(0), ...latin1('TAG'), ...pad('Rebelion'), ...pad('Joe Arroyo'), ...pad('Grandes exitos'), ...new Array(35).fill(0)];
    expect(readTags(buf(v1))).toEqual({ title: 'Rebelion', artist: 'Joe Arroyo', album: 'Grandes exitos' });
  });

  it('reads the iTunes atoms in an M4A', () => {
    const data = (text: string) => box('data', [0, 0, 0, 1, 0, 0, 0, 0, ...utf8(text)]);
    const ilst = box('ilst', [...box('©nam', data('La tierra del olvido')), ...box('aART', data('Varios')), ...box('©ART', data('Carlos Vives'))]);
    const meta = box('meta', [0, 0, 0, 0, ...box('hdlr', new Array(25).fill(0)), ...ilst]);
    const file = [...box('ftyp', latin1('M4A mp42isom')), ...box('moov', [...box('mvhd', new Array(100).fill(0)), ...box('udta', meta)]), ...box('mdat', new Array(64).fill(1))];
    expect(readTags(buf(file))).toEqual({ title: 'La tierra del olvido', artist: 'Carlos Vives', album: undefined });
  });

  it('reads Vorbis comments in a FLAC', () => {
    const comment = (s: string) => [...le32(utf8(s).length), ...utf8(s)];
    const vorbis = [...le32(4), ...latin1('test'), ...le32(2), ...comment('TITLE=Ojalá que llueva café'), ...comment('ARTIST=Juan Luis Guerra')];
    const file = [...latin1('fLaC'), 0, 0, 0, 34, ...new Array(34).fill(0), 0x84, ...be32(vorbis.length).slice(1), ...vorbis];
    expect(readTags(buf(file))).toMatchObject({ title: 'Ojalá que llueva café', artist: 'Juan Luis Guerra' });
  });

  it('reads the same tags from slices of a file', async () => {
    const utf16 = [1, 0xff, 0xfe, ...[...'Matador'].flatMap((c) => [c.charCodeAt(0), 0])];
    const mp3 = id3v23([['TIT2', utf16], ['TPE1', [0, ...latin1('Los Fabulosos Cadillacs')]]]);
    expect(await tagsOfFile(new Blob([mp3, new Uint8Array(5000)]))).toMatchObject({ title: 'Matador', artist: 'Los Fabulosos Cadillacs' });

    // an M4A with its 'moov' after the audio
    const data = (text: string) => box('data', [0, 0, 0, 1, 0, 0, 0, 0, ...utf8(text)]);
    const moov = box('moov', box('udta', box('meta', [0, 0, 0, 0, ...box('ilst', box('\u00a9nam', data('Rebelión')))])));
    const m4a = [...box('ftyp', latin1('M4A mp42isom')), ...box('mdat', new Array(3000).fill(7)), ...moov];
    expect(await tagsOfFile(new Blob([buf(m4a)]))).toMatchObject({ title: 'Rebelión' });
  });

  it('shrugs at files it does not know', () => {
    expect(readTags(buf([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toEqual({});
  });
});

// ---------- recognizing files ----------

const LINES = new Set(['llamada.andres.hola', 'radioactiva.saludo1']);
const f = (path: string, tags: Candidate['tags'] = {}): Candidate => ({ path, tags });
const what = (c: Candidate) => {
  const m = classify(c, SONGS, LINES);
  return m ? (m.target.kind === 'anthem' ? 'anthem' : `${m.target.kind}:${m.target.id}`) : null;
};

describe('matching', () => {
  it('normalizes the way people type titles', () => {
    expect(normalize('¿Dónde jugarán los niños?')).toBe('donde jugaran los ninos');
    expect(normalize("Gangsta's Paradise")).toBe('gangstas paradise');
  });

  it('recognizes songs by their file names', () => {
    expect(what(f('03 - Bolero Falaz.mp3'))).toBe('song:bolero-falaz');
    expect(what(f('Aterciopelados - Florecita rockera.mp3'))).toBe('song:florecita-rockera');
    expect(what(f('Musica/Soda Stereo/Ella Uso Mi Cabeza Como Un Revolver.mp3'))).toBe('song:ella-uso-mi-cabeza');
    expect(what(f("Coolio - Gangsta's Paradise ft. L.V..mp3"))).toBe('song:gangstas-paradise');
    expect(what(f('Poligamia_-_Mi_Generacion.m4a'))).toBe('song:mi-generacion');
    expect(what(f('Carlos Vives/Tierra del olvido.mp3'))).toBe('song:tierra-del-olvido');
    expect(what(f('Zombie.mp3'))).toBe('song:zombie');
  });

  it('trusts tags over a meaningless file name', () => {
    expect(what(f('Track 07.mp3', { title: 'La ingrata', artist: 'Café Tacvba' }))).toBe('song:la-ingrata');
    expect(what(f('AUD-20240101.m4a', { title: 'Cali Pachanguero', artist: 'Grupo Niche' }))).toBe('song:cali-pachanguero');
  });

  it("doesn't take someone else's song with the same title", () => {
    expect(what(f('x.mp3', { title: 'Zombie', artist: 'Bad Wolves' }))).toBeNull();
    expect(what(f('Matador (feat. Someone).mp3', { title: 'Matador', artist: 'Random Band' }))).toBeNull();
  });

  it('needs the artist to trust a one-word title inside a longer name', () => {
    expect(what(f('Afuera de mi casa.mp3'))).toBeNull();
    expect(what(f('Caifanes - Afuera.mp3'))).toBe('song:afuera');
  });

  it('recognizes the anthem and the recorded lines', () => {
    expect(what(f('Himno Nacional de Colombia.mp3'))).toBe('anthem');
    expect(what(f('himno.wav'))).toBe('anthem');
    expect(what(f('Colombia National Anthem (instrumental).mp3'))).toBe('anthem');
    expect(what(f('Himno de la alegría.mp3'))).toBeNull();
    expect(what(f('voces/llamada.andres.hola.m4a'))).toBe('voice:llamada.andres.hola');
    expect(what(f('radioactiva_saludo1.wav'))).toBe('voice:radioactiva.saludo1');
  });

  it("recognizes every file in the folder of 30-second previews", () => {
    const folder: [string, string][] = [
      ['01-aterciopelados-bolero-falaz.mp3', 'song:bolero-falaz'],
      ['02-aterciopelados-florecita-rockera.mp3', 'song:florecita-rockera'],
      ['03-soda-stereo-ella-uso-mi-cabeza-como-un-revolver.mp3', 'song:ella-uso-mi-cabeza'],
      ['04-los-fabulosos-cadillacs-matador.mp3', 'song:matador'],
      ['05-enanitos-verdes-lamento-boliviano.mp3', 'song:lamento-boliviano'],
      ['06-caifanes-afuera.mp3', 'song:afuera'],
      ['07-the-cranberries-zombie.mp3', 'song:zombie'],
      ['08-guns-n-roses-you-could-be-mine.mp3', 'song:you-could-be-mine'],
      ['09-cafe-tacvba-la-ingrata.mp3', 'song:la-ingrata'],
      ['10-shakira-estoy-aqui.mp3', 'song:estoy-aqui'],
      ['11-seal-kiss-from-a-rose.mp3', 'song:kiss-from-a-rose'],
      ['12-coolio-gangstas-paradise.mp3', 'song:gangstas-paradise'],
      ['13-poligamia-mi-generacion.mp3', 'song:mi-generacion'],
      ['14-poligamia-desvanecer.mp3', 'song:desvanecer'],
      ['15-carlos-vives-la-tierra-del-olvido.mp3', 'song:tierra-del-olvido'],
      ['16-carlos-vives-la-gota-fria.mp3', 'song:gota-fria'],
      ['17-grupo-niche-cali-pachanguero.mp3', 'song:cali-pachanguero'],
      ['18-grupo-niche-una-aventura.mp3', 'song:una-aventura'],
      ['19-joe-arroyo-rebelion.mp3', 'song:rebelion'],
      ['20-juan-luis-guerra-burbujas-de-amor.mp3', 'song:burbujas-de-amor'],
      ['21-himno-nacional-de-colombia.mp3', 'anthem'],
    ];
    for (const [name, expected] of folder) expect([name, what(f(`musica-1995/${name}`))]).toEqual([name, expected]);
  });

  it('keeps the surest file for each song and lists the rest', () => {
    const files = [
      f('Bolero falaz (En vivo).mp3'),
      f('Aterciopelados - Bolero falaz.mp3'),
      f('vacaciones.mp3'),
      f('Himno Nacional.mp3'),
    ];
    const p = plan(files, SONGS, LINES);
    expect(p.load.map((x) => x.file.path).sort()).toEqual(['Aterciopelados - Bolero falaz.mp3', 'Himno Nacional.mp3']);
    expect(p.duplicates.map((x) => x.file.path)).toEqual(['Bolero falaz (En vivo).mp3']);
    expect(p.unknown.map((x) => x.path)).toEqual(['vacaciones.mp3']);
  });
});
