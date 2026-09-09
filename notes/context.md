> **Historical.** This is the original brief, kept unedited for the record. Several details
> changed during the build — see the [README](../README.md) for what the app actually does,
> and [docs/TODO.md](../docs/TODO.md) for what is still open.

# Goal
We are going to create a tool to prepare for the sealed events for the flesh and blood TCG. A sealed event is simple: open 8 booster packs, build a 30 cards deck, play against opponents.

There are already online tools to simulate gameplay once the players have built their decks, but I could not find one that easily simulates opening 8 packs and build the deck.

As with any TCG, Flesh and Blood has many sets. Here I just want to focus on the upcoming one, Usurp the Shadow Throne.

# Environment
The tool should work locally for testing, and then I'll host it online. I'd like it to be completely in the front-end, no database, only local storage.
Please use typscript and react, keep it as simple and light as possible

# User interface
On the main screen, the player can start a new sealed event, or resume a previous one from a list. A event has a name, by default "Event X" where X increments based on previous event named "Event X".

The event screen is split in two main parts: non-selected cards on the left, selected cards on the right.
On event creation, all the valid cards of the pool appear in the non-selected part.
On hover, display a bigger view of the card.
On click, the card moves to the other section

Above those two mains sections, a menu bar offers to:
* go back to main screen
* edit the name (on click, the name becomes a text area + OK button)
* choose a type of grouping: rarity, class, pitch - that applies to both sides.
* the count of selected cards ("X / 30")
* a button to copy the list of selected cards (see format below)
* a button to delete the current event (after a confirmation)

# How to generate the pool of valid cards
The list cards and their attributes can be found here https://github.com/fabrary/cards/blob/main/packages/cards/latest-set/index.ts

The only cards that can be selected have the value `Format.Sealed` in the list of `legalFormats`.

Each pack contains:
- 1 Equipment card
- 1 Rare card of any class
- 1 Rare or higher rarity card of any class
- 1 Foil card of any rarity and class
- 10 other cards of `Rarity.Common` rarity with
    - 6-7 Class cards, whose value for `classes` is evenly distributed between `[Class.Necromancer]`, `[Class.Brute]`, `[Class.Runeblade]`
    - 3-4 generic cards, whose value for `classes` can be `[Class.NotClassed]` or `[Class.Generic]`

The rarities are: Basic < Common < Rare < Majestic < Marvel < Legendary < Fabled

The probability of cards depend on their rarity. On average
* Fabled – 1 per 200 packs
* Legendary – 1 per 80 packs
* Majestic - 1 per 4 packs
* Rare - 1.75 per pack
* Common - 11 per pack
