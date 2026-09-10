import type { CardCount, DeckColumn } from './types'

/**
 * The deck is a row of columns — the piles you would push around on a table. Every rule from
 * notes/mtga-ui.md lives here as a pure transition over `DeckColumn[]`, so the table's
 * behaviour is testable without a browser.
 *
 * Two invariants hold after every transition:
 *   - a cardId lives in at most one column (copies never split across piles);
 *   - there are no empty columns (a pile you empty ceases to exist — no holes in the row).
 */

export const newColumnId = (): string =>
  // randomUUID needs a secure context; self-hosting over plain http would otherwise break.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `col-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

/** Where a dragged group lands: on an existing column, or as a new one at an index. */
export type MoveTarget =
  | { kind: 'column'; columnId: string }
  | { kind: 'newColumn'; index: number }

interface AddOptions {
  /** Copies opened of that card. Selecting past it is a no-op. */
  limit?: number
  makeId?: () => string
}

/** A card's pitch value, or null for the handful of cards that have none. */
export type PitchOf = (cardId: string) => number | null

/** What a column holds: one pitch value, or a hand-built mix of several. */
export type ColumnPitch = number | null | 'mixed'

export const pitchOfColumn = (column: DeckColumn, pitchOf: PitchOf): ColumnPitch => {
  const pitches = new Set(column.cards.map((c) => pitchOf(c.cardId)))
  return pitches.size === 1 ? [...pitches][0] : 'mixed'
}

/** Red, then yellow, then blue, then the handful of cards with no pitch at all. */
const colourRank = (pitch: number | null) => pitch ?? Number.MAX_SAFE_INTEGER

/**
 * Where a freshly clicked card goes, scanning the row from the head.
 *
 * The row organises itself by pitch until you take it over by hand. The card joins the column
 * of its own colour; failing that it opens a new one in colour order, so the row reads red,
 * yellow, blue. The scan stops at the first column you mixed yourself and inserts in front of
 * it: past that point the row is yours, so the tidy single-colour piles stay at the head and
 * the piles you built stay where you put them, to the right.
 */
export const insertionFor = (
  columns: DeckColumn[],
  pitch: number | null,
  pitchOf: PitchOf,
): MoveTarget => {
  for (const [index, column] of columns.entries()) {
    const colour = pitchOfColumn(column, pitchOf)
    if (colour === 'mixed') return { kind: 'newColumn', index }
    if (colour === pitch) return { kind: 'column', columnId: column.id }
    if (colourRank(colour) > colourRank(pitch)) return { kind: 'newColumn', index }
  }
  return { kind: 'newColumn', index: columns.length }
}

/** How many copies of a card are currently selected, across the whole row. */
export const countOf = (columns: DeckColumn[], cardId: string): number =>
  columns.reduce(
    (sum, column) => sum + (column.cards.find((c) => c.cardId === cardId)?.count ?? 0),
    0,
  )

/** The column holding a card, or null when it is not selected. */
export const columnOf = (columns: DeckColumn[], cardId: string): DeckColumn | null =>
  columns.find((column) => column.cards.some((c) => c.cardId === cardId)) ?? null

/** Every selected card with its count, in column order. */
export const selectedEntries = (columns: DeckColumn[]): CardCount[] =>
  columns.flatMap((column) => column.cards)

/** Copies of each card still unselected: the pool row's contents. */
export const remainingPool = (
  pool: Record<string, number>,
  columns: DeckColumn[],
): CardCount[] =>
  Object.entries(pool)
    .map(([cardId, opened]) => ({ cardId, count: opened - countOf(columns, cardId) }))
    .filter((entry) => entry.count > 0)

/**
 * Adds one copy at a chosen place. Copies of a card always travel together, so an
 * already-selected card just gains a counter wherever it sits and the target is ignored.
 */
export const addCardAt = (
  columns: DeckColumn[],
  cardId: string,
  target: MoveTarget,
  { limit, makeId = newColumnId }: AddOptions = {},
): DeckColumn[] => {
  const current = countOf(columns, cardId)
  if (limit !== undefined && current >= limit) return columns

  if (current > 0) {
    return columns.map((column) =>
      column.cards.some((c) => c.cardId === cardId)
        ? {
            ...column,
            cards: column.cards.map((c) =>
              c.cardId === cardId ? { ...c, count: c.count + 1 } : c,
            ),
          }
        : column,
    )
  }

  const entry = { cardId, count: 1 }
  if (target.kind === 'column') {
    if (!columns.some((column) => column.id === target.columnId)) return columns
    return columns.map((column) =>
      column.id === target.columnId ? { ...column, cards: [...column.cards, entry] } : column,
    )
  }

  const next = [...columns]
  next.splice(Math.max(0, Math.min(target.index, next.length)), 0, { id: makeId(), cards: [entry] })
  return next
}

/** Adds one copy where the pitch rule says it belongs. This is what clicking a pool card does. */
export const selectCard = (
  columns: DeckColumn[],
  cardId: string,
  pitchOf: PitchOf,
  options: AddOptions = {},
): DeckColumn[] =>
  addCardAt(columns, cardId, insertionFor(columns, pitchOf(cardId), pitchOf), options)

/** Removes one copy. The entry goes at zero, and the column with it once it is empty. */
export const deselectCard = (columns: DeckColumn[], cardId: string): DeckColumn[] =>
  columns
    .map((column) => ({
      ...column,
      cards: column.cards
        .map((c) => (c.cardId === cardId ? { ...c, count: c.count - 1 } : c))
        .filter((c) => c.count > 0),
    }))
    .filter((column) => column.cards.length > 0)

/** Takes every copy of these cards back out of the deck, and any column they emptied. */
export const removeCards = (columns: DeckColumn[], cardIds: string[]): DeckColumn[] => {
  const gone = new Set(cardIds)
  return columns
    .map((column) => ({ ...column, cards: column.cards.filter((c) => !gone.has(c.cardId)) }))
    .filter((column) => column.cards.length > 0)
}

/**
 * Moves every copy of a card to another column, or out into a new one.
 *
 * A `newColumn` index is read against the row that remains *after* the group has left: moving
 * the only group of a column removes that column, which shifts every index behind it.
 */
export const moveGroup = (
  columns: DeckColumn[],
  cardId: string,
  target: MoveTarget,
  makeId: () => string = newColumnId,
): DeckColumn[] => {
  const source = columnOf(columns, cardId)
  const entry = source?.cards.find((c) => c.cardId === cardId)
  if (!source || !entry) return columns
  if (target.kind === 'column' && target.columnId === source.id) return columns

  const rest = columns
    .map((column) =>
      column.id === source.id
        ? { ...column, cards: column.cards.filter((c) => c.cardId !== cardId) }
        : column,
    )
    .filter((column) => column.cards.length > 0)

  if (target.kind === 'column') {
    if (!rest.some((column) => column.id === target.columnId)) return columns
    return rest.map((column) =>
      column.id === target.columnId ? { ...column, cards: [...column.cards, entry] } : column,
    )
  }

  // A lone group dragged out of its own column would land back where it started.
  const index = Math.max(0, Math.min(target.index, rest.length))
  const next = [...rest]
  next.splice(index, 0, { id: makeId(), cards: [entry] })
  return next
}

/**
 * Tips one whole pile onto another. The cards keep their identity — a cardId still lives in
 * exactly one column — and the emptied column goes, like any other.
 */
export const mergeColumns = (
  columns: DeckColumn[],
  sourceId: string,
  targetId: string,
): DeckColumn[] => {
  if (sourceId === targetId) return columns
  const source = columns.find((column) => column.id === sourceId)
  if (!source || !columns.some((column) => column.id === targetId)) return columns

  return columns
    .filter((column) => column.id !== sourceId)
    .map((column) =>
      column.id === targetId ? { ...column, cards: [...column.cards, ...source.cards] } : column,
    )
}

/** Reorders whole columns. `toIndex` is read against the row with the column already lifted. */
export const moveColumn = (
  columns: DeckColumn[],
  columnId: string,
  toIndex: number,
): DeckColumn[] => {
  const from = columns.findIndex((column) => column.id === columnId)
  if (from < 0) return columns
  const next = [...columns]
  const [column] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, column)
  return next
}

/** No empty columns, no split card, no duplicate column id, no non-positive count. */
export const isWellFormed = (columns: DeckColumn[]): boolean => {
  const seenCards = new Set<string>()
  const seenColumns = new Set<string>()
  for (const column of columns) {
    if (!column.cards.length) return false
    if (seenColumns.has(column.id)) return false
    seenColumns.add(column.id)
    for (const { cardId, count } of column.cards) {
      if (count <= 0 || !Number.isInteger(count)) return false
      if (seenCards.has(cardId)) return false
      seenCards.add(cardId)
    }
  }
  return true
}

/** No card is selected more times than it was opened. */
export const fitsPool = (columns: DeckColumn[], pool: Record<string, number>): boolean =>
  selectedEntries(columns).every(({ cardId, count }) => count <= (pool[cardId] ?? 0))
