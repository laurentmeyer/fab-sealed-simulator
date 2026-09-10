import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CARD } from './cardMetrics'
import { CardGroupView } from './CardGroupView'
import { matches, partition, type Filter } from './filters'
import { compareBy } from './sorting'
import type { CardCount, PoolCard, SortMode } from './types'

function PoolCardView({
  card,
  count,
  playable,
  onSelect,
}: {
  card: PoolCard
  count: number
  playable: boolean
  onSelect: () => void
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pool:${card.id}`,
    data: { type: 'poolCard', cardId: card.id },
  })

  return (
    <CardGroupView
      card={card}
      count={count}
      dimmed={!playable}
      dragging={isDragging}
      onClick={onSelect}
      handleRef={setNodeRef}
      handleProps={{ ...listeners, ...attributes }}
    />
  )
}

/**
 * Everything you opened and have not selected, one row, one card per distinct card with the
 * copies left on its badge. Clicking takes one copy into the deck and the pitch rule decides
 * where it lands; dragging lets you choose the pile yourself. Cards the hero cannot play fall
 * to the end greyed out rather than being hidden.
 *
 * The row is also the way back out: a group dropped here leaves the deck entirely, so the
 * whole section lights up rather than any spot within it.
 */
export function PoolRow({
  entries,
  byId,
  filter,
  sort,
  onSelect,
}: {
  entries: CardCount[]
  byId: Map<string, PoolCard>
  filter: Filter
  sort: SortMode
  onSelect: (cardId: string) => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'pool-section', data: { type: 'pool' } })
  const returning = isOver && active?.data.current?.type === 'group'

  const compare = compareBy(sort)
  const known = [...entries]
    .filter((entry) => byId.has(entry.cardId))
    .sort((a, b) => compare(byId.get(a.cardId)!, byId.get(b.cardId)!))
  const { matching, others } = partition(known, (entry) => byId.get(entry.cardId)!, filter)
  const sorted = [...matching, ...others]

  return (
    <div
      ref={setNodeRef}
      className={returning ? 'pool-row returning' : 'pool-row'}
      style={{ height: CARD.height + 24 }}
    >
      {sorted.length === 0 ? (
        <p className="empty">Every card you opened is in the deck.</p>
      ) : (
        sorted.map((entry) => (
          <PoolCardView
            key={entry.cardId}
            card={byId.get(entry.cardId)!}
            count={entry.count}
            playable={matches(byId.get(entry.cardId)!, filter)}
            onSelect={() => onSelect(entry.cardId)}
          />
        ))
      )}
      {/* Only while a card is over it: otherwise it would pad the row's scroll width. */}
      {returning && <p className="pool-hint">Drop a card here to take it out of the deck</p>}
    </div>
  )
}
