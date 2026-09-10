import { useState } from 'react'
import { heroImageUrl } from './heroes'
import type { PoolCard } from './types'

/**
 * A hero's face, or its first two letters when Fabrary has no portrait for it yet. Used by the
 * hero selector and by the event list, which sizes it with CSS.
 */
export function HeroPortrait({ hero }: { hero: PoolCard }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="hero-initials">{hero.name.slice(0, 2)}</span>
  return (
    <img src={heroImageUrl(hero)} alt={hero.name} draggable={false} onError={() => setFailed(true)} />
  )
}
