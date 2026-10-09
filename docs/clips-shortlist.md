# TV clips

Cadena Uno (7) and Canal A (9) air real 1995 television through YouTube
embeds. **Nothing goes in without your OK.**

## The timetable from 5:30 (approved in October 2026)

Full episodes, starting at 0:00 and playing to their end, then ads and clips.
The anthem at 6:00 pauses whatever is on; it picks up after the anthem. Tune
in late and you land mid-episode, like the radio. These are in `SCHEDULES` in
`src/content/clips.ts`, one line each.

| | Cadena Uno (7) | Canal A (9) |
|---|---|---|
| 5:30:00 | [«Tentaciones»](https://www.youtube.com/watch?v=92NxNiCDwZs), 23:39 (Caracol Televisión's own upload) | [«Dejémonos de vainas»](https://www.youtube.com/watch?v=E_reJPjY4Fw), 22:31 (fan copy) |
| 5:52:31 | | Four 1995 commercials: [1](https://www.youtube.com/watch?v=Qv6BF5cz1WI), [2](https://www.youtube.com/watch?v=WpAJ8E8ZnyI), [3](https://www.youtube.com/watch?v=qkIQUUdeXJo), [4](https://www.youtube.com/watch?v=Mwwqc8vHE5A) (19, 14, 26, 19 s; fan copies) |
| 5:53:39 | 75 s of [«1995 Comerciales. Cadena UNO»](https://www.youtube.com/watch?v=J47UMyICIJU) (fan copy) | |
| 5:53:49 | | [«Rock al parque 1995»](https://www.youtube.com/watch?v=84DTd4OBC9Y), 4 min |
| 5:54:54 | [«De pies a cabeza»](https://www.youtube.com/watch?v=zxKV5Lfi1Xk), 34:30 (fan copy) | |
| 5:57:49 | | The 1995 Cadena Uno ads again, from 2:30, up to six |
| 6:00:00 | Himno Nacional | Himno Nacional |
| 6:02:43 | De pies a cabeza picks up where it stopped | [«Guerra de Bosnia en la TV colombiana (1995)»](https://www.youtube.com/watch?v=c991HevT0RE) (*Noticiero de las 7*) |
| after | the invented telenovela, with the real 1995 ads in its breaks | the clips above in rotation, with the channel's card between them |

- **Where they aired:** *Dejémonos de vainas* (Coestrellas) was on Canal A in
  1992–1998; *De pies a cabeza* was on Cadena Uno from 1993; *Tentaciones*
  was Caracol's, about 1994–1998, when Caracol made programs for both public
  channels.
- **YouTube's own ads** can play inside these, before or during an episode,
  and can't be turned off from here (accepted for now). Switching channels
  reloads the player, so coming back can bring another ad. An ad delays the
  episode, so its last seconds may be cut when the next item comes on.
- **If a program is refused** (removed, private, embedding disabled), the
  channel's usual running order fills its slot, and the next program still
  comes on at its time. If a video ends before its slot does, the channel's
  card covers the rest.
- **The invented programs** (the telenovela «Corazón de lluvia», «Sábado
  Musical», the ads) are what the channels show when YouTube can't play here.

## Where clips can play

- **They play** when the room is served over http(s): `npm run dev`,
  `npm run preview`, or any web server.
- **They can't play** from the file opened from disk (YouTube refuses pages
  without an address), or in the claude.ai link (artifacts can't frame other
  sites). There, Canal A keeps its invented programs.
- If a clip ends before its slot, the channel shows its card and moves on. If
  a clip is refused (removed, private, embedding disabled), the channel cuts
  to the next one and skips it from then on. If YouTube can't be reached at
  all, the channels go back to their invented programs within a few seconds.
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
| Rock al Parque 1995 | The first festival (May 1995); the flyer on the wall | [Señal Memoria page](https://www.senalmemoria.co/piezas/rock-al-parque-1995) · [YouTube](https://www.youtube.com/watch?v=84DTd4OBC9Y) (Señal Memoria’s own upload) |
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
