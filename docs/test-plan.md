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
   that they can leave any time, 18+. "Entrar sin participar" lets anyone in
   without data.
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
   channel; calls dialed; requests; taping; whether they reached 6 p.m.;
   return visits from the same browser.

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

## Who

- **Pilot: 3–5 people**, friends are fine. It tests the procedure (does the
  flow work, does the data arrive, how long do people stay), not the room.
  Fix what breaks, then clear the sheet.
- **Then ads**, computers only, adults in Colombia (and Colombians abroad)
  who were roughly 10–25 in 1995, so 40–55 today. Start small to learn what
  one completed visit costs, then aim for **30–40 completed visits**
  (door and exit both answered).

Ad copy, honest and short: "Un cuarto de 1995 en Chapinero. Sábado, 5:30 p.m.,
está lloviendo. Ábralo en un computador, con audífonos."

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
  return visits within the test window, and where people dropped off
  (title, consent, door, room, exit).
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

## Data

- No names, emails or IP addresses. A random id per visit, and one per
  browser to count returns.
- Answers and the log go to a Google Sheet (see
  [`research-setup.md`](research-setup.md)).
- The consent screen says what's collected and that it's anonymous.
