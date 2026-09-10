# Open questions and backlog

Everything nobody has decided yet. The README describes what the app does today.

## Rules to confirm with FaB players

The pack layout came from the set's product description, but some numbers are our best
guess. Each entry says what we assumed and where it lives.

- [x] ~~**Basic vs Common equipment in the equipment slot.**~~ Resolved: Basic rarity is the
      pre-release kit, not pack content. Each hero comes with its weapon and its class Arms,
      and packs only ever supply the generic Head/Chest/Legs equipment.
- [x] ~~**Is Baalghor, Omen of the End a legal sealed hero?**~~ Resolved by
      [this prerelease guide](https://afabjourney.substack.com/p/flesh-and-blood-usurp-the-shadow):
      he is the kit's rainbow-foil promo and playable if you get him, with no weapon or Arms,
      using Shadow and Generic cards only. He is now the fourth (always-selectable) hero.
- [ ] **The 6–7 / 3–4 common split** is a straight coin flip, and the class commons are
      split as evenly as possible. The true distribution may be weighted.
- [ ] **The foil slot's rarity odds** (Rare 1.75%, otherwise Common) are back-derived from
      the per-pack averages we were given, not from published pull rates.
- [x] ~~**Should the export separate the deck from the sideboard?**~~ Resolved by testing
      against Fabrary, which neither exports nor imports sideboard cards. Splitting them here
      would only produce a list Fabrary discards, so everything selected stays one
      "Deck cards" list.

## Product backlog

The goal is to **simulate** an IRL sealed session, not to help you win one — you have no
analytics at a game store. Items are ordered by value.

- [x] ~~**Table deckbuilding UI**~~ — the big one, built to the spec in
      [notes/mtga-ui.md](../notes/mtga-ui.md) following [table-view-plan.md](table-view-plan.md):
      the pool is one row, the deck is columns of overlapping cards you drag around between
      and across both sections, and clicking sorts cards into single-colour piles in colour
      order until you take over by hand. Piles are unnamed for now — naming them is the
      obvious next step.
- [ ] **Export straight to Talishar**, the gameplay simulator, alongside the Fabrary copy —
      build the deck here, then jump into a game with friends.
- [ ] **First-time onboarding.** Explain in one screen what this is: open 8 packs at once,
      build a deck, play with friends — a simulation of real-life sealed deckbuilding.
- [x] ~~**Keep the layout stable when a card moves.**~~ Resolved by the table: a card lands
      in a pile you chose and stays there, and the pool row only loses the card you took.
- [x] ~~**Set aside the cards the hero cannot play.**~~ Resolved by the filter: they go grey at
      the end of the pool row, and are not drawn in the deck at all — one tile counts them and
      offers to clear them out.
- [ ] **A build timer.** Sealed events give you a fixed deckbuilding window, and building in
      20 minutes is a different exercise from building at leisure. Probably the highest
      fidelity win available.
- [x] ~~**Equipment slots.**~~ Resolved by the hero-kit model: Arms comes with the hero and
      packs only supply Head, Chest and Legs, so you get exactly one per slot and two pieces
      can never conflict.
- [ ] **Open the packs pack by pack.** The app hands you a finished pool, but the stated
      goal is simulating opening 8 packs — and that is the part players enjoy.
- [ ] **A "maybe" pile.** Everyone builds with three piles physically, not two.
- [ ] **Deck stats after the fact**, to critique a finished 30-card deck: pitch and cost
      curve, block profile, attack vs non-attack. Deliberately on-demand and tucked away,
      never ambient during building, so it stays a review tool rather than a crutch — you
      will not have it at a real event.

### Interface quality

- [ ] Persist the sort mode — it resets every time an event is opened.
- [ ] The card size is fixed at 220px, which is generous on a laptop: the pool row and one
      full column barely fit together. A zoom control may have to come back.
- [ ] Name the columns. The piles are the point; the rail above each one is already the right
      place to write "banish enablers" and read the table at a glance.
- [ ] Bring back "add all" / "remove all", which went with the old grouped panes. Some bulk
      way of clearing the off-hero cards out of the deck row would earn its place.
- [ ] Consolidate the two ways to clear a hero (toggle the portrait, or the "clear" link).
- [ ] The deck row can get very wide, one column per card, before you start piling. A
      "tidy up" that merges singles by rarity or class might be a kinder starting point.
- [ ] Reduce hover-only interactions: the pitch tooltips and the issues popup are mouse-only.
- [ ] There is no way to read a card's full text beyond the art itself, now that the hover
      preview is gone. Cards are large enough to read at rest, but a stacked card shows only
      its header.
- [ ] Main screen: show the hero portrait on each event row, and allow duplicating an event
      to try a different build from the same pool.

## Housekeeping

- [ ] **Read the test suite** (`src/*.test.ts`, 76 tests) — not yet reviewed by the owner.
- [ ] Add the README screenshot (`docs/screenshot.png`); the link is a TODO comment.
- [ ] Confirm the copyright holder named in [`LICENSE`](../LICENSE).
- [ ] Refresh the card data as the set is revealed: `npm update @flesh-and-blood/cards
      @flesh-and-blood/types && npm run fetch-cards`, then commit `src/data/cards.json`.
