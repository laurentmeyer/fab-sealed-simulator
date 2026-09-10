# FaB Sealed Simulator

Practice sealed deckbuilding for **Flesh and Blood: Usurp the Shadow Throne** without opening
real product. The app cracks 8 booster packs, drops the pool in front of you, and lets you
build a 30-card deck by piling cards into columns on a table — then hands you a list you can
paste straight into Fabrary.

Everything runs in the browser. There is no backend and no account: events live in
`localStorage`, so the build is a folder of static files you can host anywhere.

The front page lists the events you have opened, each with the face of the hero you picked.

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

> **Read this section critically.** It is the contract the code is written against, and some
> of its numbers are guesses. The table at the end says which is which — if you know the game
> and see something wrong, [please say so](docs/TODO.md). Every tunable number lives in
> [`src/packConfig.ts`](src/packConfig.ts) with its derivation next to it, and the odds below
> are enforced by tests over thousands of simulated packs.

A physical booster holds 16 cards. Two of them — the basic slot and the expansion slot (cards
for classes outside the set) — are set aside as soon as the packs are opened, so they are not
simulated. Everything else is:

| Slot | Contents |
| --- | --- |
| 1 | Rare, any class |
| 1 | Rare or better: Majestic 1 in 4, otherwise Rare |
| 1 | The foil slot — a Rare 1.75% of the time, otherwise a Common |
| 1 | Equipment — at Common odds, with Basic equipment as likely as Common; rarer equipment, once the set has any, rolls at its own rarity's odds |
| 10 | Commons: 6–7 class cards split evenly across Necromancer, Brute and Runeblade (coin flip between 6 and 7, remainder to a random class), and the rest Shadow or Generic |

**Legendary and Fabled do not exist in this model.** None are sealed-legal in the card data,
and the real pull rates are on the order of one Legendary in ~96 packs — a sealed pool almost
never sees one. Rather than carry odds for cards that essentially never arrive, the simulation
pretends the two rarities are not there at all.

The arithmetic that falls out of those slots, which is what the pull-rate tests check:

- **Rares: ~1.77 per pack.** The guaranteed rare, plus the second slot falling through to Rare
  (1 − 1/4 = 0.75), plus the foil slot's 0.0175. We were told the true average is 1.75; the
  missing 0.02 is the Legendary/Fabled odds we dropped, and we accept the difference for the
  simpler model.
- **Commons: ~10.98 per pack.** The ten common slots plus the foil slot's 0.9825.
- **Majestics: 1 in 4 packs.**

**The equipment slot works differently from the others.** Duplicates of an equipment are
worthless — you can only wear one per slot — so the pool keeps **at most one copy** of each
distinct equipment, however many the eight packs roll. And most rolls are invisible anyway:
anything the pre-release kit already guarantees (next section) adds nothing new. Today every
equipment in the set is Basic or Common, so the slot is uniform over all seven, and the only
roll that changes your pool is **Dark Arcanite Boots** at 1/7 per pack — about **71%** of
events hold one (1 − (6/7)^8). A Rare or Majestic equipment, once spoiled, would roll at its
own rarity's odds instead; a test pins the current set so such a card forces that decision
rather than sliding in silently.

## What the pre-release kit provides

Everything else comes with the
[pre-release kit](https://afabjourney.substack.com/p/flesh-and-blood-usurp-the-shadow), never
from a pack — but only the hero and its weapon are put into play for you. **All other
equipment has to be selected from the pool**, exactly like deck cards: the kit hands you the
cards, wearing them is your decision.

| Guaranteed by the kit | In play automatically? |
| --- | --- |
| Your hero | Yes — locked in the arena |
| Its signature weapon | Yes — no hero in this set has a legal alternative weapon |
| Its class Arms (Basic) | No — a selectable singleton in your pool |
| The cold-foil trio: Grille (Head), Robe (Chest), Path (Legs) | No — selectable singletons in your pool |

The guaranteed set is derived from the card data rather than hard-coded — Basic equipment plus
the set's Shadow-talented equipment — and pinned by a test, so a data refresh that would
silently change what the kit guarantees fails loudly instead.

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

## The smaller rules

- **Shadow is not Generic.** Cards without a class come in two kinds: **Shadow** cards carry
  the set's talent and are only legal for Shadow heroes, while truly **Generic** cards are
  legal for almost every hero in the game. Legality always comes from each card's
  `legalHeroes` list, never from matching classes — the two agree in this set, but FaB has
  cards specialized to a single hero.
- **Created cards never appear.** Blasmophet, Gate to i'Arathael and Corrupted Corpse are made
  by other cards during play, not opened in a pack; they are dropped at snapshot time.
- **Only Necromancer, Brute, Runeblade and generic cards can appear** — the "any class" slots
  never roll a Guardian or a Ninja.
- **Heroes, weapons and equipment are not deck cards.** They never count toward the "X / 30",
  and neither do cards your hero cannot play.
- **30 is a minimum, not a maximum.** You start each game with 30 and anything above that is a
  sideboard to swap from between games. Nothing is enforced either way: the menu lists
  whatever is still missing, and you can always export. The export makes no deck/sideboard
  distinction because Fabrary neither exports nor imports sideboard cards.

## What is sourced, and what is a guess

The honesty table. "Sourced" means we can point at something; "assumed" means we made it up
from the averages we were given and would love a correction.

| Claim | Status |
| --- | --- |
| Pack structure: 16 cards; basic + expansion slots set aside | Sourced — the set's product description |
| The kit: hero, weapon, Arms per hero; cold-foil Grille/Robe/Path in every kit; Baalghor as the promo | Sourced — [the prerelease guide](https://afabjourney.substack.com/p/flesh-and-blood-usurp-the-shadow) |
| Rare and Majestic averages (1.75 and 1/4 per pack) | Sourced — per-pack averages from the original brief ([notes/context.md](notes/context.md)) |
| Legendary and Fabled treated as nonexistent (~1.77 rares/pack instead of 1.75) | **Assumed** simplification — roughly one Legendary in 96 packs in reality, so we model P = 0 |
| Second-slot and foil-slot odds back-derived from those averages | **Assumed** — chosen to reproduce the averages, not from published pull rates |
| The 6–7 class-common split as a fair coin flip, split as evenly as possible | **Assumed** — the true distribution may be weighted |
| The equipment slot rolls at Common odds, with Basic equipment as likely as Common | **Assumed** — the owner's guess, explicitly open to expert challenge |
| No hero has a legal alternative weapon (why weapons auto-select) | **Assumed** — checked against current data, could change as the set is revealed |

## Building a deck

The build screen aims to work like a table at a game store: your pool along the top, the deck
as piles of overlapping cards below, and click and drag doing what you would expect. The one
thing you would not find on your own: **hold the pointer on any card** (long-press on touch)
to see it full size — that is how you read a card buried in a pile.

How and why the screen behaves the way it does is recorded in [docs/ui.md](docs/ui.md); it is
a design log, not a manual.

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
