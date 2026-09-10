import { isEquipment, isHero, isWeapon } from './packGenerator'
import type { PoolCard } from './types'

/**
 * The young heroes you can bring to a sealed event. The class heroes come first; the promo
 * hero (Baalghor, the kit's lucky rainbow foil) closes the row.
 */
export const youngHeroes = (cards: PoolCard[]): PoolCard[] =>
  cards
    .filter((c) => isHero(c) && c.young && c.hero)
    .sort((a, b) => Number(isPromoHero(a)) - Number(isPromoHero(b)) || a.name.localeCompare(b.name))

/** The class heroes are Basic cards from the kit; Baalghor is a Rare rainbow-foil promo. */
export const isPromoHero = (hero: PoolCard): boolean => hero.rarity !== 'Basic'

/**
 * The cold-foil equipment the pre-release kit guarantees — Grille (Head), Robe (Chest) and
 * Path (Legs). They are this set's own equipment, which is what the talent marks: equipment
 * with no talent at all (Dark Arcanite Boots) is a generic piece playable in any deck in the
 * game, and comes out of a pack rather than the kit.
 */
const isKitEquipment = (card: PoolCard): boolean =>
  isEquipment(card) && card.talents.length > 0

/**
 * What a hero brings with it, none of it opened from packs: its weapon and class Arms (the
 * kit's double-sided basics) plus the cold-foil pieces above. Baalghor has no weapon or Arms
 * of his own, so his kit is just those three.
 */
export const heroKitFor = (hero: PoolCard, cards: PoolCard[]): PoolCard[] =>
  cards
    .filter(
      (c) =>
        (c.rarity === 'Basic' || isKitEquipment(c)) &&
        c.id !== hero.id &&
        Boolean(hero.hero) &&
        c.legalHeroes.includes(hero.hero!),
    )
    .sort(
      (a, b) =>
        Number(isWeapon(b)) - Number(isWeapon(a)) || // weapon first
        Number(b.rarity === 'Basic') - Number(a.rarity === 'Basic') || // then the class Arms
        a.name.localeCompare(b.name),
    )

/** The hero's weapon, the one Basic weapon legal for it. */
export const signatureWeaponFor = (hero: PoolCard, cards: PoolCard[]): PoolCard | null =>
  heroKitFor(hero, cards).find(isWeapon) ?? null

/** Fabrary hosts hero portraits under the card identifier. */
export const heroImageUrl = (hero: PoolCard): string =>
  `https://content.fabrary.net/heroes/${hero.id}.webp`

/** With no hero picked yet, nothing is off-hero: everything still shows normally. */
export const isPlayableBy = (card: PoolCard, heroKey: string | null): boolean =>
  !heroKey || card.legalHeroes.includes(heroKey)
