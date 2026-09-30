// The room's own music: Creative Commons recordings that ship with it (in
// public/music/), so the radio has real songs for someone who loads nothing.
// They're not from 1995, so they only fill the slots of 1995 songs whose file
// you haven't loaded, and the DJs only say what's true about them.

import type { Song } from '../broadcast/types';
import { hash } from '../util/rng';

export interface HouseTrack {
  id: string;
  title: string;
  artist: string;
  year: number;
  license: string;
  licenseUrl: string;
  /** Where it was published. */
  source: string;
  /** The stations it can stand in on. */
  stations: string[];
  /** A song, a bed under the announcers, or both. */
  role: 'song' | 'bed' | 'both';
}

const BY = 'https://creativecommons.org/licenses/by/4.0/';
const BY_NC_SA = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

export const HOUSE_MUSIC: HouseTrack[] = [
  {
    id: 'errante-diamante',
    title: 'Errante diamante',
    artist: 'Aterciopelados',
    year: 2008,
    license: 'CC BY 2.5 Colombia',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.5/co/',
    source: 'https://archive.org/details/ErranteDiamante',
    stations: ['radioactiva'],
    role: 'song',
  },
  {
    id: 'ataque-de-risa',
    title: 'Ataque de risa',
    artist: 'Aterciopelados',
    year: 2012,
    license: 'CC BY-NC-SA 4.0',
    licenseUrl: BY_NC_SA,
    source: 'https://petitesplanetes.bandcamp.com/album/aterciopelados-esperando-el-tsunami-collection',
    stations: ['radioactiva', 'superestacion'],
    role: 'song',
  },
  {
    id: 'que-paciencia',
    title: '¡Qué paciencia!',
    artist: 'Los Sundayers',
    year: 2010,
    license: 'CC BY-NC-SA 4.0',
    licenseUrl: BY_NC_SA,
    source: 'https://kokuracraftedmusic.bandcamp.com/track/qu-paciencia',
    stations: ['radioactiva'],
    role: 'song',
  },
  {
    id: 'de-pronto-no-estas-tu',
    title: 'De pronto no estás tú',
    artist: 'Pacotiempo',
    year: 2009,
    license: 'CC BY-NC-SA 4.0',
    licenseUrl: BY_NC_SA,
    source: 'https://kokuracraftedmusic.bandcamp.com/track/de-pronto-no-est-s-t',
    stations: ['superestacion'],
    role: 'song',
  },
  {
    id: 'no-frills-cumbia',
    title: 'No Frills Cumbia',
    artist: 'Kevin MacLeod',
    year: 2004,
    license: 'CC BY 4.0',
    licenseUrl: BY,
    source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100275',
    stations: ['tropicana'],
    role: 'both',
  },
  {
    id: 'no-frills-salsa',
    title: 'No Frills Salsa',
    artist: 'Kevin MacLeod',
    year: 2004,
    license: 'CC BY 4.0',
    licenseUrl: BY,
    source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100133',
    stations: ['tropicana'],
    role: 'both',
  },
];

/**
 * Which house track fills the slot of a 1995 song on a station: the same band
 * if there is one (Aterciopelados for Aterciopelados), otherwise one of the
 * station's own, always the same one for the same song.
 */
export function pickStandIn(song: Song, stationId: string, available: HouseTrack[]): HouseTrack | null {
  const pool = available.filter((t) => t.role !== 'bed' && t.stations.includes(stationId));
  if (!pool.length) return null;
  const sameBand = pool.filter((t) => t.artist === song.artist);
  const from = sameBand.length ? sameBand : pool;
  return from[hash(song.id) % from.length];
}

/** The house tracks that can play under the announcers of a station. */
export function bedsFor(stationId: string, available: HouseTrack[]): HouseTrack[] {
  return available.filter((t) => t.role !== 'song' && t.stations.includes(stationId));
}
