# Included dialogue voices

All 192 fixed dialogue lines load automatically in the room, including
Andrés's call from the monedero and his callback. The included takes use the
original dialogue in `src/content/` and `src/objects/house.ts`, generated with
ElevenLabs v4 on a paid Starter plan: 79 clips on 30 September 2026 and the
remaining 107 on 2 October 2026, followed by two street calls and a bakery
retake that day, and four new Andrés lines on 4 October 2026. The characters
and radio announcers are fictional; these are not recordings of the historical
station.

Live time announcements on the radio and 117 have no fixed line IDs and
still use subtitles. Player choices are also text only.

| Role | ElevenLabs library voice | Voice ID | Clips |
|---|---|---|---|
| Your mother | Fernanda Sanmiguel - Neutral and Serious | `1aJyZpkt0vxhGPBnPyrs` | 10 |
| Andrés's mother | Milena - Silky, Sweet and Neutral | `oWSxI36XAKnfMWmzmQok` | 11 |
| Andrés | Daniel - Clear, Calm and Explanatory | `PltXjU3hWkDRqpu9TowY` | 15 |
| Radioactiva DJ and request desk | Yorman Andrés - Cheerful, Expressive | `J2Jb9yZNvpXUNAL3a2bw` | 47 |
| Grandma | Sandra - Executive, Soft, Bogotá, Colombia | `mvUcswqyALvhz2mIGROO` | 11 |
| Angie's father | Juan Carlos - Expressive & Friendly | `GMEpD7vcmVahuyz6NuZA` | 7 |
| Angie | Nathalia - Neutral, Sweet and Friendly | `tTQzD8U9VSnJgfwC6HbY` | 6 |
| Tía Gloria and radio/TV ads | Vanessa | `wutgczPT1RZgTX0H3qRJ` | 15 |
| Wrong-number callers: woman | Paula Pinzón - Cheerful, Confident | `UNIruiz09F4kWYjRpOvy` | 8 |
| Wrong-number callers: man | Cesar - Slow, Meditative, Warm | `QtuQlibCvdX2iBrV4laj` | 1 |
| Pharmacy and pizzería | Alexander - Colombian Latin | `UxEeTOXgTgyv54iyYaa5` | 7 |
| Unassigned-number recording | Selena - AI assistant & receptionist | `kVp3G6YINMUwOL7ROfIF` | 1 |
| Súper Estación DJ | Ale Alejandro - Your Friendly Pal | `Fn8ZcuyNYI4qImgQ2yuH` | 13 |
| Tropicana DJ | Santiago - Calm, Clear and Steady | `6z7DGa6EoROi3cODJ0IF` | 11 |
| RCN announcer | Diever Muñoz - Clear, Precise and Warm | `CAYdOeRRe8sLTuBjQ1ht` | 10 |
| TV: Maritza | Fernanda Sanmiguel - Neutral and Serious | `1aJyZpkt0vxhGPBnPyrs` | 4 |
| TV: Rodrigo | Juan Carlos - Expressive & Friendly | `GMEpD7vcmVahuyz6NuZA` | 3 |
| TV presenter | Ale Alejandro - Your Friendly Pal | `Fn8ZcuyNYI4qImgQ2yuH` | 5 |
| TV documentary narrator | Diever Muñoz - Clear, Precise and Warm | `CAYdOeRRe8sLTuBjQ1ht` | 5 |
| Reciclador | Charlee - Authentic Voice (Bogotá/Rolo) | `WwBoE3ZND2tj8noa9Obu` | 2 |

`manifest.json` records each line, voice, delivery tags, settings, and file hash.
The selected B take is preserved for `casa.onces`. API credentials and private
auditions are not part of this directory or the app.

Grandma uses the user's selected Sandra take 1 delivery:
`[elderly, warm, conversational]`. The remaining roles use the user's casting
map; TV reuses existing cast voices with distinct actors for Maritza and
Rodrigo. The original 79 recordings are preserved byte for byte.

The reciclador uses the user's selected Charlee B delivery:
`[strongly nasal, harsh, forceful, rhythmic street call]`. The longer call
preserves the approved audition; the short call uses the same voice and settings.
Distance and window muffling come from the room's audio engine. The wrong-number
bakery take now says "La Espiga", matching the shop across the street.

## Listening checklist

1. Run `npm run dev` and open `http://localhost:5173/?skip` with headphones.
   Use a fresh browser profile to hear bundled recordings without uploaded
   takes taking priority. Open the ⚙ backstage and check **192 of 192 lines**.
2. Call **Abuelita: 2459005**. Finish the conversation, including her attempt
   to keep you on the phone. Check warmth, age, natural pacing, and the
   blessing at the end.
3. Open `http://localhost:5173/?skip&t=900&open=phone` to call
   **Angie: 2125864** after her line is free. Try her father's two branches,
   then speak to Angie. Call the pharmacy **2176033**, the pizzería **2482020**,
   and an unassigned number. Start a fresh visit to hear the wrong-number
   caller around 5:35; pick up the extension between 5:45 and 5:48 for tía
   Gloria.
4. Tune FM **97.9, 88.9, 102.9**, and AM **770**. Listen through announcements
   and ads. Check that voices fit the station and remain clear under the
   music. Live time announcements are the known subtitle-only exception.
5. Turn on TV channels **7 and 11**, then **9**. Listen for distinct novela
   actors, the documentary narrator, presenter, and ads. Channel 9 normally
   plays real video clips when they are available; its fictional host is a
   fallback. The one-file build opened from disk uses fictional programs
   where external video cannot play.
6. Open `http://localhost:5173/?skip&t=255&open=window` shortly before the
   reciclador passes at 5:34:30. Listen with the pane closed, then open it;
   both the short and drawn-out calls should come from the street. He passes
   again at 5:50:20. The wrong-number caller around 5:35 now asks for La Espiga.
7. Open `http://localhost:5173/?skip&t=70&open=phone`: at 5:31:15 Andrés calls
   from a monedero in Unicentro (coins drop as you pick up) and asks you to
   tape «Florecita rockera»; his coins run out. Tape something, then jump to
   5:43 in the backstage: he calls from home to ask whether you taped it.
8. For a retake, send the **line ID** from `docs/voice-script.md`, or its first
   words, and a direction such as "faster", "less formal", or "older".

Automated validation checks complete line coverage, original text, file
hashes, MP3 decoding, non-silent audio, and loading into an empty browser.
Accent, delivery, pronunciation, and emotional fit need listening feedback.

How long each take lasts is read from its file when the page is built (see
`vite.config.ts`), so the radio can plan around a line before it has
downloaded. A retake only needs its file replaced; the next build picks up its
new length.

The browser check can be repeated against a running preview with
`node scripts/e2e-voices.mjs http://localhost:4173/?skip`. If Playwright's
Chromium is not installed, `PLAYWRIGHT_CHANNEL=chrome` uses an installed
Google Chrome in an isolated test profile.

## Generation program

`scripts/generate-voices.mjs` runs locally with Node and installed `ffmpeg`
and `ffprobe`. Its default is a dry run; adding `--generate` enables paid
requests. It uses `ELEVENLABS_API_KEY` from the environment, or the ignored
`media/private/elevenlabs.env`, and keeps all request state under the ignored
`media/private/` directory. It has no effect on the app's runtime.

```sh
node scripts/generate-voices.mjs \
  --plan=src/assets/voices/manifest.json \
  --state-dir=media/private/voice-regeneration \
  --budget=2000
```

The manifest is also a generation plan: each clip specifies its stable ID,
voice, original text, model, and delivery input. Existing bundled files are
verified and reused; the command above generates nothing when all are
present. A new plan can use a `lines` array with the same fields and top-level
`model_id`, `voice_settings`, and `seed` defaults.

With `--generate`, the program reserves credits before requests, saves each
completed MP3 and its reported cost, and validates the audio locally. Its
reserve uses 0.12 credits per input character for this standard-rate v4 cast;
check current pricing before using a different model or custom-rate voice.
The same command resumes a partial run by skipping completed takes. A failed or
uncertain paid request stops the run for inspection instead of retrying it.
Validated new files must be copied from the private run into this directory
and included in the manifest before they ship. Keep the API key and private
request audit out of Git.

ElevenLabs describes publishing rights for paid-plan output in its
[publishing guidance](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)
and [billing documentation](https://elevenlabs.io/docs/overview/administration/billing).
