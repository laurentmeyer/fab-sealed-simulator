# Open questions and backlog

Everything nobody has decided yet. The README describes what the app does today.

## Rules to confirm with FaB players

The pack layout came from the set's product description, but some numbers are our best
guess. Each entry says what we assumed and where it lives.

- [x] ~~**Basic vs Common equipment in the equipment slot.**~~ Resolved: Basic rarity is the
      pre-release kit, not pack content. Each hero comes with its weapon and its class Arms,
      and packs only ever supply the generic Head/Chest/Legs equipment.
- [ ] **Is Baalghor, Omen of the End a legal sealed hero?** The set has a fourth young hero,
      [Baalghor](https://fabrary.net/cards/baalghor-omen-of-the-end), but the card data does
      not mark it sealed-legal, so the hero selector offers only Levia, Malice and Viserai.
      If it is legal it needs adding, along with whatever weapon it plays. Being
      `NotClassed`, it is also the case where matching on class instead of `legalHeroes`
      would fall apart.
- [ ] **The 6–7 / 3–4 common split** is a straight coin flip, and the class commons are
      split as evenly as possible. The true distribution may be weighted.
- [ ] **The foil slot's rarity odds** (Rare 1.75%, otherwise Common) are back-derived from
      the per-pack averages we were given, not from published pull rates.
- [ ] **Should the export separate the deck from the sideboard?** 30 cards is a minimum, so
      a player may select 45. Today all of them are exported as one "Deck cards" list. At an
      event you play 30 with the rest beside you, so splitting them may be more faithful.

## Product backlog

The goal is to **simulate** an IRL sealed session, not to help you win one — you have no
analytics at a game store. Items are ordered by value.

- [ ] **Keep the layout stable when a card moves.** On a table, picking up one card does not
      reshuffle the other 109. The grid currently reflows on every click, which has no
      physical counterpart and is jarring when adding several cards in a row.
- [ ] **Set aside the cards the hero cannot play.** IRL that is the first thing you do —
      push them out of the play area. They are about half the pool (~50 of 107), so
      collapsing that group by default matches what actually happens.
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
      curve, block profile, attack vs non-attack. Deliberately *after* building, not during,
      so it stays a review tool rather than a crutch.

### Interface quality

- [ ] Persist card size and grouping — both reset every time an event is opened.
- [ ] Stack the two panes below ~900px; `1fr 1fr` is unusable on a narrow screen.
- [ ] Consolidate the two ways to clear a hero (toggle the portrait, or the "clear" link).
- [ ] Use the empty right-hand track of the menu bar.
- [ ] Reduce hover-only interactions: the card preview, pitch tooltips and the issues popup
      are all mouse-only. A click-to-pin preview would help keyboard and touch users.
- [ ] Main screen: show the hero portrait on each event row, and allow duplicating an event
      to try a different build from the same pool.

## Housekeeping

- [ ] **Read the test suite** (`src/*.test.ts`, 41 tests) — not yet reviewed by the owner.
- [ ] Add the README screenshot (`docs/screenshot.png`); the link is a TODO comment.
- [ ] Confirm the copyright holder named in [`LICENSE`](../LICENSE).
- [ ] Refresh the card data as the set is revealed: `npm update @flesh-and-blood/cards
      @flesh-and-blood/types && npm run fetch-cards`, then commit `src/data/cards.json`.
