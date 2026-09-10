import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type ClientRect,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import type React from 'react'
import { useState } from 'react'
import { CARD } from './cardMetrics'
import { CardArt } from './CardArt'
import { addCardAt, columnOf, mergeColumns, moveColumn, moveGroup, removeCards } from './columns'
import { DeckArea } from './DeckArea'
import { matches, type Filter } from './filters'
import { PoolRow } from './PoolRow'
import type { CardCount, DeckColumn, PoolCard, SortMode } from './types'

/** How close to a column's edge the pointer must be to mean "make a new column here". */
const EDGE = 34

interface DragData {
  type?: string
  cardId?: string
  columnId?: string
  index?: number
}

const inside = (rect: ClientRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

/**
 * The whole build screen is one drag context, so a card can cross between the pool and the
 * deck. Where a drop lands depends on what is being dragged:
 *
 *   - over the pool, a deck group means "take this out"; nothing else can be dropped there;
 *   - a pool card whose copies are already in the deck can only go to that pile, since copies
 *     never split up — the pile is forced and highlighted whatever the pointer is over;
 *   - otherwise the middle of a column drops onto it and its edges mean "new column here",
 *     which is the same rule whether you are dragging one card group or a whole pile.
 */
const collisionFor = (locked: string | null): CollisionDetection => (args) => {
  const { droppableContainers, pointerCoordinates, active } = args
  if (!pointerCoordinates) return closestCenter(args)
  const activeType = (active.data.current as DragData | undefined)?.type

  const gaps = new Map<number, UniqueIdentifier>()
  const columns: { index: number; id: UniqueIdentifier; rect: ClientRect }[] = []
  let pool: { id: UniqueIdentifier; rect: ClientRect } | null = null
  for (const container of droppableContainers) {
    const data = container.data.current as DragData | undefined
    const rect = container.rect.current
    if (data?.type === 'gap') gaps.set(data.index!, container.id)
    else if (data?.type === 'column' && rect) {
      columns.push({ index: data.index!, id: container.id, rect })
    } else if (data?.type === 'pool' && rect) pool = { id: container.id, rect }
  }
  columns.sort((a, b) => a.rect.left - b.rect.left)

  const { x, y } = pointerCoordinates
  if (pool && inside(pool.rect, x, y)) {
    return activeType === 'group' ? [{ id: pool.id }] : []
  }

  if (locked) {
    const target = columns.find((c) => c.id === `col:${locked}`)
    return target ? [{ id: target.id }] : []
  }

  const gap = (index: number) => {
    const id = gaps.get(index)
    return id === undefined ? [] : [{ id }]
  }
  if (!columns.length) return gap([...gaps.keys()][0] ?? 0)

  // A pile cannot be dropped onto itself; nothing lights up while it is over its own slot.
  const self = activeType === 'column' ? `col:${(active.data.current as DragData).columnId}` : null

  for (const column of columns) {
    if (x < column.rect.left + EDGE) return gap(column.index)
    if (x <= column.rect.right - EDGE) return column.id === self ? [] : [{ id: column.id }]
    if (x <= column.rect.right) return gap(column.index + 1)
  }
  return gap([...gaps.keys()].at(-1) ?? columns.length)
}

export function Table({
  columns,
  pool,
  remaining,
  byId,
  filter,
  sort,
  hero,
  kit,
  onColumnsChange,
  onSelect,
  onDeselect,
}: {
  columns: DeckColumn[]
  pool: Record<string, number>
  remaining: CardCount[]
  byId: Map<string, PoolCard>
  filter: Filter
  sort: SortMode
  hero: PoolCard | null
  kit: PoolCard[]
  onColumnsChange: (columns: DeckColumn[]) => void
  onSelect: (cardId: string) => void
  onDeselect: (cardId: string) => void
}) {
  const [dragged, setDragged] = useState<{ card: PoolCard; count: number; pile?: number } | null>(
    null,
  )
  const [locked, setLocked] = useState<string | null>(null)
  const sensors = useSensors(
    // A small threshold, so a click still selects and only a real drag picks the card up.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const illegalCards = columns
    .flatMap((column) => column.cards)
    .filter((entry) => {
      const card = byId.get(entry.cardId)
      return card && !matches(card, filter)
    })
  const illegal = illegalCards.reduce((sum, entry) => sum + entry.count, 0)

  const start = ({ active }: DragStartEvent) => {
    const data = active.data.current as DragData | undefined
    if (data?.type === 'column') {
      const column = columns.find((c) => c.id === data.columnId)
      const card = column && byId.get(column.cards[0].cardId)
      if (column && card) {
        const copies = column.cards.reduce((sum, entry) => sum + entry.count, 0)
        setDragged({ card, count: 1, pile: copies })
      }
      return
    }
    if (!data?.cardId) return

    const card = byId.get(data.cardId)
    if (data.type === 'group') {
      const entry = columns.flatMap((c) => c.cards).find((e) => e.cardId === data.cardId)
      if (card && entry) setDragged({ card, count: entry.count })
      return
    }
    if (data.type === 'poolCard') {
      if (card) setDragged({ card, count: 1 })
      // Copies never split up, so this card can only go back to the pile it is already in.
      const home = columnOf(columns, data.cardId)
      setLocked(home?.id ?? null)
      if (home) {
        document
          .querySelector(`[data-column-id="${home.id}"]`)
          ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
      }
    }
  }

  const clear = () => {
    setDragged(null)
    setLocked(null)
  }

  const end = ({ active, over }: DragEndEvent) => {
    clear()
    const from = active.data.current as DragData | undefined
    const to = over?.data.current as DragData | undefined
    if (!from || !to) return

    if (from.type === 'group' && to.type === 'pool') {
      onColumnsChange(removeCards(columns, [from.cardId!]))
      return
    }

    if (from.type === 'column') {
      if (to.type === 'column') {
        onColumnsChange(mergeColumns(columns, from.columnId!, to.columnId!))
        return
      }
      if (to.type === 'gap') {
        const at = columns.findIndex((c) => c.id === from.columnId)
        // The gap index counts the dragged column, which moveColumn no longer sees.
        onColumnsChange(
          moveColumn(columns, from.columnId!, at < to.index! ? to.index! - 1 : to.index!),
        )
      }
      return
    }

    if (from.type === 'poolCard' && from.cardId) {
      const target =
        to.type === 'column'
          ? ({ kind: 'column', columnId: to.columnId! } as const)
          : ({ kind: 'newColumn', index: to.index! } as const)
      onColumnsChange(addCardAt(columns, from.cardId, target, { limit: pool[from.cardId] }))
      return
    }

    if (from.type !== 'group' || !from.cardId) return
    if (to.type === 'column') {
      onColumnsChange(moveGroup(columns, from.cardId, { kind: 'column', columnId: to.columnId! }))
      return
    }
    if (to.type === 'gap') {
      const at = columns.findIndex((c) => c.cards.some((e) => e.cardId === from.cardId))
      const emptied = columns[at]?.cards.length === 1
      const index = emptied && at < to.index! ? to.index! - 1 : to.index!
      onColumnsChange(moveGroup(columns, from.cardId, { kind: 'newColumn', index }))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionFor(locked)}
      onDragStart={start}
      onDragEnd={end}
      onDragCancel={clear}
    >
      {/* One card width for the whole table, shared with the stack maths in cardMetrics. */}
      <div className="table" style={{ '--card-w': `${CARD.width}px` } as React.CSSProperties}>
        <PoolRow
          entries={remaining}
          byId={byId}
          filter={filter}
          sort={sort}
          onSelect={onSelect}
        />
        <DeckArea
          columns={columns}
          byId={byId}
          filter={filter}
          sort={sort}
          hero={hero}
          kit={kit}
          illegal={illegal}
          onDeselect={onDeselect}
          onRemoveIllegal={() =>
            onColumnsChange(removeCards(columns, illegalCards.map((e) => e.cardId)))
          }
        />
      </div>

      {/* The compact card, never anything larger: the spec is explicit about it. */}
      <DragOverlay dropAnimation={null}>
        {dragged && (
          <div className="drag-ghost" style={{ width: CARD.width }}>
            <CardArt card={dragged.card} />
            {dragged.count > 1 && <span className="copies">&times;{dragged.count}</span>}
            {dragged.pile && (
              <span className="pile-badge">
                pile of {dragged.pile} card{dragged.pile > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
