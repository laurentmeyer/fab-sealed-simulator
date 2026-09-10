# The build screen — a design log

Why the UI is the way it is. This is the record we check changes against, not a manual: the
screen should explain itself, and anything here that a player would actually need to be told
is a bug. The README covers what the app simulates; this covers how it behaves.

## The table

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

**The arena** sits at the head of the deck row, stacked like any other pile with the hero
shown in full and the rest peeking out above it. Your hero and its weapon are locked there —
the kit puts those into play for you. Everything else in it is equipment you chose.

Equipment behaves unlike any other card, because it is not deck material: it never forms a
pile, never counts toward the 30, and has exactly one destination. Clicking a piece in the
pool sends it to the arena and clicking it there sends it back. Dragging one lights the arena
and nothing else, wherever you happen to be aiming — there is no choice to offer, and a column
highlight would imply there was. Deck cards, conversely, cannot be dropped on the arena.

In the ordering it counts as **pitch 0** — the colour before red. So sorting by pitch puts the
equipment shelf at the head of the row, sorting by rarity still ranks a Majestic above a Common
piece and only leads the Commons with it, and sorting by name treats it like anything else.
Equipment jumps the pitch order, never a rarity.

**Picking a hero also filters.** The toolbar says how big a pool you are really building from
— "61 legal cards for Malice", counting every copy that hero may play whether it is in the
deck or not. In the pool, cards that hero cannot play go grey and drop to the end of the row. In the deck they are not drawn at all — a single tile at the very end of
the row, past the last insertion point, says "6 illegal cards for the selected hero, hidden
from the deck" and offers to **remove from deck**. Equipment you cannot wear counts there too:
another class's Arms is as illegal as an off-hero deck card, and just as hidden. They stay in the event until you do, so switching hero back
brings them straight home.

**Hold the pointer on any card** to open it full size over the table — the way to read a card
that is buried in a pile and showing only its header. It works on kit cards too. Click
anywhere or press Escape to put it down; starting a drag puts it down as well, so pressing and
then dragging stays one gesture.

The menu bar carries the deck count — **"28 / 30"**, green once you are there — the pitch
split of the deck, and the menu.

## The build clock

A sealed event gives you a fixed window to build in, and building in twenty minutes is a
different exercise from building at leisure — which is most of what there is to simulate once
the packs are open. So the clock is always there, at the head of the menu bar beside the deck
count: **how long you have taken, and how far you have got**, the two things worth half an eye
while you sort cards.

It counts up from zero, starting the moment the event does. Its colour is the whole of the
pressure: green at the start, running through yellow and orange, red once you are five minutes
past the twenty-minute window and red from then on. Nothing else happens — this simulates a
sealed event, it does not referee one. You can keep building, and the point is knowing you
went over.

Click it to stop the clock and again to carry on, the way you would put the cards down at a
real event. It only runs while the event is open, so time on the event list or in another tab
is not time spent building; the total is banked as you go, so closing the tab keeps it. **Reset the timer** in the menu puts it back to zero.

Twenty minutes is the pre-release window as we understand it, and lives with the other tunable
numbers in [`src/packConfig.ts`](src/packConfig.ts).

The **menu at the right of the menu bar** holds everything you do to the event rather than to
its cards. It opens with the deck's legality — a green tick when the deck is ready, or an
amber ⚠ and the list of what is missing: no hero chosen, too few cards, cards your hero cannot
play. A red dot on the button says so before you even open it. Below that:

- **Copy the deck list for Fabrary** — the list in Fabrary's import format, ready to paste: a
  header with the event name and your hero, then the arena cards and the deck cards. It copies
  whether the deck is legal or not.
- **Duplicate this event** — the same pool, hero and piles again under "… (Copy)", numbered
  "(Copy 2)", "(Copy 3)" as those names fill up. Somewhere to try a variant without losing the
  build you have.
- **Delete this event**, which asks first.

The **hero portraits** under the event name pick who you are playing — one at a time, click
the chosen one again to put it back, or use the "clear" link in the toolbar. Legality is
checked against each card's `legalHeroes` list rather than its class, so hero-specialized
cards stay correct even though the two agree in this set.

Events saved before the table view stored one entry per physical copy and no column layout.
They cannot be opened any more: the event list marks them **outdated**, and opening one
offers to delete it.

