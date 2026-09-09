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

A physical booster holds 16 cards, but two of them are bonus cards for other classes or
collectibles that nobody plays in limited, and they are set aside as soon as the packs are
opened. So each simulated pack is the 14 cards that matter:

| Slot | Contents |
| --- | --- |
| 1 | Equipment |
| 1 | Rare, any class |
| 1 | Rare or better (Majestic 1 in 4, Legendary 1 in 80, Fabled 1 in 200) |
| 1 | The foil slot — a Rare 1.75% of the time, otherwise a Common |
| 10 | Commons: 6–7 class cards split evenly across Necromancer, Brute and Runeblade, and 3–4 generic cards |

On top of the 8 packs you always get one copy of every Basic class equipment, because you need
it to field a deck. Basics are singletons: if the equipment slot rolls one, it merges into the
copy you already have, so a pool ends up a little short of 8 × 14 cards.

Equipment is deduplicated: you can only ever wear one copy, so a pack that opens a second
Path of Repentance adds nothing and it is dropped. A pool therefore holds at most one of each
piece of equipment.

Heroes and weapons are not in the pool at all. You pick a young hero, and its signature weapon
comes with it — Levia brings Hell Hammer, Malice brings Vox Necropolis, and Viserai brings
Seven Sin Nebula.

Cards that are *created* during play never appear at all: Blasmophet, Gate to i'Arathael and
Corrupted Corpse are made by other cards, not opened in a pack. They are dropped at snapshot
time, spotted by their presence in another card's `createdExtras`.

Weapons and equipment are not part of the deck, so they do not count toward the "X / 30", and
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

**Export for Fabrary** doubles as the legality sign: a green tick when the deck is ready, an
amber ⚠ when it is not. Hover it to see every reason at once — no hero chosen, too few cards,
cards your hero cannot play. It exports either way.

The **Group by** dropdown sits above the pool and affects the pool only — by rarity, class or
pitch, rarity by default. The deck side stays a plain list.

The **hero portraits** under the event name pick who you are playing — one at a time, click
the chosen one again to put it back, or use the "clear" link beside the Card pool title.
Picking a hero brings its signature weapon, and both panes split accordingly: cards that hero
cannot play drop to a greyed-out group at the bottom labelled "… cannot play these". Nothing
is hidden or blocked, so you can still click them, but they stop counting toward the 30 and
are left out of the export — which makes it obvious when a card already in your deck is
off-hero.

Legality is checked against each card's `legalHeroes` list rather than its class. The two
agree in this set, since it has one hero per class, but FaB has cards specialized to a single
hero and the hero list is the rule that stays correct.

The two grid buttons switch card size for both panes. Rather than a fixed pixel width — which
made the toggle do nothing on a narrow window, since both sizes fit the same number of columns
— each size sets a floor that is the smaller of a target width and a share of the pane. The
share guarantees at least 4 cards per row on small and 3 on large however narrow the window
gets, the target adds columns as it widens, and a cap keeps a card from growing past the size
of the hover preview.

**Export for Fabrary** copies a list you can paste into Fabrary's importer: a header with the
event name and your hero, then the arena cards and the deck cards.

## Open questions — to verify with FaB specialists

The pack layout came from the set's product description, but some of the numbers are our best
guess. If you know better, these are the places to correct:

1. **Basic vs Common equipment in the equipment slot.** We draw uniformly across all
   sealed-legal equipment, so a Basic class equipment (Hex Gauntlet, Appalling Bearers, Grasp
   of the Darknight) is exactly as likely as a Common one from the Repentance cycle. The real
   print ratio is unknown, and Basic equipment may not even share the slot. Tunable via
   `BASIC_EQUIPMENT_WEIGHT` in [`src/packConfig.ts`](src/packConfig.ts). Note this changes
   pool *size* as well as odds, because a Basic draw merges into the singleton you already
   have.
2. **Is Baalghor, Omen of the End a legal sealed hero?** The set has a fourth young hero,
   [Baalghor](https://fabrary.net/cards/baalghor-omen-of-the-end), but the card data does not
   mark it sealed-legal, so the hero selector offers only Levia, Malice and Viserai. If
   Baalghor turns out to be legal it will need adding, along with whatever weapon it plays —
   and being `NotClassed`, it is exactly the case where matching on class instead of
   `legalHeroes` would fall apart.
3. **The 6–7 / 3–4 common split** is a straight coin flip, and the class commons are split as
   evenly as possible. The true distribution may be weighted.
4. **The foil slot's rarity odds** (Rare 1.75%, otherwise Common) are back-derived from the
   per-pack averages we were given (1.75 rares and ~11 commons per pack), not from published
   pull rates.

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
