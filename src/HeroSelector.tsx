import { useState } from 'react'
import { heroImageUrl, signatureWeaponFor } from './heroes'
import type { PoolCard } from './types'

function HeroPortrait({ hero }: { hero: PoolCard }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="hero-initials">{hero.name.slice(0, 2)}</span>
  return (
    <img
      src={heroImageUrl(hero)}
      alt={hero.name}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

/**
 * Picking a hero is part of building the deck: it brings the signature weapon and decides
 * which cards are legal. One at a time, and clicking the chosen one puts it back.
 */
export function HeroSelector({
  heroes,
  cards,
  selectedId,
  onSelect,
}: {
  heroes: PoolCard[]
  cards: PoolCard[]
  selectedId: string | null
  onSelect: (heroId: string | null) => void
}) {
  return (
    <span className="hero-selector" role="group" aria-label="Hero">
      {heroes.map((hero) => {
        const weapon = signatureWeaponFor(hero, cards)
        const active = hero.id === selectedId
        return (
          <button
            type="button"
            key={hero.id}
            className={active ? 'hero active' : 'hero'}
            aria-pressed={active}
            title={
              active
                ? `${hero.name} — click to unpick`
                : `Play ${hero.name}${weapon ? ` with ${weapon.name}` : ''}`
            }
            onClick={() => onSelect(active ? null : hero.id)}
          >
            <HeroPortrait hero={hero} />
          </button>
        )
      })}
    </span>
  )
}
