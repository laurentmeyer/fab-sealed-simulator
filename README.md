# FaB Sealed Simulator

Practice sealed deckbuilding for **Flesh and Blood: Usurp the Shadow Throne** without opening
real product. The app cracks 8 booster packs, drops the pool in front of you, and lets you
build a 30-card deck by piling cards into columns on a table — then hands you a list you can
paste straight into Fabrary.

Everything runs in the browser. There is no backend and no account: events live in
`localStorage`, so the build is a folder of static files you can host anywhere.

<!-- TODO: add a screenshot of the event screen with a few cards selected:
     ![Screenshot of the event screen](docs/screenshot.png) -->

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pack odds, the deck columns, deck export, event naming
npm run build    # static site in dist/
```

## Updating the card data

The set is not fully revealed, so the card list is a snapshot committed at
`src/data/cards.json`. To pull in newly spoiled cards:

```bash
npm update @flesh-and-blood/cards @flesh-and-blood/types
npm run fetch-cards
```

The script prints a summary (cards per rarity, class and type) so you can see what changed,
and existing saved events keep working — they store card ids, and the event screen tells you
if any of them are no longer in the data.

## How a pack is simulated

A physical booster holds 16 cards, but the last two — the basic slot and the expansion slot
(cards for classes outside the set) — are set aside as soon as the packs are opened, and the
equipment is covered by the kit below. So each simulated pack is the 13 cards that matter for
the deck, giving a pool of exactly 104:

| Slot | Contents |
| --- | --- |
| 1 | Rare, any class |
| 1 | Rare or better (Majestic 1 in 4, Legendary 1 in 80, Fabled 1 in 200) |
| 1 | The foil slot — a Rare 1.75% of the time, otherwise a Common |
| 10 | Commons: 6–7 class cards split evenly across Necromancer, Brute and Runeblade, and 3–4 Shadow or Generic cards |

**Nothing you play in the arena is opened; it all comes with the
[pre-release kit](https://afabjourney.substack.com/p/flesh-and-blood-usurp-the-shadow).**
Each young hero arrives with its weapon and class Arms, and every kit carries the cold-foil
equipment any hero can wear — Grille (Head), Robe (Chest) and Path (Legs) — so everyone has
exactly one piece per slot:

| Hero | Weapon | Arms |
| --- | --- | --- |
| Levia | Hell Hammer | Hex Gauntlet |
| Malice | Vox Necropolis | Appalling Bearers |
| Viserai, Between Worlds | Seven Sin Nebula | Grasp of the Darknight |
| Baalghor, Omen of the End | — | — |

**Baalghor** is the kit's rainbow-foil promo — at a real pre-release most kits hold a
Corrupted Corpse instead, so getting him is luck. Here he is always selectable, marked with a
★. He has no weapon or Arms of his own and can only play Shadow and Generic cards, which
makes him the hard mode of the set.

Cards without a class come in two kinds, and the app groups them separately: **Shadow** cards
carry the set's talent and are only legal for Shadow heroes, while truly **Generic** cards
(five in the set) are legal for almost every hero in the game.

Cards that are *created* during play never appear at all: Blasmophet, Gate to i'Arathael and
Corrupted Corpse are made by other cards, not opened in a pack. They are dropped at snapshot
time, spotted by their presence in another card's `createdExtras`.

Heroes, weapons and equipment are not part of the deck, so they do not count toward the "X / 30", and
neither do cards your hero cannot play. **30 is a minimum, not a maximum** — you start each
game with 30 and anything above that is a sideboard you can swap from between games. Nothing
is enforced either way: the warning sign in the menu bar lists whatever is still missing, and
you can always export the list. The export makes no distinction between deck and sideboard,
because Fabrary neither exports nor imports sideboard cards.

Only Necromancer, Brute, Runeblade and generic cards can appear; the "any class" slots never
roll a Guardian or a Ninja. Every tunable number lives in
[`src/packConfig.ts`](src/packConfig.ts).

## Building a deck

The build screen is a table. The **pool** is the row along the top — every card you opened,
one per distinct card, with an `xN` badge for the copies you have left. Below it is the
**deck**: the piles you are building, side by side. Both rows scroll sideways.

**Clicking a pool card puts one copy in the deck**, and the deck sorts itself by pitch until
you take over. The row is scanned from the head: the card joins the pile of its own colour,
and failing that opens a new pile **in colour order** — reds first, then yellows, then blues,
then the handful of cards with no pitch. The scan stops at the first pile you mixed by hand
and inserts in front of it: past that point the row is yours, so the tidy colour piles stay at
the head and the piles you built stay where you put them. Clicking a card in the deck sends
one copy back.

**Drag to build your own piles.** Drop a card group in the middle of a column to add it to
that pile, or near a column's edge to open a new pile there — a thin vertical bar shows where
it would go, and a target column lights up. With no piles yet the whole empty row is the
target.

**Whole piles move the same way.** Every column carries a rail above its top card: grab it and
the pile follows the cursor, and it obeys exactly the rule a single card does — dropped in the
middle of another pile the two merge, dropped near an edge it moves between piles. Cards
inside a column are always in the order the **Sort by** selector says (rarity, name or pitch);
there is no hand ordering inside a pile.

Piling cards up is the point: on a table you sort a strategy's pillars into heaps — Malice
wants zombies, banish enablers, graveyard recursion — and each heap's height tells you
whether that pillar is actually supported.

**Cards can be dragged between the pool and the deck too.** A pool card dragged down lands
wherever you drop it, which is how you put a card straight into a pile instead of letting the
pitch rule choose. Copies of a card never split up, though: if the card is already in the
deck, that pile is the only possible destination — it scrolls into view and lights up
whatever you aim at. Dragging a group from the deck onto the pool takes every copy back out,
and the whole pool lights up to say there is no choice of spot within it.

Your **hero, its weapon and your equipment** are fixed at the head of the deck row, stacked
like any other pile with the hero shown in full and its gear peeking out above it. They come
with the pre-release kit rather than the pool, so they cannot be moved or clicked away, and
they never count toward the 30.

**Picking a hero also filters.** The toolbar says how big a pool you are really building from
— "61 legal cards for Malice", counting every copy that hero may play whether it is in the
deck or not. In the pool, cards that hero cannot play go grey and drop to the end of the row. In the deck they are not drawn at all — a single tile at the very end of
the row, past the last insertion point, says "6 illegal cards for the selected hero, hidden
from the deck" and offers to **remove from deck**. They stay in the event until you do, so switching hero back
brings them straight home.

The menu bar carries the deck count — **"28 / 30"**, green once you are there — the pitch
split of the deck, and the export.

**Export for Fabrary** copies a list you can paste straight into Fabrary's importer: a header
with the event name and your hero, then the arena cards and the deck cards. It doubles as the
legality sign — a green tick when the deck is ready, an amber ⚠ when it is not, with every
reason on hover: no hero chosen, too few cards, cards your hero cannot play. It exports either
way.

The **hero portraits** under the event name pick who you are playing — one at a time, click
the chosen one again to put it back, or use the "clear" link in the toolbar. Legality is
checked against each card's `legalHeroes` list rather than its class, so hero-specialized
cards stay correct even though the two agree in this set.

Events saved before the table view stored one entry per physical copy and no column layout.
They cannot be opened any more: the event list marks them **outdated**, and opening one
offers to delete it.

## Open questions

Some of the pack numbers are our best guess, and there is a backlog of things the app does
not do yet. Both live in **[docs/TODO.md](docs/TODO.md)** — corrections from people who know
the game are very welcome.

## Acknowledgments

- **[Fabrary](https://fabrary.net)** — the card data comes from its open data packages
  ([fabrary/fab-cards](https://github.com/fabrary/fab-cards), MIT licensed, published as
  `@flesh-and-blood/cards` and `@flesh-and-blood/types`), and the card art is loaded from
  Fabrary's CDN. The deck list is formatted for Fabrary's importer.
- **[Legend Story Studios](https://legendstory.com)** — creators of Flesh and Blood.
- Built with [React](https://react.dev), [Vite](https://vite.dev) and
  [Vitest](https://vitest.dev).

## Legal

This is an unofficial fan project. It is not affiliated with, endorsed, sponsored, or
approved by Legend Story Studios.

Flesh and Blood™ and all card names, card text, and card images are the intellectual property
of Legend Story Studios and are **not** covered by this repository's license, which applies
only to the code. No card images are stored here; they are loaded at runtime from Fabrary.

## License

[MIT](LICENSE).
