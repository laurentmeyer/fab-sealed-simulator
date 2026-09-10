import { useDroppable } from '@dnd-kit/core'
import { CARD, stackHeight } from './cardMetrics'
import { CardGroupView } from './CardGroupView'
import type { PoolCard } from './types'

/**
 * What you take into the arena, at the head of the deck row: your hero and its weapon, which
 * the kit puts into play for you, then whatever equipment you have chosen to wear.
 *
 * The kit hands you the Arms and the cold-foil pieces but does not put them on — that is your
 * call, as it is at a real pre-release — so equipment arrives here from the pool by a click or
 * a drag, and a click sends it back. It stacks like every other pile, with the hero shown in
 * full and the rest peeking out above it.
 */
export function ArenaStack({
  hero,
  weapon,
  worn,
  onRemove,
}: {
  hero: PoolCard
  weapon: PoolCard | null
  /** Equipment you chose, in the order it should read. */
  worn: PoolCard[]
  onRemove: (cardId: string) => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'arena', data: { type: 'arena' } })
  const landing = isOver && active?.data.current?.type === 'equipment'

  // Drawn bottom-first so the hero, last of all, is the one shown whole.
  const locked = [...(weapon ? [weapon] : []), hero]
  const cards = [...worn, ...locked]

  return (
    <div
      ref={setNodeRef}
      className={landing ? 'arena-stack landing' : 'arena-stack'}
      style={{ width: CARD.width, height: stackHeight(cards.length) }}
    >
      {cards.map((entry, i) => {
        const fixed = entry === hero || entry === weapon
        return (
          <CardGroupView
            key={entry.id}
            card={entry}
            count={1}
            locked={fixed}
            style={{ top: i * CARD.step }}
            onClick={fixed ? undefined : () => onRemove(entry.id)}
          />
        )
      })}
    </div>
  )
}

/** The arena when there is no hero yet: somewhere for equipment to land all the same. */
export function EmptyArena() {
  const { setNodeRef, isOver, active } = useDroppable({ id: 'arena', data: { type: 'arena' } })
  const landing = isOver && active?.data.current?.type === 'equipment'

  return (
    <div
      ref={setNodeRef}
      className={landing ? 'arena-stack empty landing' : 'arena-stack empty'}
      style={{ width: CARD.width, height: CARD.height }}
    >
      <p>Pick a hero</p>
    </div>
  )
}
