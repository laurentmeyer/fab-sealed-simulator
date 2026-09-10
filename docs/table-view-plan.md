# Implementation plan — the table deckbuilding view

The spec is [notes/mtga-ui.md](../notes/mtga-ui.md) (the owner's description of MTG Arena's
limited builder), plus the decisions below that resolved its open points. This plan is
self-contained: it should be implementable in a fresh session without the conversation that
produced it.

## Resolved decisions

- **Filters = hero selection only, for now.** Pitch and rarity filters may come later, so the
  matching predicate must be one pluggable function, not hero logic scattered around.
- **Clicking a selected card deselects one copy**, not the group.
- **Click is the only way into the deck.** No dragging from pool to columns — this avoids the
  ambiguity of dragging a card whose other copies are already selected. Drag and drop exists
  only inside the selected area, and pool cards are never reordered by hand.
- **The "Group by" feature is removed.** The pool is one sorted row; columns are the grouping.
- **Kit cards are exempt from filters**, fixed at the head of the selected area, hero card
  fully visible (the others peek behind it).
- **Both areas scroll horizontally**; the two selected rows scroll together so columns stay
  vertically aligned. Within a column, order is always dictated by the active sort — there is
  no manual ordering inside a column.
- **No migration.** Old-format events cannot be opened: show an error saying the app has
  updated, and offer to delete the event.

## 1. New data model (schema v2)

Individual card copies no longer need identity: duplicates always merge and move as a group,
so counts replace instances. `CardInstance` and `instanceId` disappear.

```ts
interface DeckColumn {
  id: string                                  // stable key for React and dnd-kit
  cards: { cardId: string; count: number }[]  // a cardId appears in at most ONE column
}

interface SealedEvent {
  schemaVersion: 2
  id: string
  name: string
  createdAt: string
  heroId?: string | null
  pool: Record<string, number>                // cardId -> copies opened; fixed at creation
  columns: DeckColumn[]                       // the selected cards, in column order
}
```

- Unselected copies of a card = `pool[cardId]` minus its count in `columns`. Never negative.
- Selected count, pitch split, legality all derive from `columns`.
- Entry order inside `DeckColumn.cards` is irrelevant — rendering sorts by the active mode.
- `generateEventPool` returns `string[]` of cardIds (packs of 13 as today); event creation
  tallies them into `pool`. The instance machinery in `packGenerator.ts` goes away; the pack
  odds and tests stay, reworked to cardIds.

### Legacy events

`loadEvents` keeps old events (they have `cards` and no `schemaVersion`), but opening one
renders an error screen instead of the builder: "This event was created by an older version
of the app and cannot be opened any more." with **Delete this event** and **Back** buttons.
The main screen shows them greyed with an "outdated" tag. No other reading of the old shape.

## 2. Pure state module first — `src/columns.ts`

Every rule in the spec is a state transition. Implement them as pure functions over
`DeckColumn[]` and unit-test them before any UI exists:

- `selectCard(columns, cardId)` — if the card is already in a column, increment its count;
  otherwise create a new single-card column at the head. Enforces the one-column-per-card
  invariant.
- `deselectCard(columns, cardId)` — decrement by one; drop the entry at zero; drop the column
  when empty (no holes).
- `moveGroup(columns, cardId, target)` — target is an existing column id or an insertion
  index for a new column (head, between, tail). Moving the last group out of a column removes
  it, and the insertion index must be interpreted after that removal.
- `moveColumn(columns, columnId, toIndex)` — reorder whole columns.
- Invariant helpers used by the tests: no empty columns, no duplicate cardIds across columns,
  totals never exceed the pool.

Tests to write alongside (vitest, same style as the suite): merge-on-select, single-copy
deselect, group move sorts into place, empty-column collapse, insertion at head/between/tail,
the last-group-move index adjustment, and pool-bound safety.

## 3. Filters — `src/filters.ts`

One predicate drives everything: `matches(card, filter)` where the only filter today is the
chosen hero (`isPlayableBy`). Pool: non-matching stacks are greyed and sorted to the end of
the row. Selected area: each column renders its matching cards in the top row and the rest in
the bottom row, vertically aligned; with no hero there is a single row. Keep the split
generic so pitch/rarity filters can be added later without touching layout code.

## 4. Rendering

Screen layout (menu bar unchanged except as noted):

- **Menu bar right track** (currently empty) takes the deck count "X / 30", the pitch bar and
  the Export button, since the pane headers that housed them disappear.
- **Toolbar** (slim, above the pool): sort selector — Name / Pitch / Rarity, default Rarity —
  and the existing card-size toggle. Sort applies to the pool row order and within columns.
- **Pool row**: one horizontally scrolling row, one stack per distinct cardId with an `xN`
  badge for the remaining unselected copies (badge sits below the cost; hidden at 1). Click
  selects one copy. No drag, no reorder. Greyed non-matching stacks at the end.
- **Selected area**: kit stack fixed at the head (hero fully visible, weapon and equipment
  strips behind; not draggable, no insertion point before it), then the columns. Cards
  overlap so pitch, name and cost stay readable; a card following an `xN` group is offset a
  little further down so the badge stays visible. Click deselects one copy.

Component sketch: `Toolbar`, `PoolRow`, `DeckArea` (owns the two aligned rows and shared
horizontal scroll), `DeckColumnView`, `CardGroupView` (card + badge; reused by the pool),
`KitStack`. The old `Pane`, `CardStackView`, group separators, and the "add all / remove all"
links all go — bulk actions can return later once the table has settled. The hover preview
stays, suppressed while a drag is in progress.

## 5. Drag and drop — @dnd-kit

`@dnd-kit/core` (+ `@dnd-kit/sortable` where it fits). It is pointer-based (real touch
support), accessible, and takes custom collision detection, which the insertion bar needs.
Native HTML5 drag is what produces the default drag ghost the spec bans, so avoid libraries
built on it.

- Draggables: card groups (always the whole group) and columns (via a slim handle that
  appears above a column on hover — the spec requires column moves but names no affordance;
  this is the proposed one).
- Drop feedback: target column highlights; the gap between columns shows a thin vertical bar
  where a new column would be created. Custom collision detection decides column-vs-gap from
  the pointer position.
- While dragging, the drag image is the compact card strip, never the enlarged preview.
- Column moves carry both rows' stacks, which falls out of columns being the unit of state.

## 6. What this touches elsewhere

- `deckCount`, `pitchSplit`, `deckIssues`, `exportDeck`: rework to `(cardId, count)` entries
  flattened from `columns`. Output of the export is unchanged. `groupCards`, `CardGroup`,
  `unplayableGroup`, `toStacks`, `fixedStack` are deleted with the old view.
- `MainScreen` deck counts read from the new shape; outdated events get the greyed tag.
- Docs: rewrite the README "Building a deck" section; tick the table-UI, layout-stability and
  set-aside items in `docs/TODO.md` (the two-row filter split IS the set-aside behaviour);
  note in `CLAUDE.md` that `notes/mtga-ui.md` is the UI spec.

## 7. Build order

1. `columns.ts` + tests — the whole spec as pure functions, green before any UI.
2. Schema v2: generator to cardIds, event creation, storage, legacy-error screen, MainScreen.
3. Static table: toolbar, pool row, kit stack, columns with badges, click select/deselect,
   filter rows. The app is fully usable at this point, just without drag.
4. dnd-kit: group drag, insertion bar, column handle, preview suppression.
5. Docs, and a visual pass with the owner (CLAUDE.md rule: show before committing).

Each step should leave typecheck, build and tests green so the branch stays bisectable.
