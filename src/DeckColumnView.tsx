import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CARD, stackOffsets } from './cardMetrics'
import { CardGroupView } from './CardGroupView'
import type { CardCount, DeckColumn, PoolCard } from './types'

/** Copies of a card are one draggable: they always travel together. */
function DraggableGroup({
  card,
  entry,
  top,
  onDeselect,
}: {
  card: PoolCard
  entry: CardCount
  top: number
  onDeselect: () => void
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `group:${entry.cardId}`,
    data: { type: 'group', cardId: entry.cardId },
  })

  return (
    <CardGroupView
      card={card}
      count={entry.count}
      style={{ top }}
      dragging={isDragging}
      onClick={onDeselect}
      handleRef={setNodeRef}
      handleProps={{ ...listeners, ...attributes }}
    />
  )
}

/**
 * The rail above a column: how you pick the whole pile up. It spans the column's full width
 * rather than being a small grip, because grabbing "the pile" should not mean hitting a few
 * pixels of background — and it is where a pile's name will go when piles get names.
 */
function ColumnHandle({ columnId, cards }: { columnId: string; cards: number }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `column:${columnId}`,
    data: { type: 'column', columnId },
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={isDragging ? 'column-handle dragging' : 'column-handle'}
      title={`Pile of ${cards} card${cards > 1 ? 's' : ''} — drag to move or merge the whole pile`}
      {...listeners}
      {...attributes}
    >
      <span aria-hidden>⠿</span>
    </button>
  )
}

/** One pile on the table: overlapping cards, in the order the active sort dictates. */
export function DeckColumnView({
  column,
  index,
  entries,
  byId,
  onDeselect,
}: {
  column: DeckColumn
  /** Its place in the row, which the insertion-point collision detection works from. */
  index: number
  entries: CardCount[]
  byId: Map<string, PoolCard>
  onDeselect: (cardId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: 'column', columnId: column.id, index },
  })
  const { tops, height } = stackOffsets(entries)

  return (
    <div
      ref={setNodeRef}
      data-column-id={column.id}
      className={isOver ? 'deck-column over' : 'deck-column'}
      style={{ width: CARD.width, height }}
    >
      <ColumnHandle
        columnId={column.id}
        cards={entries.reduce((sum, entry) => sum + entry.count, 0)}
      />
      {entries.map((entry, i) => (
        <DraggableGroup
          key={entry.cardId}
          card={byId.get(entry.cardId)!}
          entry={entry}
          top={tops[i]}
          onDeselect={() => onDeselect(entry.cardId)}
        />
      ))}
    </div>
  )
}
