import { CARD, stackHeight } from './cardMetrics'
import { CardGroupView } from './CardGroupView'
import type { PoolCard } from './types'

/**
 * What comes with the hero rather than out of a pack: the hero itself, its weapon and its
 * equipment. It is fixed at the head of the deck row — no filter applies to it, nothing can be
 * dropped before it, and none of it can be clicked away. It stacks like every other pile: each
 * card shows its header, and the last one in full — which is the hero, the one card of the
 * arena you want to keep looking at while you build.
 */
export function KitStack({ hero, kit }: { hero: PoolCard; kit: PoolCard[] }) {
  // The hero comes last so it is the card shown in full; its gear peeks out above it.
  const cards = [...kit, hero]

  return (
    <div
      className="kit-stack"
      style={{ width: CARD.width, height: stackHeight(cards.length) }}
    >
      {cards.map((card, i) => (
        <CardGroupView
          key={card.id}
          card={card}
          count={1}
          locked
          style={{ top: i * CARD.step }}
        />
      ))}
    </div>
  )
}
