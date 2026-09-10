import {
  CLASS_COMMON_CLASSES,
  CLASS_COMMONS_OPTIONS,
  COMMONS_PER_PACK,
  FOIL_SLOT_RARE_CHANCE,
  GENERIC_CLASSES,
  PACKS_PER_EVENT,
  RARE_OR_HIGHER_ODDS,
  RARITY_LADDER,
} from './packConfig'
import type { PoolCard, Rarity } from './types'

export type Rng = () => number

export const isEquipment = (card: PoolCard) => card.types.includes('Equipment')
export const isHero = (card: PoolCard) => card.types.includes('Hero')
export const isWeapon = (card: PoolCard) => card.types.includes('Weapon')
/** Heroes, weapons and equipment live in the arena, not in the 30-card deck. */
export const countsTowardDeck = (card: PoolCard) =>
  !isEquipment(card) && !isHero(card) && !isWeapon(card)

/**
 * The pool is deck cards only. Everything else arrives with the pre-release kit instead of
 * being opened: the hero (Baalghor is a Rare promo, hence the explicit hero check), its
 * weapon and Arms, and the cold-foil all-heroes equipment — see heroKitFor in heroes.ts.
 * (Tokens are dropped at snapshot time.)
 */
export const isDrawable = (card: PoolCard) =>
  card.rarity !== 'Basic' && !isHero(card) && !isWeapon(card) && !isEquipment(card)

const GENERIC_CLASS_SET = new Set<string>(GENERIC_CLASSES)
/** Generic and NotClassed cards, which every hero can play. Shown as "No class". */
export const isGenericCard = (card: PoolCard) => card.classes.some((c) => GENERIC_CLASS_SET.has(c))

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

/**
 * Draws a card of the rolled rarity, stepping down the ladder when that rarity has no cards
 * in the snapshot. Fabled and Legendary are empty today (the data does not flag them
 * sealed-legal yet) and will start appearing on their own once it does.
 */
const pickOfRarity = (pool: PoolCard[], rarity: Rarity, rng: Rng): PoolCard | null => {
  for (const step of RARITY_LADDER.slice(RARITY_LADDER.indexOf(rarity))) {
    const candidates = pool.filter((c) => c.rarity === step)
    if (candidates.length) return pick(candidates, rng)
  }
  return null
}

const rollRareOrHigher = (rng: Rng): Rarity => {
  const roll = rng()
  let floor = 0
  for (const { rarity, chance } of RARE_OR_HIGHER_ODDS) {
    if (roll < floor + chance) return rarity
    floor += chance
  }
  return 'Rare'
}

/** How many of each class among `count` class commons: as even as possible, remainder at random. */
export const splitClassCommons = (count: number, rng: Rng): Record<string, number> => {
  const classes = [...CLASS_COMMON_CLASSES]
  const base = Math.floor(count / classes.length)
  const split: Record<string, number> = Object.fromEntries(classes.map((c) => [c, base]))
  const extras = count % classes.length
  // Shuffle, then hand the remainder to the first `extras` classes, so each gets at most one.
  for (let i = classes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[classes[i], classes[j]] = [classes[j], classes[i]]
  }
  for (let i = 0; i < extras; i++) split[classes[i]] += 1
  return split
}

/**
 * One booster pack as it matters for deckbuilding: 13 cards.
 *
 * Physical packs hold 16. The basic slot and the expansion slot are set aside as soon as the
 * packs are opened, and the equipment is redundant with the kit's cold-foil set that every
 * player receives, so none of those three are generated.
 */
export const generatePack = (fullPool: PoolCard[], rng: Rng = Math.random): string[] => {
  const pool = fullPool.filter(isDrawable)
  const drawn: PoolCard[] = []

  const rare = pickOfRarity(pool, 'Rare', rng)
  if (rare) drawn.push(rare)

  const rareOrHigher = pickOfRarity(pool, rollRareOrHigher(rng), rng)
  if (rareOrHigher) drawn.push(rareOrHigher)

  // The foil slot: the physical card is foil, but we do not model foiling.
  const foilSlot = pickOfRarity(pool, rng() < FOIL_SLOT_RARE_CHANCE ? 'Rare' : 'Common', rng)
  if (foilSlot) drawn.push(foilSlot)

  const commons = pool.filter((c) => c.rarity === 'Common')
  const classCount = pick(CLASS_COMMONS_OPTIONS, rng)
  const split = splitClassCommons(classCount, rng)
  for (const [className, count] of Object.entries(split)) {
    const candidates = commons.filter((c) => c.classes.includes(className))
    for (let i = 0; i < count && candidates.length; i++) drawn.push(pick(candidates, rng))
  }
  const generics = commons.filter(isGenericCard)
  for (let i = 0; i < COMMONS_PER_PACK - classCount && generics.length; i++) {
    drawn.push(pick(generics, rng))
  }

  return drawn.map((card) => card.id)
}

/**
 * A full sealed pool: the 8 packs, as card ids. Copies of a card have no identity of their
 * own, so the caller tallies them into the event's `pool` counts.
 * Heroes and every piece of gear come with the kit instead of being opened.
 */
export const generateEventPool = (fullPool: PoolCard[], rng: Rng = Math.random): string[] => {
  const pool = fullPool.filter(isDrawable)
  const cards: string[] = []
  for (let i = 0; i < PACKS_PER_EVENT; i++) cards.push(...generatePack(pool, rng))
  return cards
}

/** The opened cards as `cardId -> copies`, which is how an event stores its pool. */
export const tally = (cardIds: string[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const id of cardIds) counts[id] = (counts[id] ?? 0) + 1
  return counts
}
