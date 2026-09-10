import { HeroPortrait } from './HeroPortrait'
import { heroKitFor, isPromoHero } from './heroes'
import type { PoolCard } from './types'

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
        const kit = heroKitFor(hero, cards)
        const active = hero.id === selectedId
        const promo = isPromoHero(hero)
        return (
          <button
            type="button"
            key={hero.id}
            className={['hero', active && 'active', promo && 'promo'].filter(Boolean).join(' ')}
            aria-pressed={active}
            title={
              active
                ? `${hero.name} — click to unpick`
                : promo
                  ? `Play ${hero.name} — the kit's lucky rainbow-foil promo, no weapon of his own`
                  : `Play ${hero.name} with ${kit.map((c) => c.name).join(', ')}`
            }
            onClick={() => onSelect(active ? null : hero.id)}
          >
            <HeroPortrait hero={hero} />
            {promo && (
              <span className="hero-promo-badge" aria-hidden>
                ★
              </span>
            )}
          </button>
        )
      })}
    </span>
  )
}
