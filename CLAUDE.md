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
npm test             # vitest, 115 tests
npm run build        # tsc --noEmit && vite build -> dist/
npm run fetch-cards  # regenerate src/data/cards.json from @flesh-and-blood/cards
```

Run typecheck, build and tests before saying a change is done.

## Where knowledge lives

- **README.md** — what the app does today, and how a pack is simulated. Keep it current.
- **docs/TODO.md** — open questions and backlog. New unknowns go here, not into code comments.
- **notes/context.md** — the original brief, kept as history. Do not edit it to match reality.
- **notes/mtga-ui.md** — the owner's spec for the table deckbuilding view. Same rule: it is
  the brief, not a description of the code. `docs/table-view-plan.md` is how it was built.
- **docs/ui.md** — the design log of how the build screen behaves and why. The README stays
  user-facing: simulation model and the few things a player cannot discover alone.
- **src/packConfig.ts** — every tunable number of the simulation, with its derivation.

## Things worth knowing before changing code

- **Card names are not unique.** The same card exists once per pitch value, each with its own
  `id`. Always key on `id`, never on `name`.
- **Legality comes from `legalHeroes`**, not from matching classes. They agree in this set,
  but FaB has cards specialized to a single hero.
- **The hero kit is this set's own equipment**, spotted by its talent — not "anything that is
  equipment". A generic piece was spoiled mid-project and gave every hero two Legs slots.
- **Only the hero and its weapon are auto-included.** Everything else the kit guarantees is a
  selectable singleton in the pool, derived by `kitEquipment` at render rather than stored, so
  old events gain it without a migration. A test pins the guaranteed set.
- **Basic equipment is never opened.** The equipment slot skips it — it is kit material — so
  the class Arms are guaranteed to you but unopenable, and the slot's uniform draw is only
  correct because every piece it *can* reach is Common. A test fails if that stops being true.
- **Equipment is not deck material.** It lives in `event.arena` beside the columns, never in
  them, and its only drop target is the arena stack. In sorting it counts as pitch 0 — ahead
  of the reds, but never ahead of a better rarity.
- **Legendary and Fabled do not exist** anywhere in the model — not in the `Rarity` type, the
  ladder, the odds, or the card snapshot. See the README for why.
- **The card data is a committed snapshot.** The set is fully revealed, so it should only move
  if the source data is corrected — regenerate with `npm run fetch-cards` rather than
  hand-editing `src/data/cards.json`. Several tests exist to fail when that data changes
  something load-bearing; read them before overriding one.
- **Dim cards with `brightness`, not `opacity`.** Cards in a column overlap, so transparency
  lets the ones underneath show through.
- **The deck is columns of counts, not card instances.** Every rule about piles lives in
  `src/columns.ts` as a pure function and is tested there; the components only render it.
- **The table is laid out in pixels** (`src/cardMetrics.ts`), not in container-query units.
  One card width for everything, published to CSS as `--card-w` by `Table.tsx`, and the
  overlap offsets are computed in JS. `CARD.stepOverBadge` and the `.copies` rule in
  styles.css are two halves of the same decision: change one and check the other.
- **All the drag and drop is one `DndContext`** in `src/Table.tsx`, because cards cross
  between the pool and the deck. What a drop means is decided by the custom collision
  detection there, not by where the droppables happen to be.
- **A screen's `onChange` can outlive its event.** The build clock banks its time as the event
  screen unmounts, which is *after* a delete has run. `App.updateEvent` reads the current list
  from a ref and ignores writes to an event that is gone — without that, deleting from the menu
  silently resurrected the event. Any new late write needs the same care.
- **A card has three gestures on it**: click (select/deselect), drag, and press-and-hold
  (open it full size). They share one pointer stream, so `CardGroupView` cancels the hold on
  movement and `Table` closes the overlay when a drag starts. Change one and check the other
  two still work.
