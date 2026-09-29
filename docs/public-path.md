# The public path: music without uploads

**The goal:** someone opens a link and the room just works. The radio plays
the songs, the DJ talks over the intro, the tape records it. Nobody uploads
anything.

**Status:** proposal for discussion. No code yet. Not legal advice (see the
last section).

## Short version

1. **Keep "your own files" as a mode, always.** It's the only way the real
   hits can play without anyone's permission, and it already works.
2. **For a public version, the radio needs music we're allowed to stream.**
   None of the shortcuts fit this room: not a streaming license, not Spotify,
   not YouTube as the radio, and not the 30-second previews (Apple's are for
   promotion only; Deezer's come with conditions that clash with the radio and
   the tape). The reasons are specific, and listed below.
3. **The backbone should be original songs "from 1995".** Commission a few
   Bogotá musicians to write and record songs for fictional bands in the
   styles on the dial. Everything keeps working: requests, the DJ over the
   intro, the tape.
4. **Bring the real hits in where the rules allow it.** Official music videos
   can play on the TV (an ordinary YouTube embed). Direct permission from a
   few artists could put their songs on the radio; Aterciopelados, in the week
   *El Dorado* came out, would be the first to ask.
5. **Fair use won't cover it.** An open-source license covers our code, not
   the songs, and Colombia has no fair use at all.

## Why "it's open source, so it's fair use" doesn't hold

- **The license is ours, the songs aren't.** An open-source license says what
  others may do with *our* code and art. It grants nothing over Soda Stereo's
  recording.
- **US fair use weighs four factors**: purpose, nature of the work, amount
  used, and effect on the market ([U.S. Copyright Office](https://www.copyright.gov/fair-use/more-info.html)).
  The room plays whole songs, which are highly creative works, for the same
  reason people normally listen to them. That's the weak end of all four.
  Saying it's "for entertainment" or noncommercial doesn't change that much
  ([YouTube's fair-use guide](https://support.google.com/youtube/answer/9783148?hl=en)).
- **Colombia has no fair use.** Copyright in Colombia follows the Andean
  Community's Decisión 351 (1993), which allows only a closed list of
  exceptions (quotation, teaching, libraries…) under the three-step test. There
  is no general, flexible exception like the US one
  ([Universidad de los Andes](https://repositorio.uniandes.edu.co/server/api/core/bitstreams/f54b20c5-a71c-4629-8891-03666bb99873/content),
  [Academia Colombiana de Jurisprudencia](https://revista.academiacolombianadejurisprudencia.com.co/index.php/revista_acj/article/download/191/188/)).
- **Streaming a song to the public is "comunicación pública"**, and needs
  authorization. In Colombia, SAYCO represents authors and composers, and
  ACINPRO represents performers and record producers. OSA (Organización Sayco
  Acinpro) licenses businesses
  ([OSA](https://www.osa.org.co/), [Portafolio](https://www.portafolio.co/negocios/empresas/sayco-y-acinpro-como-funciona-el-pago-de-derechos-de-autores-musicales-en-colombia-629647)).
- **In practice:** a public page streaming the hits would draw takedown
  notices, and song files in the GitHub repo would be removed.

## The options, one by one

### 1. Your own files (what exists now)

Each visitor loads songs they own; the files never leave their browser.

- **Keeps:** everything, with the real songs.
- **Costs:** friction. Most visitors won't have the files at hand.
- **Verdict:** keep it forever, as the "bring your records" mode. It can't be
  the default for strangers.

### 2. A webcaster's statutory license (US: SoundExchange plus ASCAP/BMI/SESAC/GMR)

Online radio stations in the US can pay set rates instead of asking every
label. The rules that come with it clash with this room:

- **No requests.** A service that plays "a particular sound recording …
  selected by or on behalf of the recipient" is *interactive*, and the
  statutory license excludes interactive services
  ([17 U.S.C. §114(j)(7)](https://www.law.cornell.edu/definitions/uscode.php?width=840&height=800&iframe=true&def_id=17-USC-1276129143-90470929&term_occur=999&term_src=)).
  The request line, the room's designed thread, is exactly that.
- **No announcing what's coming.** Song titles can't be announced in advance
  ([Broadcast Law Blog](https://www.broadcastlawblog.com/2021/02/articles/looking-at-the-performance-complement-and-other-rules-that-apply-to-webcasting-companies-relying-on-the-sound-recording-statutory-license/)).
  The DJs do it all the time ("ya viene…").
- **Rotation limits.** No more than 3 songs from one album, or 4 by one
  artist, in any 3 hours (same source). Radioactiva's heavy rotation of *El
  Dorado* breaks that.
- **US only**, and the tape still records a copy.
- **Verdict:** a poor fit. It would mean removing the room's best parts.

### 3. The visitor's own streaming subscription (Spotify and similar)

The page plays songs through the visitor's account.

- Spotify's Web Playback SDK needs Premium. Its policy forbids mixing or
  overlapping Spotify audio with other audio (the DJ over the intro, the
  static), syncing it with visuals, and anything that captures the stream
  (the tape)
  ([Spotify developer terms and policy](https://developer.spotify.com/terms), [SDK](https://developer.spotify.com/documentation/web-playback-sdk)).
- Technically, subscription audio is copy-protected. The browser won't let
  the page process it: an AM filter, static or a recording gets silence
  ([Web Audio spec discussion](https://github.com/WebAudio/web-audio-api/issues/2547), [Firefox bug on EME](https://bugzilla.mozilla.org/show_bug.cgi?id=1331763)).
- **Verdict:** no. The radio would stop being a radio.

### 4. YouTube as the radio's source

- YouTube's policies forbid separating the audio from the video, and players
  that aren't shown to the user
  ([YouTube API Services policies](https://developers.google.com/youtube/terms/developer-policies)).
  A radio has no picture.
- **Verdict:** no for the radio. **Yes for the TV:** an official music video
  playing on the TV is an ordinary embed. It could be a "Sábado Musical" on
  Canal A with the videos of the songs on the dial. For example, the official
  video of «Florecita rockera» is on YouTube
  ([`_MB30bHR6Cs`](https://www.youtube.com/watch?v=_MB30bHR6Cs)). Not added:
  it needs your OK, like every clip.

### 4b. Streaming the 30-second previews (Deezer, Apple)

Both services give out 30-second previews that play without an account. The
room could fetch them while it runs, so nobody would upload anything.

- **Apple: no.** Its previews may only promote the store: on a page that
  promotes that song, next to a badge linking to buy it, credited "provided
  courtesy of iTunes", streamed without caching, and "not used for independent
  entertainment value apart from their promotional purpose"
  ([Apple's Search API terms](https://performance-partners.apple.com/search-api)).
  A radio room is entertainment.
- **Deezer: closer, with strings attached.** Deezer's community team says a
  noncommercial game may use previews if it credits Deezer for the audio
  ([Deezer community](https://en.deezercommunity.com/deezer-for-creators-55/use-preview-api-for-trivia-music-game-83063)).
  The developer terms add a visible Deezer logo, no modifying the content, and
  no associating it with other brands
  ([terms](https://developers.deezer.com/termsofuse), [developer FAQ](https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers)).
  What that would mean in the room:
  - **The radio couldn't touch the sound.** Deezer's newer preview links don't
    let a web page process the audio
    ([Deezer community](https://en.deezercommunity.com/other-devices-49/api-access-control-allow-origin-80021)).
    So there would be no fade-in as you tune and no AM filter, only volume.
    Static and the DJ could still play on top; whether that counts as
    "modifying" is a question for Deezer.
  - **The tape couldn't record the song.** It could remember what was on the
    air and replay the preview from Deezer, but that isn't a copy anymore.
  - **Only 30 seconds**, usually from the middle of the song rather than the
    intro the DJ talks over.
  - **The station names are brands** (Radioactiva, Tropicana…) sitting next to
    Deezer's content, which their terms don't allow.
  - **It needs its own website:** the claude.ai link can't reach Deezer.
- **Verdict:** Apple is out. Deezer is possible as an experiment on a public
  site, with the Deezer logo and credit and renamed stations, after asking
  Deezer's developer support. It would sound thinner than your files.

### 5. Direct permission for the real recordings

A license for each song from whoever owns the recording (the label) and the
composition (the publisher, through SAYCO in Colombia).

- **Keeps:** everything, for real.
- **Costs:** 18 songs means several labels and publishers, majors among them.
  Majors rarely license to small projects, and never quickly. Colombian artists
  and independent labels might agree to a noncommercial Bogotá-memory project.
- **Verdict:** worth asking selectively once the room is convincing. Start
  with the songs that define the moment (*El Dorado*), and ask the artists
  first.

### 6. Original songs "from 1995"

Commission Bogotá musicians to write and record songs for fictional bands,
in the styles on the dial: rock en español for Radioactiva, pop for Súper
Estación, vallenato and salsa for Tropicana. The production should sound like
the era (the kind of mix that sounded good on a boombox and on a C-60).

- **Keeps:** everything. Requests, DJ intros, the tape. The DJs can talk about
  the bands ("los muchachos de Chapinero que están sonando duro").
- **Loses:** recognizing the real hits, the strongest nostalgia trigger.
  Mitigations: the real songs still play for anyone who loads their files, and
  their official videos can play on the TV.
- **Gains:** something no other room has, all of it public. It also fits Lost
  Futures later: songs that could have existed.
- **Careful:** a style isn't protected, but a melody or lyrics are. No
  sound-alikes of specific songs.
- **Size:** 3–5 songs to start (one or two per station) plus jingles. Voices
  for the DJs can come from the same session.
- **Verdict:** the backbone of a public version.

### 7. Public domain and Creative Commons

Nothing from 1995 is in the public domain: the term is the author's life plus
80 years in Colombia. Creative Commons music (e.g., Free Music Archive,
Jamendo) exists in these genres, but it won't sound like Bogotá radio in 1995.

- **Verdict:** filler at most (ad jingles, background beds).

### 8. Archives and partners

RTVC's Señal Memoria keeps public radio and TV archives. IDARTES runs Rock al
Parque. A Bogotá-memory project might get archival radio, maybe real
broadcasts from 1995, and help with rights.

- **Verdict:** a long shot with a big payoff. Worth a conversation once there's
  a public version to show.

## What I'd do, in order

1. **Now:** keep your own files and make the private room sound real: voices
   (TTS or recordings), your MP3s, the anthem.
2. **Before any public link:** the names and brands review (already an open
   item in `v0.md`) and a decision on the music mode.
3. **Public v1:** original songs as the radio's music, official music videos
   on Canal A, and "bring your records" for people who have them.
4. **In parallel:** ask Aterciopelados (and one or two others) about a
   noncommercial public version; talk to Señal Memoria about archival radio.

## A note on voices

If the voices come from text-to-speech (e.g., Piper), check two licenses
before going public. Piper's code is GPL-3.0 (it doesn't cover the audio you
generate), and each voice model has its own license: some allow any use,
others only noncommercial. Check the voice you pick.

## Before publishing: questions for a Colombian IP lawyer

- Does a free, noncommercial website that streams music to visitors need
  licenses from SAYCO/ACINPRO (and from whom abroad)?
- Real names in a fictional recreation: the stations and channels
  (Radioactiva, Tropicana, RCN, Caracol, Cadena Uno), the TDK cassette, and
  the real places and institutions named in the invented ads (Unicentro, the
  Alcaldía). Keep them or rename them?
- The Señal Memoria and fan-uploaded clips: is an embed on a public site
  enough, or do we need RTVC's permission?
- Commissioned songs: what should the contract with the musicians say
  (ownership, credit, reuse in later projects)?
