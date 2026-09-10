import { describe, expect, it } from 'vitest'
import {
  addCardAt,
  columnOf,
  deselectCard,
  fitsPool,
  insertionFor,
  isWellFormed,
  mergeColumns,
  moveColumn,
  moveGroup,
  pitchOfColumn,
  remainingPool,
  removeCards,
  selectCard,
  selectedEntries,
} from './columns'
import type { DeckColumn } from './types'

/** Predictable column ids, so a test can name the column it means. */
const ids = () => {
  let n = 0
  return () => `c${++n}`
}

const build = (...piles: string[][]): DeckColumn[] =>
  piles.map((pile, i) => ({
    id: `c${i}`,
    cards: pile.map((entry) => {
      const [cardId, count] = entry.split(':')
      return { cardId, count: count ? Number(count) : 1 }
    }),
  }))

/**
 * Pitch by card id, which is what decides where a clicked card lands. "r1" is a red card,
 * "y1" a yellow one, "b1" a blue one, and "n1" one of the rare cards with no pitch at all.
 */
const pitchOf = (cardId: string): number | null =>
  ({ r: 1, y: 2, b: 3 })[cardId[0]] ?? null

/** "a,b|c" — one string per column, cards separated by commas, counts after a colon. */
const show = (columns: DeckColumn[]): string =>
  columns
    .map((column) => column.cards.map((c) => (c.count > 1 ? `${c.cardId}:${c.count}` : c.cardId)).join(','))
    .join('|')

describe('insertionFor', () => {
  it('sends a card to the first column of its own colour', () => {
    const columns = build(['r1'], ['b1'], ['y1'])
    expect(insertionFor(columns, 3, pitchOf)).toEqual({ kind: 'column', columnId: 'c1' })
  })

  it('opens a new column in colour order, ahead of the colours that come after it', () => {
    const columns = build(['r1'], ['b1'])
    expect(insertionFor(columns, 2, pitchOf)).toEqual({ kind: 'newColumn', index: 1 })
  })

  it('skips the colours that come before it', () => {
    const columns = build(['r1'], ['y1'])
    expect(insertionFor(columns, 3, pitchOf)).toEqual({ kind: 'newColumn', index: 2 })
  })

  it('puts a red column at the very head, in front of every other colour', () => {
    expect(insertionFor(build(['y1'], ['b1']), 1, pitchOf)).toEqual({ kind: 'newColumn', index: 0 })
  })

  it('stops at the first hand-mixed column and inserts just before it', () => {
    // c1 holds a blue and a yellow: past that point the row is yours, not the rule's.
    const columns = build(['r1'], ['b1', 'y1'], ['b2'])
    expect(insertionFor(columns, 3, pitchOf)).toEqual({ kind: 'newColumn', index: 1 })
  })

  it('treats cards without a pitch as a colour of their own, sorted last', () => {
    const columns = build(['r1'], ['n1'])
    expect(insertionFor(columns, null, pitchOf)).toEqual({ kind: 'column', columnId: 'c1' })
    expect(insertionFor(build(['r1']), null, pitchOf)).toEqual({ kind: 'newColumn', index: 1 })
    // A blue card still goes in front of the pitchless pile.
    expect(insertionFor(columns, 3, pitchOf)).toEqual({ kind: 'newColumn', index: 1 })
  })

  it('opens the first column of an empty row', () => {
    expect(insertionFor([], 1, pitchOf)).toEqual({ kind: 'newColumn', index: 0 })
  })
})

describe('pitchOfColumn', () => {
  it('names a single-colour column and flags a mixed one', () => {
    expect(pitchOfColumn(build(['r1', 'r2'])[0], pitchOf)).toBe(1)
    expect(pitchOfColumn(build(['n1'])[0], pitchOf)).toBeNull()
    expect(pitchOfColumn(build(['r1', 'b1'])[0], pitchOf)).toBe('mixed')
  })
})

describe('selectCard', () => {
  it('builds one column per colour, in colour order whatever order you click', () => {
    const makeId = ids()
    let columns: DeckColumn[] = []
    for (const cardId of ['b1', 'n1', 'y1', 'r1', 'b2', 'r2']) {
      columns = selectCard(columns, cardId, pitchOf, { makeId })
    }
    expect(show(columns)).toBe('r1,r2|y1|b1,b2|n1')
    expect(isWellFormed(columns)).toBe(true)
  })

  it('merges into the existing group instead of opening a second one', () => {
    let columns = selectCard(build(['r1'], ['b1']), 'b1', pitchOf)
    columns = selectCard(columns, 'b1', pitchOf)
    expect(show(columns)).toBe('r1|b1:3')
  })

  it('leaves a hand-mixed column alone, opening a new one in front of it', () => {
    const columns = selectCard(build(['r1', 'b1']), 'y1', pitchOf, { makeId: ids() })
    expect(show(columns)).toBe('y1|r1,b1')
  })

  it('refuses to select more copies than were opened', () => {
    const columns = selectCard(build(['r1:2']), 'r1', pitchOf, { limit: 2 })
    expect(show(columns)).toBe('r1:2')
  })
})

describe('addCardAt', () => {
  it('drops a card into the column it was aimed at', () => {
    const columns = addCardAt(build(['r1'], ['b1']), 'y1', { kind: 'column', columnId: 'c1' })
    expect(show(columns)).toBe('r1|b1,y1')
  })

  it('opens a new column at the given index', () => {
    const columns = addCardAt(build(['r1'], ['b1']), 'y1', { kind: 'newColumn', index: 1 }, { makeId: ids() })
    expect(show(columns)).toBe('r1|y1|b1')
  })

  it('ignores the target for a card already in the deck: copies stay together', () => {
    const columns = addCardAt(build(['r1'], ['b1']), 'r1', { kind: 'column', columnId: 'c1' })
    expect(show(columns)).toBe('r1:2|b1')
  })
})

describe('removeCards', () => {
  it('takes every copy out, and any column they emptied with them', () => {
    const columns = removeCards(build(['r1:3', 'b1'], ['y1']), ['r1', 'y1'])
    expect(show(columns)).toBe('b1')
  })

  it('leaves the row alone when it holds none of them', () => {
    expect(show(removeCards(build(['r1']), ['b1']))).toBe('r1')
  })
})

describe('deselectCard', () => {
  it('removes a single copy of a group, leaving the rest', () => {
    expect(show(deselectCard(build(['ash:3']), 'ash'))).toBe('ash:2')
  })

  it('drops the entry at zero but keeps a column that still holds cards', () => {
    expect(show(deselectCard(build(['ash', 'bolt']), 'ash'))).toBe('bolt')
  })

  it('collapses the column once it is empty — no holes in the row', () => {
    const columns = deselectCard(build(['ash'], ['bolt'], ['cinder']), 'bolt')
    expect(show(columns)).toBe('ash|cinder')
    expect(columns).toHaveLength(2)
  })

  it('ignores a card that is not selected', () => {
    expect(show(deselectCard(build(['ash']), 'bolt'))).toBe('ash')
  })
})

describe('moveGroup', () => {
  it('moves every copy at once, into an existing column', () => {
    const columns = moveGroup(build(['ash:3'], ['bolt']), 'ash', { kind: 'column', columnId: 'c1' })
    expect(show(columns)).toBe('bolt,ash:3')
    expect(isWellFormed(columns)).toBe(true)
  })

  it('leaves no empty column behind', () => {
    const columns = moveGroup(build(['ash'], ['bolt']), 'ash', { kind: 'column', columnId: 'c1' })
    expect(columns).toHaveLength(1)
  })

  it('is a no-op when the target is the column the card is already in', () => {
    const before = build(['ash', 'bolt'])
    expect(moveGroup(before, 'ash', { kind: 'column', columnId: 'c0' })).toBe(before)
  })

  it('creates a new column at the head, between, and at the tail', () => {
    const before = build(['ash'], ['bolt'], ['cinder'])
    const at = (index: number) =>
      show(moveGroup(before, 'cinder', { kind: 'newColumn', index }, ids()))

    expect(at(0)).toBe('cinder|ash|bolt')
    expect(at(1)).toBe('ash|cinder|bolt')
    expect(at(2)).toBe('ash|bolt|cinder')
  })

  /**
   * The index is read against the row the group leaves behind. Dropping the last group of
   * column 0 at "index 1" means after `bolt`, and the vanished column must not be counted.
   */
  it('reads the insertion index after the emptied column is removed', () => {
    const columns = moveGroup(build(['ash'], ['bolt']), 'ash', { kind: 'newColumn', index: 1 }, ids())
    expect(show(columns)).toBe('bolt|ash')
    expect(columns).toHaveLength(2)
  })

  it('clamps an index past the end of the row', () => {
    expect(show(moveGroup(build(['ash'], ['bolt']), 'ash', { kind: 'newColumn', index: 9 }, ids())))
      .toBe('bolt|ash')
  })

  it('ignores a card that is not selected, and a column that does not exist', () => {
    const before = build(['ash'])
    expect(moveGroup(before, 'bolt', { kind: 'newColumn', index: 0 })).toBe(before)
    expect(moveGroup(before, 'ash', { kind: 'column', columnId: 'nope' })).toBe(before)
  })
})

describe('mergeColumns', () => {
  it('tips one pile onto another and drops the empty column', () => {
    const columns = mergeColumns(build(['r1', 'r2'], ['b1'], ['y1']), 'c0', 'c2')
    expect(show(columns)).toBe('b1|y1,r1,r2')
    expect(isWellFormed(columns)).toBe(true)
  })

  it('ignores a merge into itself, and an unknown column either side', () => {
    const before = build(['r1'], ['b1'])
    expect(mergeColumns(before, 'c0', 'c0')).toBe(before)
    expect(mergeColumns(before, 'nope', 'c0')).toBe(before)
    expect(mergeColumns(before, 'c0', 'nope')).toBe(before)
  })
})

describe('moveColumn', () => {
  it('reorders whole columns, carrying every card with them', () => {
    const before = build(['ash', 'bolt'], ['cinder'], ['dusk'])
    expect(show(moveColumn(before, 'c0', 2))).toBe('cinder|dusk|ash,bolt')
    expect(show(moveColumn(before, 'c2', 0))).toBe('dusk|ash,bolt|cinder')
  })

  it('ignores an unknown column and clamps an index past the end', () => {
    const before = build(['ash'], ['bolt'])
    expect(moveColumn(before, 'nope', 0)).toBe(before)
    expect(show(moveColumn(before, 'c0', 9))).toBe('bolt|ash')
  })
})

describe('the row as a whole', () => {
  const pool = { r1: 3, b1: 1 }

  it('counts what is left in the pool, and hides what is fully selected', () => {
    let columns = selectCard([], 'r1', pitchOf)
    columns = selectCard(columns, 'b1', pitchOf)
    expect(remainingPool(pool, columns)).toEqual([{ cardId: 'r1', count: 2 }])
  })

  it('flattens to the entries the deck count and the export work from', () => {
    const columns = build(['r1:2'], ['b1'])
    expect(selectedEntries(columns)).toEqual([
      { cardId: 'r1', count: 2 },
      { cardId: 'b1', count: 1 },
    ])
  })

  it('names the column a card sits in', () => {
    expect(columnOf(build(['r1'], ['b1']), 'b1')?.id).toBe('c1')
    expect(columnOf(build(['r1']), 'b1')).toBeNull()
  })

  it('keeps its invariants through a long run of random moves', () => {
    const pool = { r1: 3, b1: 1, y1: 2, n1: 2 }
    const cards = Object.keys(pool)
    let columns: DeckColumn[] = []
    let seed = 7
    const roll = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n

    for (let i = 0; i < 400; i++) {
      const cardId = cards[roll(cards.length)]
      const move = roll(5)
      const limit = pool[cardId as keyof typeof pool]
      if (move === 0) columns = selectCard(columns, cardId, pitchOf, { limit })
      else if (move === 1) columns = deselectCard(columns, cardId)
      else if (move === 2) columns = removeCards(columns, [cardId])
      else if (move === 3 && columns.length)
        columns = moveGroup(columns, cardId, {
          kind: 'column',
          columnId: columns[roll(columns.length)].id,
        })
      else if (columns.length)
        columns = moveGroup(columns, cardId, { kind: 'newColumn', index: roll(columns.length + 1) })

      expect(isWellFormed(columns)).toBe(true)
      expect(fitsPool(columns, pool)).toBe(true)
    }
  })
})
