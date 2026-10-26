# Test plan: does the room make people nostalgic?

## The question

Does a visit to the room make people who lived in Bogotá in the 90s feel
nostalgic, and which parts of it bring the memories back?

What we'll know at the end:

- **How much nostalgia rises** between the door and the exit.
- **How many people write down a real memory**, and how specific it is.
- **Which objects bring memories back**: the radio, the tape, the phone, the
  TV, the window, the room itself.
- **Whether strangers stay and come back.**

That tells us whether to fix the room or build features, and which feature
first (the radio points to shared evenings, the tape to the mixtape exchange,
the TV to more clips).

## Design

One group, measured at the door and at the exit (a pre/post design). The
door question about nostalgia is hidden among three ordinary mood items, so
the purpose is less obvious.

1. **Title card**, then **consent**: what we collect, that it's anonymous,
   that they can leave any time, 18+. "Entrar sin participar" lets anyone in;
   for them only the visit is counted (when, which version of the room, which
   link brought them).
2. **At the door** (about 40 s):
   - Where they lived in 1995 and how old they were.
   - Six mood items, 1–7: three of them are the state-nostalgia items from
     Wildschut et al. (2006).
3. **The room**, for as long as they want. A "Salir del cuarto" button is
   always in the corner; at 6:04 p.m., after the anthem, the afternoon ends
   on its own.
4. **At the exit** (about 2 min), in two short steps so nothing hides below
   the fold (in the pilot, some people sent the form without scrolling to
   the rest):
   - Step 1: the same six mood items. They're saved as soon as they're in
     (`stage` = `exit`), even if the visitor leaves before step 2.
   - Step 2, all on one screen, all optional:
     - "¿El cuarto le trajo algún recuerdo?" (free text).
     - What brought it back (pick any).
     - Would they come back.
     - Two trait-nostalgia items from the Southampton Nostalgia Scale (asked
       at the end so they don't prime the visit).
     - "¿Algo no le sonó a 1995, o no funcionó?"
   - Then, as thanks, a few memories earlier visitors left: only those they
     agreed to share and you approved. It comes after every answer, so it
     can't sway them; the hint near "Enviar" mentions it, as a reason to
     finish. Whether to share is a checkbox under the memory, off by default.
5. **Anonymous log** of what they did: seconds per object, station and
   channel; calls dialed (the numbers the room gives you as they are; any
   other number only counted, since it could be someone's real one);
   requests; taping; whether they reached 6 p.m.; return visits from the same
   browser.

## The questions (as asked, in Spanish)

**Door**

- En 1995, ¿dónde vivía? En Bogotá · En otra ciudad de Colombia · Fuera de Colombia
- ¿Cuántos años tenía en 1995? Menos de 10 · 10 a 14 · 15 a 19 · 20 a 24 · 25 o más · No había nacido
- "Ahora mismo, ¿qué tan de acuerdo está?" 1 (nada) – 7 (totalmente), in this order:
  1. Me siento tranquilo o tranquila.
  2. Me siento bastante nostálgico o nostálgica. *(N1)*
  3. Me siento aburrido o aburrida.
  4. Tengo sentimientos de nostalgia. *(N2)*
  5. Me siento contento o contenta.
  6. Siento nostalgia en este momento. *(N3)*

**Exit**

- The same six items.
- ¿El cuarto le trajo algún recuerdo? Si quiere, escríbalo aquí (sin nombres ni datos personales).
  - ☐ Pueden mostrar mi recuerdo a otros visitantes, sin datos míos.
- ¿Qué se lo trajo? La radio · La grabadora y el casete · El teléfono · La televisión · La ventana y la calle · Las cosas del cuarto · Las voces · La música · Nada en particular
- ¿Volvería a entrar a este cuarto? Sí · Tal vez · No
- En general, ¿qué tan seguido siente nostalgia? 1 (muy rara vez) – 7 (muy seguido)
- ¿Qué tan propenso o propensa es a sentir nostalgia? 1 (nada) – 7 (mucho)
- ¿Algo no le sonó a 1995, o no funcionó?

## Who, and in what order

Four stages, each with a check before the next. The room doesn't change
during a stage.

| Stage | Who | What it's for | Before the next |
|---|---|---|---|
| 0. Ready | nobody yet | the privacy fixes live; the invented businesses checked ([`names-review.md`](names-review.md)); this plan committed | all three done |
| 1. Pilot | 3–5 friends who lived in Bogotá in the 90s, on their own computers, with headphones and no tips | the procedure: does the flow work, does the data arrive | nothing broken |
| 2. Calibration | a small paid run, 3–4 days | what one completed visit costs, and how long strangers stay | the main budget; the request-number rule below |
| 3. Main run | paid, with the room frozen | 30–40 completed visits | the stopping rule below |

Each stage has its own link, so the sheet tells them apart (`ref_campaign`)
and nothing needs deleting:

| Stage | Link (after `https://juancopi81.github.io/bogota-1995/`) |
|---|---|
| Pilot | `?utm_source=amigos&utm_campaign=piloto` |
| Calibration | `?utm_source=facebook&utm_campaign=calibracion&utm_content=lluvia` (one `utm_content` per visual) |
| Main run | `?utm_source=facebook&utm_campaign=principal&utm_content=…` |

### The ads

- **Where:** Facebook and Instagram, with a traffic (landing page views)
  objective, not a lead form.
- **Who:** adults in Colombia, and Colombians abroad if the platform still
  offers that, aged 40–55 (roughly 10–25 in 1995). Broad, without interests
  like "nostalgia" or "rock en español": those would deepen the
  self-selection.
- **Devices:** computers only, if the platform allows it. If that costs too
  much in calibration, phones are let in and the note asking for a computer
  becomes part of the funnel (`stage` = `gate`).
- **When:** evenings and Saturday afternoons, when people are at a computer
  with half an hour to spare.
- **Copy**, honest and short, the same for the whole run: "Un cuarto de 1995
  en Chapinero. Sábado, 5:30 p.m., está lloviendo. Ábralo en un computador,
  con audífonos." No station names, logos, songs or artists (see
  [`names-review.md`](names-review.md)).
- **Visuals:** up to two in calibration (a still of the window in the rain, a
  short clip of the room), each with its own `utm_content`. The main run keeps
  the one that brought more completed visits.
- **Budget:** a small fixed amount for calibration. It gives the cost of one
  completed visit; the main budget is that cost times the visits still
  needed, with a cap set before the run starts.

### During the main run

- **The room is frozen:** nothing merges into `main` unless something is
  broken. If a fix goes in, the `build` column tells the visits before and
  after it apart.
- **A daily look for breakage:** `npm run visits -- --campaign principal`.
  Many visits stuck at `load` means the page isn't loading; many at `gate`,
  phones.
- **No peeking at the result:** the nostalgia scores aren't looked at until
  the run ends.

## Decided before any data

Written on 9 October 2026, before any visit from a stranger. If something
here changes, the change gets its own dated note.

- **A completed visit** has the door and the exit's six phrases answered
  (`stage` = `exit` or `done`).
- **What counts:** visits from the main run (`ref_campaign` = `principal`),
  and from calibration if the room didn't change in between. Not the pilot,
  not visits without a campaign, not our own browser
  (`npm run visits -- --skip <visitor id>`).
- **When to stop:** at 30–40 completed visits, or when the budget cap is
  spent, whichever comes first. The count alone decides.
- **The request number:** Radioactiva first gives its request number at
  5:38:27, 8½ minutes in, and a request can first air at 5:44
  (`src/research/moments.ts`). If more than half of the calibration visitors
  who get into the room leave before 8½ minutes, the first announcement moves
  earlier before the main run, and then only main-run visits count.
- **The analysis** is the one below, as written here.

**Changed on 12 October 2026**, after the pilot's first visit, before any
visit from a stranger. Nothing changed in the room or on the site. The thanks
screen sends visitors back into the room, and the pilot's first visitor
answered at 6.6 minutes and stayed until 23.9, so:

- **Every send is kept** in the sheet's second tab, `envios`, as it came. The
  comparison between the objects people name at the exit and the time they
  spent on each uses the log as it stood when they answered, not the whole
  visit's.
- **If the six phrases at the exit are answered more than once** (someone
  answers them, goes back from the second step, and answers again on a later
  exit), the last answer counts. The main result is also reported without the
  visits that opened the exit more than once (`exit_shown` > 1).
- **Staying after answering** (minutes in the room after `min_at_exit`) is
  part of "staying and returning".
- A merge that doesn't touch the room still gives the site a new `build`.
  Whether the room changed between two builds is in git:
  `git diff <build> <build> -- src public index.html`.

**Preparation on 23 October 2026: Google Display calibration.** Meta's
advertising restriction is under support review. Prepare a separate Google
recruitment run; no campaign is launched by this note.

- Keep the pilot check, frozen room, completed-visit definition and main
  stopping rule above. This changes recruitment, not the room or questionnaire.
- Use Google Display Network only, either Standard Display if available or
  Demand Gen with the other channels deselected. Colombia, Spanish,
  computers; no interest, remarketing or customer-list targeting. Turn off
  optimized targeting so the requested audience isn't merely a suggestion.
- Google uses age bands. Prepare 35–44, 45–54 and 55–64, excluding unknown,
  to cover the original approximate 40–55 range. This broadens recruitment
  to estimated ages 35–64. Keep the existing age-in-1995 and residence
  questions, and report the existing analysis strata; do not treat ad
  targeting as proof that a participant lived in Bogotá in 1995.
- Two still-image concepts, rain/window and radio/window, each with square
  and landscape sizes, replace the still/clip pair for this calibration.
  Keep their copy identical and do not add nostalgia-interest cues.
- Use `utm_source=google`, `utm_campaign=calibracion_google`, and
  `utm_content=lluvia` or `radio`. Review with
  `npm run visits -- --campaign calibracion_google`; exclude our own browser.
  Keep this source distinct from Meta and pilot visits. Any later inclusion
  in the main analysis must identify this recruitment amendment.
- Proposed ceiling: COP 60,000 media spend over four account-local calendar
  days, with start/end dates set after approval. Prefer a supported campaign
  total budget. For legacy Display with a verified 2× daily billing limit,
  COP 7,500 average/day for at most four days gives a COP 60,000 upper bound;
  average spend may be closer to COP 30,000. No budget increases or automatic
  extension. Confirm taxes/fees and the final payable limit before launch.
- Evaluate cost per completed visit, retention and technical drop-off.
  Report completed visits from people who lived in Bogotá separately.
  Ad delivery is not randomized, so the two creatives are a practical
  recruitment comparison, not a causal A/B test. Do not inspect mood changes
  during recruitment. No Google pixel or additional participant tracking.

Local preparation files: `media/private/google-display-2026-10-23/` (ignored
by git). The manifest records copy, links, assets, proposed settings and
launch checks.

**Configured on 23 October 2026:** the Google account is set up with COP
and Colombia's time zone, and the campaign is saved as an unpublished draft.
The actual setup is Demand Gen with Google Display Network selected alone,
Maximize clicks, Colombia presence, Spanish, computers and estimated ages
35–64. Optimized targeting and automatic creative enhancements are off.
Both image ads have their own links and the same copy. No Google tag was
installed and no study code changed.

The saved campaign-total budget is **COP 60,000 for three days**, provisionally
24–26 October. Google rejected COP 60,000 for four days (the displayed minimum
was COP 76,000); shortening the run resolved that budget error. This remains
within the planned 3–4 day calibration. Reconfirm the dates, complete
advertiser verification, review taxes/fees and approve launch before
publishing. The user's approval covers preparation, not ad delivery.

**Updated on 23 October 2026 after creative review:** the user selected the
rain still and the existing 15-second room video as the two calibration
creatives. The video replaces the radio still and is hosted unlisted on
YouTube; its URL and upload evidence stay in the private preparation folder.
Paid links use `utm_content=lluvia` and `utm_content=video`, both under
`utm_campaign=calibracion_google`. The YouTube description uses a separate
`presentacion` campaign so ordinary video-link visits aren't counted as paid
calibration recruitment. The COP 60,000 total, provisional three-day window,
audience and GDN-only inventory are unchanged. Video shortening/resizing,
generated text, overlays and landing-page previews are off, alongside the
previous creative-enhancement opt-outs. The ad campaign remains unpublished.

**Pre-launch check on 23 October 2026:** the sheet contains 23 visits, including
seven completed visits with all six entrance and exit items. All seven have
blank campaign tags, so this verifies collection, not a separately identified
3–5-person pilot cohort. The `envios` export has 91 valid history records for
11 visits. Six completed visits predate its first record on 14 October.

All `aprobado` cells are blank, and the live memories endpoint returns an empty
list. Keep approvals blank throughout recruitment; retain the original answers.
Both saved ad URLs were checked in Google Ads: source `google`, campaign
`calibracion_google`, and content `lluvia` or `video`. Two existing visits already
carry the calibration tag; they are pre-launch traffic, not paid recruitment.
The private preparation folder holds the current record IDs and CSV snapshots.
Refresh that baseline and record the actual launch time before publishing.

Google verified the advertiser details, recorded the self-funded declaration,
and cleared the EU political-ads declaration. Identity verification still needs
the account owner's ID and separate privacy consents in Google's open form.
The campaign remains unpublished at COP 60,000 total.

**Review after identity verification, 23 October 2026, 15:17 Colombia time:**
Google's account history records advertiser verification as "Verification
successful — Complete" at 12:42. The policy summary shows no account or ad
issues. The separate financial-services Beta application prompt for `github.io`
remains; no financial-services certification was requested for this room.

The live draft still matches the approved settings, dates, creatives and source
links. Google's low-budget, single-channel and medium-ad-strength notices are
recommendations, not a confirmed ad-policy approval or rejection. The refreshed
visit export is identical to the earlier 23-row snapshot; public memories remain
empty. Pilot-participant provenance still needs confirmation because the seven
completed visits have no campaign tag.

Billing shows an individual Colombia profile with no displayed Colombia tax
information. [Google's Colombia tax guidance](https://support.google.com/google-ads/answer/2375370?hl=es-419)
says 19% VAT applies when tax information is not provided. If charged on the
full COP 60,000 media spend, VAT would be COP 11,400 and the total COP 71,400.
This is a conditional billing estimate, not a posted charge. Confirm the final
tax-inclusive spending limit before publishing; no tax settings, campaign
budget or launch authorization changed during this review.

**Pilot-origin clarification, 23 October 2026:** the user confirmed that the
existing rows come from the pilot and should remain as recorded. Accept that
provenance confirmation; blank historical campaign tags do not require deleting
or relabelling those rows. Keep the saved pre-launch visit IDs and actual launch
time separate from the new Google campaign tags when counting paid recruitment.
This does not infer a distinct participant count from the number of visits.

**Ad copy approved on 23 October 2026:** use the same description in the rain
and video ads: "Sábado, 5:30 p. m. Explore un cuarto interactivo en su computador
con audífonos." The user preferred "en su computador con audífonos" to the
earlier wording. The headline remains "Un cuarto de 1995 en Chapinero" and the
business name "Bogotá 1995". This replaces the earlier ad descriptions; it does
not change the room, the video itself, tracking links or audience. Both updated
descriptions were reopened and checked after saving. The campaign-total budget
remains COP 60,000, the dates remain provisional, and the draft is unpublished.
No copy A/B test was added; launch still needs the user's separate approval.

**Published on 23 October 2026, 15:59 Colombia time:** after the user's explicit
authorization for COP 60,000 media spend plus IVA if applicable, Google confirmed
"Campaña publicada". The published campaign ID is `24395866474`; the earlier
draft identifiers are retained only as preparation history. The campaign-total
budget remains COP 60,000 and the dates are 24–26 October. Both the rain and
video ads are enabled and in review. The first scheduled delivery window starts
Saturday 24 October at 15:00 Colombia time, subject to ad approval; the campaign
was pending start with zero impressions and zero media spend when checked.

The fresh launch baseline contains the same 23 pre-launch visits, including
seven completed visits and zero nonblank approvals. Keep those rows unchanged.
The private `launch-record-2026-10-23.json` contains their visit IDs, snapshot
hash, publication confirmation and earliest scheduled serving cutoff
(`2026-10-24T20:00:00Z`). Exclude pre-launch IDs and arrivals before that cutoff
when preparing the paid recruitment CSV; filtering only on `calibracion_google`
would also include the two pre-launch tagged visits. No automated monitoring,
automatic budget increases or extensions were configured.

**Paused on 25 October 2026; the entrance fixed on 26 October:** the one day
of delivery (Saturday 24 October, 15:00–21:00) cost COP 28,207 for 134 clicks,
all from computers, and brought 146 tagged visits, of which one reached the
exit. Two thirds never got past the title card; 27 got the note for phones
although Google served only computers; 15 of the 16 who agreed left at the
door questions. The user paused the campaign on Sunday morning, and its dates
(24–26 October) have since ended. The note for phones also caught any screen
under 600 CSS pixels on a side, which laptops report at 125–150% display
scaling. The questions were drawn inside the room's 1600×900 stage and shrank
with it, to about 12-pixel text and 25-pixel buttons in the commonest window
(1366×641). The title card had no button, opened only on a pointer press, and
did nothing for the keyboard.

The fixes change the entrance, not the room, and not the questions' wording,
order or items:

- The note for phones only goes to touch screens with nothing finer to point
  with. Any computer with a mouse or a trackpad gets the room.
- The title card shows the room behind it and has an "Entrar" button with the
  focus, so a click anywhere or the Enter key opens it. Its hint is "Póngase
  audífonos." (it said "Toque para entrar").
- The questions are drawn at the window's own size: in a 1366×641 window the
  door fits on one screen with 17-pixel text and 36-pixel buttons. "Entrar al
  cuarto" and "Siguiente" respond before everything has an answer: they mark
  what's missing and the hint counts it ("Faltan 3 respuestas.").
- New counts, no answers: `stage` = `asked` once a visitor is past the title
  card (nothing about them, before consent); and for those who agreed,
  `n_door` and `s_door`, how many of the door's eight questions had an answer
  and for how many seconds they'd been up, sent also when the tab closes.
- A phone's first send already says `gate`. Two sends in a row could arrive out
  of order, and a late `load` hid the gate in the sheet's row; in the
  calibration export, 27 gates showed only in the history tab.

Visits from here on carry a new `build`. The calibration's earlier visits are
the baseline for these entrance failures, not completion data to pool with
later ones. Starting the ads again needs the user's approval.

## Analysis

- **Main result:** the nostalgia score (mean of N1–N3) at the exit minus at
  the door, per person. Report the mean change with a confidence interval
  and the share of people whose score went up. A paired test (Wilcoxon) and
  an effect size, but the interval matters more than the p-value.
- **Memories:** the share who wrote one; a simple coding of each (specific
  vs. generic; about a person, a place, a sound, an object).
- **Triggers:** how often each object was named, next to how long people
  actually spent with it (from the log).
- **Staying and returning:** minutes in the room, share reaching 6 p.m.,
  the share still inside when each of the afternoon's moments comes up
  (`npm run visits`), return visits within the test window, and where
  people dropped off (title, consent, door, room, exit).
- **Context:** split by lived in Bogotá vs. not, and by age in 1995; use the
  trait items to check the change isn't only nostalgia-prone people.

## Limits we'll state

- **No original hits.** Unless people load their own MP3s, each station
  repeats its 2–3 Creative Commons tracks. The result is for "the room
  without the original songs".
- **No control group.** Some of the change can come from being asked twice.
  A later test can compare the room with a generic 90s room.
- **Self-selection.** People who click a nostalgia ad are already inclined
  to it; the trait items let us account for some of that.
- **Computers only.** Phone visitors see a note asking them to open it on a
  computer; the log counts how many.
- **Friends are patient.** How long the pilot's visitors stay says little
  about strangers; calibration is where that's measured.

## Data

- No names, emails or IP addresses. A random id per visit, and one per
  browser to count returns.
- Before consent, and for anyone who enters without taking part, only when
  they came, which version of the room, which link brought them, and how far
  they got (past the title card, or declined). The
  browser's id, the screen size, language and time zone come only with a
  yes.
- Phone numbers dialed in the room are kept only if the room gave them
  (the libreta, the radio, the almanaque...). Any other is stored as `otro`:
  visitors may dial their own old numbers.
- Answers and the log go to a Google Sheet (see
  [`research-setup.md`](research-setup.md)).
- The consent screen says what's collected and that it's anonymous.
