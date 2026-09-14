import { GENERIC_CLASSES } from './packConfig'
import type { PoolCard } from './types'

/**
 * What a card belongs to. A card carries a class (Brute, Necromancer, Runeblade), a talent
 * (Shadow, the only one in this set), both, or neither — and "neither" is what Generic means.
 *
 * Read from the card rather than from a list of this set's classes and talents, so the next
 * set needs no edit here.
 */

const GENERIC = new Set<string>(GENERIC_CLASSES)

/** The card's class, or null when it has none. Generic is the absence of a class, not one. */
export const classOf = (card: PoolCard): string | null =>
  card.classes.find((c) => !GENERIC.has(c)) ?? null

/** The card's talent — Shadow, here — or null. */
export const talentOf = (card: PoolCard): string | null => card.talents[0] ?? null

/**
 * The four kinds of card, in the order a player thinks about them: what your class can play
 * with the set's talent behind it, the rest of your class, the talent cards any hero of that
 * talent shares, and finally the cards anyone in the game can play.
 */
export type CardBand = 'class+talent' | 'class' | 'talent' | 'generic'

export const bandOf = (card: PoolCard): CardBand => {
  if (classOf(card)) return talentOf(card) ? 'class+talent' : 'class'
  return talentOf(card) ? 'talent' : 'generic'
}

const BAND_RANK: Record<CardBand, number> = {
  'class+talent': 0,
  class: 0,
  talent: 1,
  generic: 2,
}

/**
 * Classed cards first, grouped by class and talent-first within each; then the talent cards
 * with no class; then Generic. Classes fall in alphabetical order, which only shows when no
 * hero is chosen — pick one and every other class is off-hero anyway.
 */
export const compareBands = (a: PoolCard, b: PoolCard): number => {
  const byBand = BAND_RANK[bandOf(a)] - BAND_RANK[bandOf(b)]
  if (byBand) return byBand

  const [classA, classB] = [classOf(a), classOf(b)]
  if (!classA || !classB) return 0

  return (
    classA.localeCompare(classB) || Number(Boolean(talentOf(b))) - Number(Boolean(talentOf(a)))
  )
}

/**
 * The set's own talent word — "Shadow" here — read from the data rather than hardcoded, so a
 * future set with a different (or no) talent needs no edit here.
 */
export const talentName = (cards: PoolCard[]): string | null => {
  for (const card of cards) {
    const talent = talentOf(card)
    if (talent) return talent
  }
  return null
}

/**
 * How a band reads as a filter pill. The band is the logic — a card either has a class, the
 * talent, both or neither — and never changes when the hero does; only this label does. With
 * no hero picked, `heroClass` is null and the class-ish bands read generically ("Shadow Class",
 * "Class") rather than naming one: the four bands stay distinct — a class card with the talent
 * is still a different pill from one without — just not broken down by *which* class.
 */
export const filterLabel = (
  band: CardBand,
  heroClass: string | null,
  talent: string | null,
): string => {
  switch (band) {
    case 'class+talent':
      return heroClass ? `${talent ?? 'Shadow'} ${heroClass}` : `${talent ?? 'Shadow'} and Class`
    case 'class':
      return heroClass ?? 'Class'
    case 'talent':
      return talent ?? 'Shadow'
    case 'generic':
      return 'Generic'
  }
}
