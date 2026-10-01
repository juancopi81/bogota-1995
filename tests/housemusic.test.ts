import { describe, expect, it } from 'vitest';
import { HOUSE_MUSIC, bedsFor, pickStandIn } from '../src/content/housemusic';
import { song } from '../src/content/songs';
import { REQUEST_LINES, requestIntro } from '../src/content/stations';

const track = (id: string) => HOUSE_MUSIC.find((t) => t.id === id)!;

describe('house music', () => {
  it('fills an Aterciopelados slot with Aterciopelados', () => {
    for (const id of ['bolero-falaz', 'florecita-rockera']) {
      expect(pickStandIn(song(id), 'radioactiva', HOUSE_MUSIC)?.artist).toBe('Aterciopelados');
    }
  });

  it("fills other slots from the station's own tracks, always the same one per song", () => {
    const pick = pickStandIn(song('matador'), 'radioactiva', HOUSE_MUSIC)!;
    expect(pick.stations).toContain('radioactiva');
    expect(pickStandIn(song('matador'), 'radioactiva', HOUSE_MUSIC)).toBe(pick);
    expect(pickStandIn(song('la-ingrata'), 'superestacion', HOUSE_MUSIC)!.stations).toContain('superestacion');
    expect(pickStandIn(song('rebelion'), 'tropicana', HOUSE_MUSIC)!.artist).toBe('Kevin MacLeod');
  });

  it('has nothing to offer when the files are missing, or on a station without any', () => {
    expect(pickStandIn(song('matador'), 'radioactiva', [])).toBeNull();
    expect(pickStandIn(song('matador'), 'rcn', HOUSE_MUSIC)).toBeNull();
  });

  it('puts the instrumentals under the announcers of Tropicana only', () => {
    expect(bedsFor('tropicana', HOUSE_MUSIC).map((t) => t.id).sort()).toEqual(['no-frills-cumbia', 'no-frills-salsa']);
    expect(bedsFor('radioactiva', HOUSE_MUSIC)).toEqual([]);
  });

  it("lets the DJ name only what's true when a house track answers a request", () => {
    expect(requestIntro('florecita-rockera', 'angie', track('errante-diamante'))).toEqual([REQUEST_LINES.dedAngie, REQUEST_LINES.aterciopelados]);
    expect(requestIntro('matador', null, track('que-paciencia'))).toEqual([REQUEST_LINES.generico]);
    expect(requestIntro('matador', null)).toEqual([REQUEST_LINES.matador]);
  });
});
