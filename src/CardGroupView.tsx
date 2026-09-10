import type { CSSProperties } from 'react'
import { CardArt } from './CardArt'
import type { PoolCard } from './types'

/**
 * Every copy of one card, shown as a single card with an "xN" badge — the pool row and the
 * deck columns are both made of these. Copies never show as separate cards: they always move
 * together, so a counter says more than a fan of identical art would.
 *
 * No tooltip: the card says what it is, and one popping up over the pile below it is in the
 * way. The <img> alt (or the text fallback) is what carries the name to a screen reader.
 */
export function CardGroupView({
  card,
  count,
  onClick,
  locked,
  dimmed,
  dragging,
  style,
  handleRef,
  handleProps,
}: {
  card: PoolCard
  count: number
  onClick?: () => void
  /** Kit cards, which come with the hero and cannot be moved or clicked away. */
  locked?: boolean
  /** The chosen hero cannot play this card. */
  dimmed?: boolean
  dragging?: boolean
  style?: CSSProperties
  handleRef?: (node: HTMLElement | null) => void
  handleProps?: Record<string, unknown>
}) {
  const className = ['card-group', locked && 'locked', dimmed && 'dimmed', dragging && 'dragging']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} style={style}>
      <button
        type="button"
        className="card-tile"
        ref={handleRef}
        aria-disabled={locked || undefined}
        onClick={locked ? undefined : onClick}
        {...handleProps}
      >
        <CardArt card={card} />
        {count > 1 && <span className="copies">&times;{count}</span>}
      </button>
    </div>
  )
}
