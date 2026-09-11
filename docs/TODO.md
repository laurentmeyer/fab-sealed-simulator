# Open questions and backlog

What is still open, and the things we decided *not* to do so they do not come back around.
Anything already built is described in the README instead of here.

## Rules to confirm with FaB players

The pack layout came from the set's product description, but some numbers are our best
guess. Each entry says what we assumed and where it lives.

- [x] ~~**Basic vs Common equipment in the equipment slot.**~~ Resolved at the time as "Basic
      is kit, not pack content", then overtaken by the equipment-slot answer below: packs roll
      across every piece, and a Basic result is simply redundant with what the kit guarantees.
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
analytics at a game store.

- [ ] **Deck stats, after the fact.** The main next step for the tool: pitch and cost curve,
      block profile, attack vs non-attack. Deliberately on-demand and tucked away, never
      ambient while you build, so it stays a review tool rather than a crutch — you will not
      have it at a real event.
- [ ] **Say that a long press enlarges a card.** The one thing about the build screen nobody
      can discover alone, and the only part of onboarding worth doing.
- [x] ~~**Export straight to Talishar.**~~ Not possible, and not needed: Talishar imports from
      Fabrary, which the app already exports to. The path exists, it just runs through Fabrary.
- [x] ~~**Open the packs pack by pack.**~~ Decided against: this is a training tool, not an
      unboxing. Sealed gives you so little time that players rip all eight packs at once, and
      there is less to savour here anyway — the set has no Legendary or Fabled to find.
- [x] ~~**A "maybe" pile.**~~ Decided against: the columns already are that. Start one and use
      it as your maybe pile.
- [x] ~~**First-time onboarding.**~~ Decided against: the app is good enough as it is, bar the
      long-press note above.

### Interface quality

- [ ] **Make the app mobile friendly.** It is built for a laptop today and assumes a mouse.
      This is the one open interface item, and it swallows several others: the fixed 220px
      card size wants re-evaluating on a small screen, and the interactions that are still
      hover-only (the pitch tooltips, the issues popup) need a touch answer.
- [x] ~~**Name the columns.**~~ Decided against: at a game store nobody labels their piles.
      There is no time for it, and there are few enough piles to hold in your head.
- [x] ~~Persist the sort mode.~~ Decided against: starting every event on the default sort is
      simpler, and a fresh pool deserves a fresh look at it.
- [x] ~~Consolidate the two ways to clear a hero.~~ Decided against: clicking the active
      portrait and the toolbar's "clear" link can both stay.

## Housekeeping

- [ ] **Read the test suite** (`src/*.test.ts`, 114 tests) — not yet reviewed by the owner.
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
