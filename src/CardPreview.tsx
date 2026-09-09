import { CardArt } from './CardArt'
import type { PoolCard } from './types'

const WIDTH = 340
const HEIGHT = 480
const GAP = 24

/** Follows the cursor, kept inside the viewport. */
export function CardPreview({ card, x, y }: { card: PoolCard; x: number; y: number }) {
  const spillsRight = x + GAP + WIDTH > window.innerWidth
  const left = spillsRight ? Math.max(8, x - GAP - WIDTH) : x + GAP
  const top = Math.min(Math.max(8, y - HEIGHT / 2), Math.max(8, window.innerHeight - HEIGHT - 8))

  return (
    <div className="card-preview" style={{ left, top, width: WIDTH }}>
      <CardArt card={card} size="preview" />
    </div>
  )
}
