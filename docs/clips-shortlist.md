# TV clips

Canal A (channel 9) airs real 1995 television through YouTube embeds.
**Nothing goes in without your OK.**

## On air (approved in the second interview)

You approved Señal Memoria's own uploads and the 1995 Cadena Uno ad breaks.
These are in `src/content/clips.ts`, and Canal A loops them with its card in
between (about 12 minutes):

| Slot | Clip | Source |
|---|---|---|
| Ad break | [«1995 Comerciales. Cadena UNO. Colombia»](https://www.youtube.com/watch?v=J47UMyICIJU), first 2½ min | Fan upload (taped off the air) |
| Music | [«Rock al parque 1995»](https://www.youtube.com/watch?v=84DTd4OBC9Y), first 4 min | Same title as Señal Memoria's piece |
| Ad break | The same tape, from 2½ to 5 min | Fan upload |
| News | [«Guerra de Bosnia en la TV colombiana (1995)»](https://www.youtube.com/watch?v=c991HevT0RE), first 2½ min | *Noticiero de las 7*, from Señal Memoria's archive |

I still couldn't watch them (YouTube is blocked from the build environment),
so **please check three things the first time you play:** that the uploaders
are who we think, that each slot starts somewhere sensible, and that nothing
in them is from after 1995 (a modern logo or title card). Starts and lengths
are one line each in `clips.ts`.

**Not airing, and why:**

- *Freddy Rincón, el adiós a un coloso*: the 1995 *Noticiero de las 7*
  fragment is inside a 2022 obituary piece. A tribute to his death on a 1995 TV
  would break the moment.
- *Inmigrantes*, *Historias de la historia*, Power Rangers: I found no YouTube
  upload, only Señal Memoria's own site, which can't be embedded here.
- «18 - Tanda de comerciales colombianos - Cadena Uno» (86R_6WAJHMk): the
  title doesn't give the year, and the rest of that series is 1991–1994.
- «Rock al Parque 1995 (el público)» (PFwUJIMUx3o): a fan upload, but not an
  ad break, so outside what you approved.

## Where clips can play

- **They play** when the room is served over http(s): `npm run dev`,
  `npm run preview`, or any web server.
- **They can't play** from the file opened from disk (YouTube refuses pages
  without an address), or in the claude.ai link (artifacts can't frame other
  sites). There, Canal A keeps its invented programs.
- If a clip is refused (removed, private, embedding disabled), Canal A cuts to
  the next one and skips it from then on. If YouTube can't be reached at all,
  the channel goes back to its invented programs within a few seconds.
- The clip's sound comes from YouTube, not through the TV's speaker. It
  follows the volume knob and the reception, but it isn't boxy like the rest
  of the TV, and it can't be taped.
- The small TV in the room can't copy a real clip's picture. From across the
  room you see its light changing, and you see the clip itself up close.

# Shortlist (for reference)

Candidates proposed before the interview. Titles and descriptions come from
search results.

## Official archive (Señal Memoria, RTVC)

These are the best fit for "official embeds".

| Piece | Why it fits | Link |
|---|---|---|
| Rock al Parque 1995 | The first festival (May 1995); the flyer on the wall | [Señal Memoria page](https://www.senalmemoria.co/piezas/rock-al-parque-1995) · [YouTube](https://www.youtube.com/watch?v=84DTd4OBC9Y) (check the uploader) |
| Serie *Inmigrantes* (1995): "Alemanes en el altiplano" | A 1995 public-TV documentary; right for Canal 3 | [Señal Memoria page](https://www.senalmemoria.co/piezas/alemanes-en-el-altiplano-serie-inmigrantes) |
| *Historias de la historia* (1995), fragment | Educational TV of the year | [Señal Memoria page](https://www.senalmemoria.co/piezas/abadia-presidente-masacre-bananeras) |
| *Noticiero de las 7* (1995): the war in Bosnia | What the evening news sounded like that year | [Señal Memoria page](https://www.senalmemoria.co/piezas/bosnia-la-guerra) |
| Freddy Rincón goes to Real Madrid (1995) | 1995 sports news | [Señal Memoria page](https://www.senalmemoria.co/piezas/freddy-rincon-adios-coloso) |
| Power Rangers (1995) | Imported kids' TV of the year | [Señal Memoria page](https://www.senalmemoria.co/piezas/power-rangers-treinta-anos-venciendo-los-enemigos) |
| Proceso 8000 | Archive notes and clips on the scandal on the radio news | [Señal Memoria page](https://www.senalmemoria.co/proceso-8000-historia-politica) |

## Not official (fan uploads from home recordings)

These are probably the strongest triggers, because the commercial breaks are
what people remember. But these are copies someone recorded off the air.
Your call.

| Upload | Link |
|---|---|
| "1995 Comerciales. Cadena UNO. Colombia" | [YouTube](https://www.youtube.com/watch?v=J47UMyICIJU) |
| "Tanda de comerciales colombianos – Cadena Uno" (series of Betamax transfers) | [YouTube](https://m.youtube.com/watch?v=86R_6WAJHMk) |
| Playlist "Comerciales de Colombia 1995" | [YouTube](https://www.youtube.com/playlist?list=PLx5Nnj8oqOFLupp7kFcnAbk_QIL15H8AK) |
| "Rock al Parque 1995 (el público)" | [YouTube](https://www.youtube.com/watch?v=PFwUJIMUx3o) |
