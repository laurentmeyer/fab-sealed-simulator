import {
  CLASS_COMMON_CLASSES,
  CLASS_COMMONS_OPTIONS,
  COMMONS_PER_PACK,
  EQUIPMENT_PER_PACK,
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
 * What the card slots of a pack draw from: this set's deck cards. Equipment has a slot of its
 * own (see drawEquipment); heroes and weapons are never opened, they come with the kit.
 * Basic rarity is kit material too. (Tokens are dropped at snapshot time.)
 */
export const isDrawable = (card: PoolCard) =>
  card.rarity !== 'Basic' && !isHero(card) && !isWeapon(card) && !isEquipment(card)

const GENERIC_CLASS_SET = new Set<string>(GENERIC_CLASSES)
/** Generic and NotClassed cards, which every hero can play. Shown as "No class". */
export const isGenericCard = (card: PoolCard) => card.classes.some((c) => GENERIC_CLASS_SET.has(c))

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

/**
 * Draws a card of the rolled rarity, stepping down the ladder when that rarity has no cards
 * in the snapshot — which keeps a pack whole if a rarity is empty in the data.
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

/**
 * The equipment slot: one piece from the set, every piece equally likely.
 *
 * The uniform draw *is* the rarity model while every equipment in the set is Basic or Common
 * and Basic is assumed as likely as Common — which held through the full reveal. Should a
 * correction ever introduce a Rare or Majestic piece, this needs real odds; `equipmentRarities`
 * below is what a test watches to force that.
 */
export const drawEquipment = (fullPool: PoolCard[], rng: Rng): PoolCard | null => {
  const equipment = fullPool.filter(isEquipment)
  return equipment.length ? pick(equipment, rng) : null
}

/** The rarities the equipment slot is currently drawing across. */
export const equipmentRarities = (fullPool: PoolCard[]): Set<Rarity> =>
  new Set(fullPool.filter(isEquipment).map((c) => c.rarity))

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
 * One booster pack as it matters for deckbuilding: 14 cards.
 *
 * Physical packs hold 16. The basic slot and the expansion slot are set aside as soon as the
 * packs are opened, so neither is generated; everything else is.
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

  for (let i = 0; i < EQUIPMENT_PER_PACK; i++) {
    const equipment = drawEquipment(fullPool, rng)
    if (equipment) drawn.push(equipment)
  }

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
 *
 * Equipment is clamped to one copy each. You can only wear one piece per slot, so a second is
 * worth nothing — and showing it as "x2" would suggest otherwise.
 */
export const generateEventPool = (fullPool: PoolCard[], rng: Rng = Math.random): string[] => {
  const byId = new Map(fullPool.map((c) => [c.id, c]))
  const cards: string[] = []
  const equipmentSeen = new Set<string>()

  for (let i = 0; i < PACKS_PER_EVENT; i++) {
    for (const id of generatePack(fullPool, rng)) {
      if (isEquipment(byId.get(id)!)) {
        if (equipmentSeen.has(id)) continue
        equipmentSeen.add(id)
      }
      cards.push(id)
    }
  }
  return cards
}

/** The opened cards as `cardId -> copies`, which is how an event stores its pool. */
export const tally = (cardIds: string[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const id of cardIds) counts[id] = (counts[id] ?? 0) + 1
  return counts
}
