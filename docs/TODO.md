# Open questions and backlog

What is still open, and the things we decided *not* to do so they do not come back around.
Anything already built is described in the README instead of here.

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
- [ ] **The 20-minute build window** the clock's colour is calibrated against is the
      pre-release figure as we understand it, not one we have confirmed. It lives in
      `BUILD_SECONDS`, with the red point five minutes past it.
- [ ] **Is there an equipment slot in a pack after all?** The 2026-09-10 data refresh added
      **Dark Arcanite Boots**, a Common *Generic* Legs equipment — the first equipment in the
      set that is not Shadow. We treat equipment as never opened (the kit supplies Head, Chest
      and Legs), so the card is in the data but can never be dealt. Either packs do have an
      equipment slot, or this is a card from outside the sealed pool. Until we know, it simply
      never appears.
- [ ] **The foil slot's rarity odds** (Rare 1.75%, otherwise Common) are back-derived from
      the per-pack averages we were given, not from published pull rates.
- [x] ~~**Should the export separate the deck from the sideboard?**~~ Resolved by testing
      against Fabrary, which neither exports nor imports sideboard cards. Splitting them here
      would only produce a list Fabrary discards, so everything selected stays one
      "Deck cards" list.

## Product backlog

The goal is to **simulate** an IRL sealed session, not to help you win one — you have no
analytics at a game store. Items are ordered by value.

- [ ] **Export straight to Talishar**, the gameplay simulator, alongside the Fabrary copy —
      build the deck here, then jump into a game with friends.
- [ ] **First-time onboarding.** Explain in one screen what this is: open 8 packs at once,
      build a deck, play with friends — a simulation of real-life sealed deckbuilding.
- [ ] **Open the packs pack by pack.** The app hands you a finished pool, but the stated
      goal is simulating opening 8 packs — and that is the part players enjoy.
- [ ] **A "maybe" pile.** Everyone builds with three piles physically, not two.
- [ ] **Deck stats after the fact**, to critique a finished 30-card deck: pitch and cost
      curve, block profile, attack vs non-attack. Deliberately on-demand and tucked away,
      never ambient during building, so it stays a review tool rather than a crutch — you
      will not have it at a real event.

### Interface quality

- [x] ~~Persist the sort mode.~~ Decided against: starting every event on the default sort is
      simpler, and a fresh pool deserves a fresh look at it.
- [ ] The card size is fixed at 220px, which is generous on a laptop: the pool row and one
      full column barely fit together. A zoom control may have to come back.
- [ ] **Name the columns.** The piles are the point; the rail above each one is already the
      right place to write "banish enablers" and read the table at a glance.
- [ ] Bring back "add all" / "remove all", which went with the old grouped panes. Some bulk
      way of clearing the off-hero cards out of the deck row would earn its place.
- [x] ~~Consolidate the two ways to clear a hero.~~ Decided against: clicking the active
      portrait and the toolbar's "clear" link can both stay.
- [ ] The deck row can get very wide, one column per card, before you start piling. A
      "tidy up" that merges singles by rarity or class might be a kinder starting point.
- [ ] Reduce hover-only interactions: the pitch tooltips and the issues popup are mouse-only.

## Housekeeping

- [ ] **Read the test suite** (`src/*.test.ts`, 96 tests) — not yet reviewed by the owner.
- [ ] Add the README screenshot (`docs/screenshot.png`); the link is a TODO comment.
- [ ] Confirm the copyright holder named in [`LICENSE`](../LICENSE).
- [ ] Refresh the card data as the set is revealed: `npm update @flesh-and-blood/cards
      @flesh-and-blood/types && npm run fetch-cards`, then commit `src/data/cards.json`.
- [ ] **Do that refresh on a schedule.** A weekly GitHub Action running those two commands and
      opening a PR when `cards.json` changes would keep the snapshot current on its own; Vercel
      redeploys on merge. Considered and rejected the alternative of reading the card package
      at app load: it is 1 MB gzipped against the snapshot's 5 KB, every card in the game
      rather than this set's 104, and it would make the app depend on a third-party CDN at
      runtime. A PR also keeps the diff reviewable, which matters — the snapshot is what every
      saved event's card ids point at.
