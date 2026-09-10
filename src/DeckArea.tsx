import { useDroppable } from '@dnd-kit/core'
import { Fragment } from 'react'
import { CARD, stackHeight, stackOffsets } from './cardMetrics'
import { DeckColumnView } from './DeckColumnView'
import { matches, type Filter } from './filters'
import { KitStack } from './KitStack'
import { compareBy } from './sorting'
import type { DeckColumn, PoolCard, SortMode } from './types'

/**
 * Where a new column would be created. It is a real drop target so dnd-kit can highlight it,
 * but the collision detection in Table decides when the pointer means the gap rather than the
 * column beside it — a 14px strip would be impossible to hit otherwise.
 *
 * With no piles yet it is the only target there is, so it widens enough to be aimed at and
 * says what to do with it.
 */
function Gap({
  index,
  height,
  hint,
}: {
  index: number
  height: number
  /** Shown when this gap is the whole of the deck row. */
  hint?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `gap:${index}`, data: { type: 'gap', index } })
  const className = ['column-gap', hint && 'wide', isOver && 'over'].filter(Boolean).join(' ')

  return (
    <div ref={setNodeRef} className={className} style={{ height }}>
      <span className="gap-bar" aria-hidden />
      {hint && <p className="empty">{hint}</p>}
    </div>
  )
}

/**
 * Cards the hero cannot play are not shown at all — they are not part of this deck, and a
 * greyed-out pile of them is just noise you have to look past. One tile at the tail of the row
 * says how many there are and offers to clear them out.
 */
function IllegalCards({ count, onRemove }: { count: number; onRemove: () => void }) {
  return (
    <div className="illegal-card" style={{ width: CARD.width, height: CARD.height }}>
      <span className="illegal-count">{count}</span>
      <p className="illegal-text">
        illegal card{count > 1 ? 's' : ''} for the selected hero, hidden from the deck
      </p>
      <button type="button" className="link" onClick={onRemove}>
        remove from deck
      </button>
    </div>
  )
}

/** The selected cards: the kit at the head, then one column per pile. */
export function DeckArea({
  columns,
  byId,
  filter,
  sort,
  hero,
  kit,
  illegal,
  onDeselect,
  onRemoveIllegal,
}: {
  columns: DeckColumn[]
  byId: Map<string, PoolCard>
  filter: Filter
  sort: SortMode
  hero: PoolCard | null
  kit: PoolCard[]
  /** Copies of cards the hero cannot play, which are held but never drawn. */
  illegal: number
  onDeselect: (cardId: string) => void
  onRemoveIllegal: () => void
}) {
  const compare = compareBy(sort)
  const laid = columns
    .map((column, index) => ({
      column,
      index,
      entries: column.cards
        .filter((entry) => {
          const card = byId.get(entry.cardId)
          return card && matches(card, filter)
        })
        .sort((a, b) => compare(byId.get(a.cardId)!, byId.get(b.cardId)!)),
    }))
    // A column holding nothing but illegal cards has nothing to show; it comes back on its own
    // as soon as the hero changes.
    .filter((slot) => slot.entries.length > 0)

  const rowHeight = Math.max(
    CARD.height,
    hero ? stackHeight(kit.length + 1) : 0,
    ...laid.map((slot) => stackOffsets(slot.entries).height),
  )

  // With no piles the row still has to be droppable: the first card has to land somewhere.
  const hint = laid.length ? undefined : 'Click or drag cards from the pool to start a pile'

  return (
    <div className="deck-area">
      <div className="deck-row" style={{ minHeight: rowHeight }}>
        {hero && <KitStack hero={hero} kit={kit} />}
        <Gap index={laid[0]?.index ?? 0} height={rowHeight} hint={hint} />
        {laid.map(({ column, index, entries }, position) => (
          <Fragment key={column.id}>
            <DeckColumnView
              column={column}
              index={index}
              entries={entries}
              byId={byId}
              onDeselect={onDeselect}
            />
            {/* The next visible column's index, so a hidden column keeps its place in the row. */}
            <Gap index={laid[position + 1]?.index ?? columns.length} height={rowHeight} />
          </Fragment>
        ))}
        {/* Last, after the final insertion point: nothing goes beyond it. */}
        {illegal > 0 && <IllegalCards count={illegal} onRemove={onRemoveIllegal} />}
      </div>
    </div>
  )
}
