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
- [x] ~~**Is there an equipment slot in a pack after all?**~~ Resolved by the owner: yes, core
      set boosters always have one — not every pack is opened at a pre-release. Packs now roll
      equipment, and the kit's own pieces became selectable rather than auto-worn.
- [ ] **Do rarer equipment roll at their rarity's odds?** Every equipment in the set is Basic
      or Common today, and we assume Basic is as likely as Common — which makes a uniform draw
      correct. A Rare or Majestic piece would need real odds; a test fails the moment one
      appears in the data, so the question cannot be skipped.
- [ ] **The foil slot's rarity odds** (Rare 1.75%, otherwise Common) are back-derived from
      the per-pack averages we were given, not from published pull rates.
- [x] ~~**Should the export separate the deck from the sideboard?**~~ Resolved by testing
      against Fabrary, which neither exports nor imports sideboard cards. Splitting them here
      would only produce a list Fabrary discards, so everything selected stays one
      "Deck cards" list.

## Product backlog

The goal is to **simulate** an IRL sealed session, not to help you win one — you have no
analytics at a game store. Items are ordered by value.

- [ ] ~**Export straight to Talishar**~~ Not feasable technically, Talishar used Fabrary deck as its input.
- [ ] **First-time onboarding.** Explain in one screen what this is: open 8 packs at once,
      build a deck, play with friends — a simulation of real-life sealed deckbuilding.
- [ ] **Deck stats** Deliberately on-demand and tucked away,
      never ambient during building, so it stays a review tool rather than a crutch — you
      will not have it at a real event.

### Interface quality

- [x] ~~Persist the sort mode.~~ Decided against: starting every event on the default sort is
      simpler, and a fresh pool deserves a fresh look at it.
- [ ] The card size is fixed at 220px, which is generous on a laptop: the pool row and one
      full column barely fit together. A zoom control may have to come back.
- [ ] ~~**Name the columns.**~~ the user does not have time to do this. Deck building is done in one short session, the user will remember the purpose of the columns.
- [ ] Bring back "add all" / "remove all", which went with the old grouped panes. Some bulk
      way of clearing the off-hero cards out of the deck row would earn its place.
- [x] ~~Consolidate the two ways to clear a hero.~~ Decided against: clicking the active
      portrait and the toolbar's "clear" link can both stay.
- [ ] The deck row can get very wide, one column per card, before you start piling. A
      "tidy up" that merges singles by rarity or class might be a kinder starting point.
- [ ] Reduce hover-only interactions: the pitch tooltips and the issues popup are mouse-only.

## Housekeeping

- [ ] **Read the test suite** (`src/*.test.ts`, 113 tests) — not yet reviewed by the owner.
- [ ] Add the README screenshot (`docs/screenshot.png`); the link is a TODO comment.
- [ ] Confirm the copyright holder named in [`LICENSE`](../LICENSE).
- [x] ~~Refresh the card data as the set is revealed.~~ The set is fully revealed as of
      2026-09-11 and the snapshot holds all 230 sealed-legal cards; every pinning test passed
      on the final data. A future `npm update && npm run fetch-cards` is only needed if the
      source data is corrected.
- [x] ~~Do that refresh on a schedule.~~ Mooted by the full reveal: the data has stopped
      moving, so a weekly Action would only churn. (The runtime-fetch alternative had already
      been rejected — 1 MB gzipped against the snapshot's 5 KB, and a third-party CDN in the
      runtime path.)
