# My brain dump of how mtg arena's UI works.

## Preamble
* While I appreciate your suggestion of Archidekt's builder, I strongly advise against it. Archidekt is for constructed players who have time to craft their perfect deck. We cater for limited players who have 30 minutes to chose their hero and build the deck.
* Please look into libraries for drag and drop management, let's not recode the wheel

## Layout
There are 2 display modes, horizontal and vertical. I only want to keep the horizontal split:
* The top part it the pool (unselected) cards. It's only one row of cards, same cards are stacked. Cards in this section cannot be reordered.
* The bottom part is the selected cards. It can be on one or two rows, depending if filters are active. 

## Card stacking
* cards are stacked in a way that the pitch, name and cost are visible.
* we no longer display a stack of same card stacks visually. We just overlay a x2 if there are 2 (for instance), below the cards' cost. If another card is stacked upon such multiple cards, it's moved a bit downwards so the x2 is visible.

## Auto selected cards
* If a hero is selected, the auto included cards (hero weapon etc.) are stacked in the head of the bottom row(s) and cannot be moved.

## Filters
When filters are active:
* In the pool section, the non-matching cards are greyed and moved to the end of the list.
* In the selected deck section, cards with matching filters are in the top row, others are in the bottom row.

## Grouping and sorting
* Sort (inside a column and in the pool row) can be either by name, pitch, or rarity. This is rarity by default

## Card selection
When selecting a card:
* if there is no exact same card selected, it goes in a new column at the head of the row (bar the auto included cards). It does not have a counter since there is only one card at this point.
* else it groups with the same cards and increases the counter, as described below

## Drag and drop
* when dragging a card, there's no longer an extended image overlay
* the card can be placed in an existing stack (it is sorted according to the current sort mode), or create a new column. An new column can be at the head (bar the auto included cards), tail, or between existing columns.
* A visual feedback shows where the card would lend upon release. If it would be on an exsting column, it is highlighted. If it would create a new column, a thin vertical bar highlights where the column would be created.
* if a column is empty it ceases to exist - no holes in the row
* cannot select an individual card in a group of same cards, they move together as a group
* cannot move a card between rows - this would break the filters logic.
* moving a column while a filter is active moves both top and bottom stacks
* the selected cards layout is persisted