import { isHero, isWeapon } from './packGenerator'
import type { PoolCard } from './types'

/** The young heroes you can bring to a sealed event. */
export const youngHeroes = (cards: PoolCard[]): PoolCard[] =>
  cards.filter((c) => isHero(c) && c.young && c.hero)

/**
 * What a hero brings with it. Every Basic card in the set is part of a hero's pre-release kit
 * rather than pack content, and each young hero has exactly one of each: its weapon and its
 * class Arms equipment. Packs only ever supply the generic Head, Chest and Legs equipment.
 */
export const heroKitFor = (hero: PoolCard, cards: PoolCard[]): PoolCard[] =>
  cards.filter(
    (c) =>
      c.rarity === 'Basic' &&
      c.id !== hero.id &&
      Boolean(hero.hero) &&
      c.legalHeroes.includes(hero.hero!),
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
