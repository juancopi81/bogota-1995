# Setting up the test

About 15 minutes, once. After this, every change merged into `main` goes
live on its own.

## 1. The sheet that receives the visits

1. Create a Google Sheet, e.g. "Bogotá 1995 · visitas".
2. In it, **Extensions → Apps Script**. Replace everything in `Code.gs` with
   [`research/apps-script.gs`](../research/apps-script.gs) and save.
3. **Deploy → New deployment**. Type: **Web app**. Execute as: **Me**. Who
   has access: **Anyone**. Deploy, and allow the permissions it asks for.
4. Copy the web app URL (it ends in `/exec`). Opening it in a browser should
   say "Bogotá 1995: listo para recibir visitas."

Each visit becomes one row in a tab called `visitas`, with one column per
answer and per log field. If you ever change the script, use **Manage
deployments → Edit → New version** so the URL stays the same.

## 2. The site

In the GitHub repository:

1. **Settings → Pages**. Under "Build and deployment", Source: **GitHub
   Actions**.
2. **Settings → Secrets and variables → Actions → Variables**:
   - `RESEARCH_URL`: the web app URL from step 1.
   - `RESEARCH_CONTACT` (optional): an email or handle for questions, shown
     on the consent screen.
3. **Actions → Publish the room → Run workflow** (or merge anything into
   `main`).

The room is then at https://juancopi81.github.io/bogota-1995/. Without
`RESEARCH_URL` it's just the room, with no questions.

## 3. The pilot (3–5 people)

1. Send them the link; ask them to use a computer and headphones.
2. Check the sheet: each visit should reach `stage` = `done` once they've
   answered the exit questions.
3. Fix what didn't work. Then delete the pilot rows (keep the header row).

## 4. The ads

Add who sent the visitor to the link, so the sheet can tell ads apart:

```
https://juancopi81.github.io/bogota-1995/?utm_source=facebook&utm_campaign=prueba1&utm_content=lluvia
```

They land in the columns `ref_source`, `ref_campaign` and `ref_content`.
Target computers only, adults in Colombia (and Colombians abroad) who were
roughly 10–25 in 1995. See [`test-plan.md`](test-plan.md) for the rest, and
[`names-review.md`](names-review.md) before the first ad.

## What a row holds

| Columns | What |
|---|---|
| `visit`, `visitor`, `visit_n` | random ids; `visit_n` counts visits from the same browser |
| `stage` | how far they got: `load`, `gate` (a phone), `declined`, `consent`, `door`, `room`, `done` |
| `lived_1995`, `age_1995` | the door's two questions |
| `pre_*`, `post_*`, `change` | the six mood items at the door and the exit; `*_nostalgia` is the mean of the three nostalgia items, `change` the difference |
| `memory`, `triggers`, `return_intent`, `trait_*`, `feedback` | the rest of the exit |
| `s_*` | seconds: `s_total`, per view (`s_view_tv`…), per station (`s_radio_radioactiva`…), `s_tv`, `s_tv_clip`, `s_phone`, `s_tape_play`, `s_tape_rec` |
| `n_*`, `calls`, `opens`, `tv_channels` | what happened: requests, recordings, numbers dialed, close-ups opened, time per channel |
| `reached_6pm`, `exit_reason`, `min_at_exit`, `min_room` | whether they stayed until the anthem, how they left, minutes inside when they answered, and in all (some stay after answering) |
| `dev_*`, `ref_*`, `build`, `t_*` | screen and language, which ad, which version of the site, timestamps |
