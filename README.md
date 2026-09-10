# FaB Sealed Simulator

Practice sealed deckbuilding for **Flesh and Blood: Usurp the Shadow Throne** without opening
real product. The app cracks 8 booster packs, drops the pool in front of you, and lets you
click cards into a 30-card deck — then hands you a list you can paste straight into Fabrary.

Everything runs in the browser. There is no backend and no account: events live in
`localStorage`, so the build is a folder of static files you can host anywhere.

<!-- TODO: add a screenshot of the event screen with a few cards selected:
     ![Screenshot of the event screen](docs/screenshot.png) -->

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pack odds, deck export, event naming
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
you can always export the list.

Only Necromancer, Brute, Runeblade and generic cards can appear; the "any class" slots never
roll a Guardian or a Ninja. Every tunable number lives in
[`src/packConfig.ts`](src/packConfig.ts).

## Building a deck

The pool is on the left, your **Selected cards** on the right, and clicking a card moves one
copy across. Duplicates are fanned into a stack with a count badge, so you can see at a glance
that you opened three of something. Hovering any card blows it up.

The right pane is split in two: **Arena** holds your hero, its signature weapon and your
equipment, none of which are part of the deck; **Deck** holds the cards that are, and carries
the only count in the app — "28 / 30", green once you are there. Your hero and weapon sit
outlined, since they come with the hero rather than the pool and cannot be clicked away.

**Export for Fabrary** copies a list you can paste straight into Fabrary's importer: a header
with the event name and your hero, then the arena cards and the deck cards. It doubles as the
legality sign — a green tick when the deck is ready, an amber ⚠ when it is not, with every
reason on hover: no hero chosen, too few cards, cards your hero cannot play. It exports either
way.

The **Group by** dropdown sits above the pool and affects the pool only — by rarity, class or
pitch, rarity by default. The deck side stays a plain list.

The **hero portraits** under the event name pick who you are playing — one at a time, click
the chosen one again to put it back, or use the "clear" link beside the Card pool title.
Picking a hero brings its signature weapon, and both panes split accordingly: cards that hero
cannot play drop to a greyed-out group at the bottom labelled "… cannot play these". Nothing
is hidden or blocked, so you can still click them, but they stop counting toward the 30 and
are left out of the export — which makes it obvious when a card already in your deck is
off-hero.

Legality is checked against each card's `legalHeroes` list rather than its class, so
hero-specialized cards stay correct even though the two agree in this set.

The two grid buttons switch card size for both panes, guaranteeing at least 4 cards per row on
small and 3 on large however narrow the window gets.

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
