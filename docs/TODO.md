# Open questions and backlog

What is still open, and the things we decided *not* to do so they do not come back around.
Anything already built is described in the README instead of here.

## Rules to confirm with FaB players

The pack layout came from the set's product description, but some numbers are our best
guess. Each entry says what we assumed and where it lives.

- [x] ~~**Basic vs Common equipment in the equipment slot.**~~ Settled, after two wrong turns:
      Basic equipment is kit material and the slot never rolls it. So the class Arms are
      guaranteed to you but unopenable, and the slot draws uniformly across the seven Common
      pieces. Confirmed by a player who knows the product.
- [x] ~~**Is Baalghor, Omen of the End a legal sealed hero?**~~ Resolved by
      [this prerelease guide](https://afabjourney.substack.com/p/flesh-and-blood-usurp-the-shadow):
      he is the kit's rainbow-foil promo and playable if you get him, with no weapon or Arms,
      using Shadow and Generic cards only. He is now the fourth (always-selectable) hero.
- [ ] **An expert has offered better numbers.** Someone who knows the game says the pack
      probabilities can be improved on what we back-derived. One piece has landed already —
      no Basic equipment in the equipment slot, applied above — and the owner is researching
      the rest. Treat the entries below as provisional rather than merely unconfirmed, and
      remember the README's assumptions table has to move with them.
- [ ] **The 6–7 / 3–4 common split** is a straight coin flip, and the class commons are
      split as evenly as possible. The true distribution may be weighted.
- [ ] **The 20-minute build window** the clock's colour is calibrated against is the
      pre-release figure as we understand it, not one we have confirmed. It lives in
      `BUILD_SECONDS`, with the red point five minutes past it.
- [x] ~~**Is there an equipment slot in a pack after all?**~~ Resolved by the owner: yes, core
      set boosters always have one — not every pack is opened at a pre-release. Packs now roll
      equipment, and the kit's own pieces became selectable rather than auto-worn.
- [ ] **Do rarer equipment roll at their rarity's odds?** Every piece the slot can open is
      Common, which is what makes a uniform draw correct. A Rare or Majestic one would need
      real odds; a test fails the moment one appears in the data, so the question cannot be
      skipped.
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
- [ ] **Temporary grouping.** Regroup the pool or the deck on a criterion — block value,
      attack value — *without losing the piles you built by hand*, and drop back to them
      afterwards. The manual piles are the whole point of the table, so any regrouping has to
      be a lens over them rather than a rearrangement of them: the state to hold is "your
      columns, plus a view", not a second set of columns. How it should look and how you
      leave the view are both open. Keeping the idea recorded while it is still vague.
- [ ] **Make the app work for other limited-legal sets.** Not a priority — probably done for
      the next set rather than now. What is currently welded to Usurp the Shadow Throne:
      `SET` and the supported-class list in `scripts/fetch-cards.mjs`; `CLASS_COMMON_CLASSES`
      and the slot odds in `packConfig.ts`; the kit rule in `heroes.ts`, which reads "this
      set's own equipment" as "carries a talent" and only works because this set has exactly
      one; the set name and banner image in `MainScreen.tsx`; and most of the README. The pack
      structure and the deckbuilding table itself should carry over untouched.
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

- [ ] **Read the test suite** (`src/*.test.ts`, 115 tests) — not yet reviewed by the owner.
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
