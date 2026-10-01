# The room's own music

Audio files here ship with the room and play on the radio in the place of
1995 songs nobody has loaded. Any file names work: each file is recognized by
its title and artist (in its tags or its name), against the list in
`src/content/housemusic.ts`.
The bundled anthem, `himno-nacional-de-colombia.mp3`, loads separately for
the 6 p.m. broadcast on every station and TV channel. A user-uploaded anthem
takes priority; removing it restores the bundled recording.

Only public-domain, Creative Commons, or otherwise licensed recordings go
here, never the 1995 songs themselves. Their credits are shown in the backstage. These seven
recordings were downloaded on **2026-09-30** from the releases linked below.
The six songs are later recordings used as stand-ins, not recordings from 1995.

## Included recordings

| File | Recording and source | Duration | Station | License |
|---|---|---|---|---|
| `aterciopelados-errante-diamante.mp3` | [Aterciopelados — Errante diamante (2008)](https://archive.org/details/ErranteDiamante) | 4:33 | Radioactiva | [CC BY 2.5 Colombia](https://creativecommons.org/licenses/by/2.5/co/) |
| `aterciopelados-ataque-de-risa.mp3` | [Aterciopelados — Ataque de risa (2012, *Esperando el Tsunami*)](https://petitesplanetes.bandcamp.com/album/aterciopelados-esperando-el-tsunami-collection) | 5:12 | Radioactiva, Superestación | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `los-sundayers-que-paciencia.mp3` | [Los Sundayers — ¡Qué paciencia! (2010)](https://kokuracraftedmusic.bandcamp.com/track/qu-paciencia) | 2:53 | Radioactiva | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `pacotiempo-de-pronto-no-estas-tu.mp3` | [Pacotiempo — De pronto no estás tú (2009)](https://kokuracraftedmusic.bandcamp.com/track/de-pronto-no-est-s-t) | 3:43 | Superestación | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `kevin-macleod-no-frills-cumbia.mp3` | [Kevin MacLeod — No Frills Cumbia (2004)](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100275) | 3:56 | Tropicana; also under announcers | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `kevin-macleod-no-frills-salsa.mp3` | [Kevin MacLeod — No Frills Salsa (2004)](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100133) | 2:47 | Tropicana; also under announcers | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `himno-nacional-de-colombia.mp3` | [United States Navy Band — Himno Nacional de la República de Colombia](https://commons.wikimedia.org/wiki/File:United_States_Navy_Band_-_%C2%A1Oh,_gloria_inmarcesible!.ogg) | 2:41 | All stations and TV channels at 6 p.m. | Public-domain composition; performance and recording public domain in the United States ([source notices](https://commons.wikimedia.org/wiki/File:United_States_Navy_Band_-_%C2%A1Oh,_gloria_inmarcesible!.ogg#Licensing)) |

## Credits and versions

- **Errante diamante:** Aterciopelados. Converted from Internet Archive's
  [original FLAC](https://archive.org/download/ErranteDiamante/Errante.flac),
  published there under CC BY 2.5 Colombia.
- **Ataque de risa:** the acoustic performance released by **Vincent Moon /
  Petites Planètes**, *ATERCIOPELADOS (esperando el tsunami collection)*,
  September 10, 2012. Performance by Aterciopelados; song by Andrea Echeverri
  and Milagros; sound by Andres Velasquez; mix by Christian Castagno;
  produced by Vincent Moon and Lulacruza. The related film credits images
  to Vincent Moon and editing to Vincent Moon and Andrew Van Baal
  ([film](https://vimeo.com/38410306)). Downloaded as FLAC through the
  release's free name-your-price option. This is the 5:12 acoustic recording,
  not the studio recording from *Río*. The track artist tag is standardized
  to Aterciopelados for matching; Vincent Moon / Petites Planètes remains
  credited in the album artist tag and here.
- **¡Qué paciencia!:** Los Sundayers, originally from *Cógelo!!!* (2010).
  Downloaded as FLAC from Kokura Crafted Music's *disco pirata* compilation
  (May 24, 2010), using the track's Free Download option.
- **De pronto no estás tú:** Pacotiempo, originally from *Hacia el sur*
  (2009). Downloaded as FLAC from the same *disco pirata* compilation (2010).
  The file retains the compilation's album and date tags.
- **No Frills Cumbia:** Kevin MacLeod (incompetech.com). Licensed under
  [Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
  Downloaded using the official track page's MP3 download. This is the
  **84 BPM, 3:56 version, ISRC USUAN1100275**.
- **No Frills Salsa:** Kevin MacLeod (incompetech.com). Licensed under
  [Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
  Downloaded using the official track page's MP3 download:
  **144 BPM, 2:47, ISRC USUAN1100133**.
- **Himno Nacional de la República de Colombia (¡Oh, gloria inmarcesible!):**
  performed by the **United States Navy Band**; music by Oreste Síndici,
  anthem lyrics by Rafael Núñez. Downloaded from Wikimedia Commons'
  [original Ogg file](https://upload.wikimedia.org/wikipedia/commons/5/55/United_States_Navy_Band_-_%C2%A1Oh%2C_gloria_inmarcesible%21.ogg),
  encoded by Linfocito B from the U.S. Navy Band's MP3. Commons documents
  the composition as public domain and the performance/recording as public
  domain in the United States, as a work made in the course of U.S. Navy
  duties. The [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/)
  records that status; it is not a Creative Commons license. This is the
  Navy Band performance, not an identified Colombian radio recording from 1995.

## File preparation

All seven files contain the complete recordings, re-encoded with FFmpeg to
**128 kbps MP3, 44.1 kHz stereo** (about **24.8 MB** total). No excerpts,
fades, normalization, or other audio edits were applied. Embedded artwork
was omitted; title and artist tags were standardized to the house catalogue.
Each file includes its source URL, license name/link, and conversion notice
in ID3v2.3 metadata (the anthem carries its public-domain notice instead).
Original album and other text metadata were retained.

The recordings retain the individual licenses above, separately from the
project's code license. In particular, the three CC BY-NC-SA recordings
require noncommercial use and ShareAlike for adaptations. Preserve these
credits, source links, license links, and modification notices with copies.

## Testing in the room

Keep the MP3s directly in this directory: the Vite plugin reads this flat
folder when it starts or builds. Restart an already-running dev server after
adding files. Open the room, then **⚙ → Música de la casa**; all six entries
should have a checkmark and a preview button. No manual upload is needed.
User-loaded 1995 recordings still take priority over these stand-ins.
Under **Himno Nacional**, the default recording should show **✓ incluido**
and **2:41**. Enter the room, use **Ir a las 5:58** and then **+1 min** twice
to check the 6 p.m. broadcast. You can load your own anthem in the same
section; **Quitar** restores the included version.
