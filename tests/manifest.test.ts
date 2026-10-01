import { describe, expect, it } from 'vitest';
import { checkManifest, fileKey, parseCsv, readManifest } from '../src/audio/manifest';
import { plan } from '../src/audio/matching';
import { SONGS } from '../src/content/songs';
import { STATIONS } from '../src/content/stations';

// the header and a few rows as exported from the spreadsheet (trimmed)
const CSV = `track_id,titulo,artista_o_grupo,emisora,anio_lanzamiento,album,version_o_notas,url_fuente,archivo_mp3_sugerido,genero,estado_archivo,licencia_o_permiso
01,Bolero falaz,Aterciopelados,Radioacktiva 97.9,1995,El Dorado,Versión del enlace elegido,https://www.youtube.com/watch?v=rvPalT87mj0,01-aterciopelados-bolero-falaz.mp3,Rock alternativo en español,preview 30s descargado (2026-09-29),"preview oficial Deezer (30 s); solo para pruebas internas, no redistribuir"
07,Zombie,The Cranberries,Radioacktiva 97.9,1994,No Need to Argue,Video oficial,https://www.youtube.com/watch?v=6Ejga4kJUts,07-the-cranberries-zombie.mp3,Rock alternativo,preview 30s descargado (2026-09-29),"preview oficial Deezer (30 s); solo para pruebas internas, no redistribuir"
12,Gangsta’s Paradise,Coolio ft. L.V.,Súper Estación 88.9,1995,Gangsta’s Paradise,Video oficial,https://www.youtube.com/watch?v=fPO76Jlnz6c,12-coolio-gangstas-paradise.mp3,Hip-hop,preview 30s descargado (2026-09-29),"preview oficial Deezer (30 s); solo para pruebas internas, no redistribuir"
20,Burbujas de amor,Juan Luis Guerra 4.40,Tropicana 102.9,1988,Bachata Rosa,Enlace elegido,https://www.youtube.com/watch?v=PWGwF_B0bxk,20-juan-luis-guerra-burbujas-de-amor.mp3,Bachata / merengue,preview 30s descargado (2026-09-29),"preview oficial Deezer (30 s); solo para pruebas internas, no redistribuir"
21,Himno Nacional de Colombia,Grabación oficial publicada en himnonacionaldecolombia.com,Himno Nacional,,,"Página oficial con opciones de descarga de video; revisar permiso para extraer audio",https://www.himnonacionaldecolombia.com/video/,21-himno-nacional-de-colombia.mp3,Himno nacional,preview 30s descargado (2026-09-29),"preview oficial Deezer (30 s); solo para pruebas internas, no redistribuir"
`;

describe('song lists', () => {
  it('parses quoted fields with commas, quotes and line breaks', () => {
    expect(parseCsv('a,b,c\n1,"dos, tres","con ""comillas"""\r\n4,"línea\nnueva",6\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'dos, tres', 'con "comillas"'],
      ['4', 'línea\nnueva', '6'],
    ]);
    expect(parseCsv('titulo;archivo\nAfuera;06.mp3')).toEqual([['titulo', 'archivo'], ['Afuera', '06.mp3']]);
  });

  it('reads the spreadsheet export', () => {
    const rows = readManifest(CSV)!;
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ title: 'Bolero falaz', artist: 'Aterciopelados', file: '01-aterciopelados-bolero-falaz.mp3', station: 'Radioacktiva 97.9' });
    expect(readManifest('nombre,edad\nAna,15')).toBeNull();
  });

  it('agrees with the room on this list', () => {
    const check = checkManifest(readManifest(CSV)!, SONGS, STATIONS);
    expect(check.missing).toEqual([]);
    expect(check.moved).toEqual([]);
    expect(check.files.get(fileKey('01-aterciopelados-bolero-falaz.mp3'))).toEqual({ kind: 'song', id: 'bolero-falaz' });
    expect(check.files.get(fileKey('21-himno-nacional-de-colombia.mp3'))).toEqual({ kind: 'anthem' });
  });

  it('says what the room is missing and what plays elsewhere', () => {
    const rows = readManifest(`titulo,artista_o_grupo,emisora,archivo_mp3_sugerido
Zombie,The Cranberries,Súper Estación 88.9,z.mp3
El santo cachón,Los Embajadores Vallenatos,Tropicana 102.9,santo.mp3`)!;
    const check = checkManifest(rows, SONGS, STATIONS);
    expect(check.moved.map((m) => [m.songId, m.listed, m.room])).toEqual([['zombie', 'Súper Estación 88.9', ['Radioactiva 97.9']]]);
    expect(check.missing.map((r) => r.title)).toEqual(['El santo cachón']);
  });

  it('lets the list decide what a badly named file is', () => {
    const listed = new Map([[fileKey('pista-rara.mp3'), { kind: 'song' as const, id: 'afuera' }]]);
    const p = plan([{ path: 'musica/pista-rara.mp3', tags: {} }], SONGS, new Set(), listed);
    expect(p.load.map((x) => [x.match.target, x.match.by])).toEqual([[{ kind: 'song', id: 'afuera' }, 'list']]);
  });
});
