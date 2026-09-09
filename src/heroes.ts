import { isHero, isWeapon } from './packGenerator'
import type { PoolCard } from './types'

/** The young heroes you can bring to a sealed event. */
export const youngHeroes = (cards: PoolCard[]): PoolCard[] =>
  cards.filter((c) => isHero(c) && c.young && c.hero)

/** Each young hero of the set has exactly one weapon legal for it; it comes with the hero. */
export const signatureWeaponFor = (hero: PoolCard, cards: PoolCard[]): PoolCard | null =>
  cards.find((c) => isWeapon(c) && hero.hero !== null && c.legalHeroes.includes(hero.hero!)) ?? null

/** Fabrary hosts hero portraits under the card identifier. */
export const heroImageUrl = (hero: PoolCard): string =>
  `https://content.fabrary.net/heroes/${hero.id}.webp`

/** With no hero picked yet, nothing is off-hero: everything still shows normally. */
export const isPlayableBy = (card: PoolCard, heroKey: string | null): boolean =>
  !heroKey || card.legalHeroes.includes(heroKey)
