import { HeroPortrait } from './HeroPortrait'
import { isPromoHero, signatureWeaponFor } from './heroes'
import type { PoolCard } from './types'

/** "Viserai, Between Worlds" -> "Viserai". The pill has no room for a hero's full title. */
const firstName = (name: string): string => name.split(',')[0]

/**
 * Picking a hero is a filter pill like the others in the toolbar, with one difference: it is
 * exclusive (one hero or none) and it decides legality — the kit, the weapon, the export, the
 * 30-count — rather than merely narrowing the pool row. Clicking another hero swaps the
 * selection; clicking the active one puts it back, the same click-to-clear every pill uses.
 */
export function HeroSelector({
  heroes,
  cards,
  counts,
  selectedId,
  onSelect,
}: {
  heroes: PoolCard[]
  cards: PoolCard[]
  /** How much pool would be legal for each hero, under the current type/pitch filters. */
  counts: Map<string, number>
  selectedId: string | null
  onSelect: (heroId: string | null) => void
}) {
  return (
    <span className="filter-block hero-selector" role="group" aria-label="Hero">
      {heroes.map((hero) => {
        const weapon = signatureWeaponFor(hero, cards)
        const active = hero.id === selectedId
        const promo = isPromoHero(hero)
        return (
          <button
            type="button"
            key={hero.id}
            className={['pill', 'hero-pill', active && 'active', promo && 'promo']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={active}
            title={
              active
                ? `${hero.name} — click to unpick`
                : promo
                  ? `Play ${hero.name} — the kit's lucky rainbow-foil promo, no weapon of his own`
                  : `Play ${hero.name} with ${weapon?.name ?? 'no weapon'}`
            }
            onClick={() => onSelect(active ? null : hero.id)}
          >
            <span className="hero-pill-portrait">
              <HeroPortrait hero={hero} />
              {promo && (
                <span className="hero-promo-badge" aria-hidden>
                  ★
                </span>
              )}
            </span>
            <span className="pill-label">{firstName(hero.name)}</span>
            <span className="pill-count">{counts.get(hero.id) ?? 0}</span>
          </button>
        )
      })}
    </span>
  )
}
