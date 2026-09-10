# Working on this repo

## Show me the work before it leaves my machine

**Never commit, push, or open a pull request without showing me the change locally first.**

Make the change, verify it, then stop and tell me what to look at — the dev server is at
http://localhost:5173 (`npm run dev`). I will look at it and tell you whether to commit.

This applies to every git write: `git commit`, `git push`, `gh pr create`. Batching several
reviewed changes into one commit afterwards is fine; committing something I have not seen is
not. UI work in particular needs a human eye, since you cannot see the rendered page.

## Which model does what

- **Fable** is for brainstorming, design discussion, and writing plans.
- **Opus** is for implementation.

When running as Fable, **do not start any implementation work without asking first** — even
when the change seems obvious or the discussion points straight at it. Analyse, propose,
and stop; if the answer is to implement, expect a switch to Opus (`/model opus`).

## Commands

```bash
npm run dev          # http://localhost:5173
npm test             # vitest, 38 tests
npm run build        # tsc --noEmit && vite build -> dist/
npm run fetch-cards  # regenerate src/data/cards.json from @flesh-and-blood/cards
```

Run typecheck, build and tests before saying a change is done.

## Where knowledge lives

- **README.md** — what the app does today, and how a pack is simulated. Keep it current.
- **docs/TODO.md** — open questions and backlog. New unknowns go here, not into code comments.
- **notes/context.md** — the original brief, kept as history. Do not edit it to match reality.
- **src/packConfig.ts** — every tunable number of the simulation, with its derivation.

## Things worth knowing before changing code

- **Card names are not unique.** The same card exists once per pitch value, each with its own
  `id`. Always key on `id`, never on `name`.
- **Legality comes from `legalHeroes`**, not from matching classes. They agree in this set,
  but FaB has cards specialized to a single hero.
- **The card data is a committed snapshot.** The set is not fully revealed; regenerate it
  with `npm run fetch-cards` rather than hand-editing `src/data/cards.json`.
- **Dim cards with `brightness`, not `opacity`.** Copies of a card are stacked and overlap, so
  transparency lets the ones underneath show through.
