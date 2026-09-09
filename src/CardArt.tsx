import { useEffect, useState } from 'react'
import { cardImageUrl } from './cardImage'
import type { PoolCard } from './types'

const PITCH_CLASS: Record<number, string> = { 1: 'pitch-red', 2: 'pitch-yellow', 3: 'pitch-blue' }

/**
 * The card art, or a readable text card when the art is missing — which is the common case
 * until the set is fully revealed.
 */
export function CardArt({ card, size }: { card: PoolCard; size: 'tile' | 'preview' }) {
  const url = cardImageUrl(card.image)
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [url])

  if (url && !failed) {
    return (
      <img
        className={`card-art card-art-${size}`}
        src={url}
        alt={card.name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`card-fallback card-art-${size} ${card.pitch ? PITCH_CLASS[card.pitch] : 'pitch-none'}`}>
      <div className="card-fallback-head">
        <span className="card-fallback-name">{card.name}</span>
        {card.cost !== null && <span className="card-fallback-cost">{card.cost}</span>}
      </div>
      <div className="card-fallback-type">{card.typeText}</div>
      <div className="card-fallback-stats">
        {card.power !== null && <span title="Power">{card.power} power</span>}
        {card.defense !== null && <span title="Defense">{card.defense} def</span>}
      </div>
    </div>
  )
}
