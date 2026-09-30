# Bogotá 1995

A bedroom in Chapinero, Saturday 28 October 1995, 5:30 p.m. It's raining.

An interactive room where the nostalgia comes from *doing* things that have
disappeared: tuning a radio through static, taping a song off the air while
the DJ talks over the intro, rewinding a cassette, dialing a rotary phone and
getting a friend's mother, fiddling with the rabbit ears.

See [`docs/vision.md`](docs/vision.md) for the idea and [`docs/v0.md`](docs/v0.md)
for what this first version is (and isn't).

## Run it

```sh
npm install
npm run dev
```

Open http://localhost:5173 with **headphones on**. Laptop first; touch works too.

Other ways to open it:

- **A private claude.ai link**, updated with each iteration. The real TV
  clips don't play there, because artifacts can't embed other sites.
- **One file you can double-click:** `npm run build:single` writes
  `dist-single/index.html`. The TV clips don't play from disk either.
- **The clips play** wherever the room is served over http(s): `npm run dev`,
  or `npm run build` and then `npm run preview`.

## What's in the room

- **The grabadora.** A black CD boombox with a digital tuner: step through
  the dial with ◀◀ ▶▶ (hold to search), and slide the switch to TAPE, AM or
  FM. Three FM stations and one AM, live on the world clock: you tune into
  whatever is on air. Press REC to tape what you hear onto a blank TDK in
  deck 2, rewind it in (scaled) real time, and play back your copy. The tape
  survives reloads.
- **The phone.** A rotary dial (drag a finger hole round to the stop, or type
  digits) and the libreta with the numbers you know by heart.
- **The TV.** A wood-grain set. Push POWER, turn the VHF knob (2 to 13),
  move the rabbit ears when the picture is snow, whack the cabinet. Canal A (9) airs real 1995 clips
  when it can (see [`docs/clips-shortlist.md`](docs/clips-shortlist.md)).
- **The window.** Wipe the fog, open the pane, listen to the street.
- **The alarm clock** on the dresser keeps the afternoon's time; up close it ticks.
- **The light switch** by the door, for when it gets dark.

<details>
<summary>Spoilers: things that happen (for testing)</summary>

- Radioactiva gives out its request line on air every few minutes. Call it
  (it's busy at first, so keep trying), ask for a song and a dedication, then
  wait. The DJ plays it after the ads and reads your dedication over the
  intro. Be ready with REC, or better: set REC + PAUSE and release PAUSE when
  the song starts.
- Andrés isn't home until about 5:42. Leave a message with his mother and
  he'll call back. If you don't pick up, your mother will, in the kitchen.
  He has a favor to ask about your grabadora.
- Angie's line is busy until 5:40. Her father answers after that.
- Around 5:35 somebody calls looking for the bakery.
- From 5:45 to about 5:48 your mother is on the kitchen extension with tía
  Gloria. Pick up and listen.
- 117 gives you the time. The pizzería from the radio ad takes orders.
- Onces at 5:55. At 6:00 the church bells ring, and if you've loaded an
  anthem recording in the backstage, every station and channel plays it.

</details>

## The backstage

Press <kbd>`</kbd> (or the small ⚙ in the corner). It isn't part of the room.
From there you can:

- **Load your own songs, the anthem and recorded voices, in one go.** Drop a
  folder (or a pile of files) anywhere on the room, or pick one. Songs are
  recognized by the title and artist saved in the file, its name or its
  folder; the anthem by its name; voices by their line id (see
  [`docs/voice-script.md`](docs/voice-script.md)). Anything it can't place is
  listed with a "¿Qué es?" menu. If the folder has a song list (a CSV with
  `titulo`, `artista_o_grupo`, `emisora`, `archivo_mp3_sugerido`), it says
  exactly which file is which, and the backstage lists where the room differs
  from it. Files stay in this browser; nothing is uploaded. Until you load a
  song, the room's own Creative Commons music fills in where it fits (see
  [`public/music/`](public/music/README.md)), and a placeholder in the song's
  style plays otherwise. ▶ plays a few seconds of a loaded file.
- **See what's missing:** songs by station (the ones you can request are
  marked), and voice coverage for each character.
- **Move the clock forward**, or start the afternoon over.
- **Erase the tape** (it asks twice).

## Development

```sh
npm test               # unit tests (timeline, tape, file tags and matching)
npm run typecheck
npm run build          # static site in dist/
npm run build:single   # one self-contained file in dist-single/
npm run build:artifact # the same, shaped for a claude.ai artifact, in dist-artifact/
npm run voices         # regenerate docs/voice-script.md from the content
```

End-to-end scripts in `scripts/` (`e2e-*.mjs`) drive the room in headless
Chromium against the dev server: the request-line thread, the callback, the
TV clips (with a stand-in YouTube player) and loading files.

URL parameters for poking around: `?skip` skips the title card, `?t=900`
starts 15 minutes in, and `?open=grabadora|phone|tv|window|clock` opens a
close-up. In dev, `window.room1995` exposes the objects in the console.

### Where things live

| Folder | What it holds |
|---|---|
| `src/content/` | **The writing.** Stations and their DJs and ads, the phone calls and the libreta, TV programs, song titles. Edit these freely; the engine picks them up. |
| `src/objects/` | The things you touch: `grabadora` (`radio`, `deck`, `tape`), `phone` (`line`, `calls`), `tv`, `window` (`street`), `house`. |
| `src/broadcast/` | How radio and TV run on the clock: `timeline` (the running order), `station`, `player`. |
| `src/audio/` | The sound system: channels in the room, synthesized mechanical sounds, placeholder music, your loaded files. |
| `src/art/` | The drawings, as SVG built in code. |
| `src/scene/` | The room, the close-ups, the light, the city view. |
| `src/world/` | The clock, what happened this afternoon (`flags`), the traffic schedule, storage. |
| `public/music/` | The room's own Creative Commons music (see its README). |
| `docs/` | Vision, v0 decisions, voice script, TV clips, the public-path proposal for music. |

Every object is a small state machine with plain methods (`deck.press('rec')`,
`phone.lift()`, `tv.setPower(true)`). That's the natural way to build a
cassette deck. The only concession to the later "agents" idea is that it can
all be driven from the console.

## Rights

- Everything in this repository is original (the art, the synthesized sounds
  and placeholder music, the writing), except the music in `public/music/`:
  Creative Commons tracks, credited in the backstage and in
  [`public/music/README.md`](public/music/README.md).
- The fonts are under the OFL; see [`src/assets/fonts/LICENSES.md`](src/assets/fonts/LICENSES.md).
- Real song titles, stations and brands appear by name. That's fine for a
  private prototype, but it needs review before anything public.
- The real songs and voices you load stay in your browser.
- The TV clips are YouTube embeds, played in YouTube's own player.
- How a public version could have music: [`docs/public-path.md`](docs/public-path.md).
