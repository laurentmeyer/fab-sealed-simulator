import {
  BASIC_EQUIPMENT_WEIGHT,
  CLASS_COMMON_CLASSES,
  CLASS_COMMONS_OPTIONS,
  COMMONS_PER_PACK,
  FOIL_SLOT_RARE_CHANCE,
  GENERIC_CLASSES,
  PACKS_PER_EVENT,
  RARE_OR_HIGHER_ODDS,
  RARITY_LADDER,
} from './packConfig'
import type { CardInstance, PoolCard, Rarity } from './types'

export type Rng = () => number

export const isEquipment = (card: PoolCard) => card.types.includes('Equipment')
export const isHero = (card: PoolCard) => card.types.includes('Hero')
export const isWeapon = (card: PoolCard) => card.types.includes('Weapon')
/**
 * Equipment lives in the arena, not in the 30-card deck. (Heroes and weapons never reach the
 * pool at all — they come with the hero you pick — and tokens are dropped at snapshot time.)
 */
export const countsTowardDeck = (card: PoolCard) => !isEquipment(card) && card.rarity !== 'Basic'

/**
 * Heroes and their signature weapons are chosen with the hero selector rather than opened,
 * so they are not part of anyone's card pool.
 */
export const isDrawable = (card: PoolCard) => !isHero(card) && !isWeapon(card)

/** Basic cards are singletons: one of each is handed to the player, packs never add more. */
export const isSingleton = (card: PoolCard) => card.rarity === 'Basic'

const GENERIC_CLASS_SET = new Set<string>(GENERIC_CLASSES)
/** Generic and NotClassed cards, which every hero can play. Shown as "No class". */
export const isGenericCard = (card: PoolCard) => card.classes.some((c) => GENERIC_CLASS_SET.has(c))

const newInstanceId = (): string =>
  // randomUUID needs a secure context; self-hosting over plain http would otherwise break.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

const instanceOf = (card: PoolCard): CardInstance => ({
  instanceId: newInstanceId(),
  cardId: card.id,
  selected: false,
})

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

const pickWeighted = <T,>(items: readonly T[], weight: (item: T) => number, rng: Rng): T => {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let roll = rng() * total
  for (const item of items) {
    roll -= weight(item)
    if (roll < 0) return item
  }
  return items[items.length - 1]
}

/**
 * Draws a card of the rolled rarity, stepping down the ladder when that rarity has no cards
 * in the snapshot. Fabled and Legendary are empty today (the data does not flag them
 * sealed-legal yet) and will start appearing on their own once it does.
 */
const pickOfRarity = (pool: PoolCard[], rarity: Rarity, rng: Rng): PoolCard | null => {
  for (const step of RARITY_LADDER.slice(RARITY_LADDER.indexOf(rarity))) {
    const candidates = pool.filter((c) => c.rarity === step && !isEquipment(c) && !isSingleton(c))
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
 * One booster pack as it matters for sealed: 14 cards.
 *
 * Physical packs hold 16, but two bonus cards (other classes, or collectibles not played in
 * limited) are always set aside when the packs are opened, so we never generate them.
 */
export const generatePack = (fullPool: PoolCard[], rng: Rng = Math.random): CardInstance[] => {
  const pool = fullPool.filter(isDrawable)
  const drawn: PoolCard[] = []

  const equipment = pool.filter(isEquipment)
  if (equipment.length) {
    drawn.push(pickWeighted(equipment, (c) => (c.rarity === 'Basic' ? BASIC_EQUIPMENT_WEIGHT : 1), rng))
  }

  const rare = pickOfRarity(pool, 'Rare', rng)
  if (rare) drawn.push(rare)

  const rareOrHigher = pickOfRarity(pool, rollRareOrHigher(rng), rng)
  if (rareOrHigher) drawn.push(rareOrHigher)

  // The foil slot: the physical card is foil, but we do not model foiling.
  const foilSlot = pickOfRarity(pool, rng() < FOIL_SLOT_RARE_CHANCE ? 'Rare' : 'Common', rng)
  if (foilSlot) drawn.push(foilSlot)

  const commons = pool.filter((c) => c.rarity === 'Common' && !isEquipment(c))
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

  return drawn.map(instanceOf)
}

/**
 * A full sealed pool: 8 packs, plus one copy of every Basic card left once heroes and weapons
 * are set aside — the class equipment. A Basic drawn from a pack merges into its singleton, so
 * the pool holds slightly fewer than 8 x 14 cards.
 */
export const generateEventPool = (fullPool: PoolCard[], rng: Rng = Math.random): CardInstance[] => {
  const pool = fullPool.filter(isDrawable)
  const byId = new Map(pool.map((c) => [c.id, c]))

  const fromPacks: CardInstance[] = []
  const equipmentSeen = new Set<string>()
  for (let i = 0; i < PACKS_PER_EVENT; i++) {
    for (const instance of generatePack(pool, rng)) {
      const card = byId.get(instance.cardId)
      if (!card || isSingleton(card)) continue // Basics are handed out below instead
      // You can only ever wear one of a given equipment, so a second copy is dead weight.
      if (isEquipment(card)) {
        if (equipmentSeen.has(card.id)) continue
        equipmentSeen.add(card.id)
      }
      fromPacks.push(instance)
    }
  }

  const singletons = pool.filter(isSingleton).map(instanceOf)
  return [...fromPacks, ...singletons]
}
