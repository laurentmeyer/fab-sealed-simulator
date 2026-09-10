import { isPlayableBy } from './heroes'
import { DECK_SIZE, RARITY_LADDER } from './packConfig'
import { countsTowardDeck } from './packGenerator'
import type { CardInstance, Grouping, PoolCard } from './types'

/** Every copy of one card, shown as a single stack. */
export interface CardStack {
  card: PoolCard
  instances: CardInstance[]
  /** Comes with the hero rather than the pool, so it cannot be clicked away. */
  fixed?: boolean
}

export interface CardGroup {
  key: string
  /** null when no grouping is active, in which case the pane skips the separator. */
  label: string | null
  stacks: CardStack[]
  count: number
  /** Shown instead of the plain count, e.g. "28 / 30" on the deck section. */
  countLabel?: string
  tone?: 'ok' | 'warn'
  /** Cards the hero cannot play, shown greyed out at the bottom of the pane. */
  dimmed?: boolean
}

export const PITCH_LABELS: Record<number, string> = { 1: 'Red', 2: 'Yellow', 3: 'Blue' }

const CLASS_GROUPS = ['Brute', 'Necromancer', 'Runeblade'] as const

/**
 * Cards without a class split by what makes them playable: talent cards (Shadow here) are
 * only for heroes with the talent, while truly Generic cards are for everyone.
 */
const classGroupOf = (card: PoolCard): string =>
  CLASS_GROUPS.find((name) => card.classes.includes(name)) ?? card.talents?.[0] ?? 'Generic'

const groupKeyOf = (card: PoolCard, dimension: Grouping): string => {
  if (dimension === 'rarity') return card.rarity
  if (dimension === 'class') return classGroupOf(card)
  return card.pitch === null ? 'none' : String(card.pitch)
}

const ORDER: Record<Grouping, string[]> = {
  rarity: RARITY_LADDER,
  class: [...CLASS_GROUPS, 'Shadow', 'Generic'],
  pitch: ['1', '2', '3', 'none'],
}

const LABELS: Record<Grouping, (key: string) => string> = {
  rarity: (key) => key,
  class: (key) => key,
  pitch: (key) => (key === 'none' ? 'No pitch' : PITCH_LABELS[Number(key)]),
}

/** Sorts by pitch (cards without one last), then name. */
const compare = (a: PoolCard, b: PoolCard) =>
  (a.pitch ?? Number.MAX_SAFE_INTEGER) - (b.pitch ?? Number.MAX_SAFE_INTEGER) ||
  a.name.localeCompare(b.name)

/** The hero and its signature weapon are shown in the arena without being pool cards. */
export const fixedStack = (card: PoolCard): CardStack => ({
  card,
  instances: [{ instanceId: `fixed:${card.id}`, cardId: card.id, selected: true }],
  fixed: true,
})

export const toStacks = (instances: CardInstance[], byId: Map<string, PoolCard>): CardStack[] => {
  const stacks = new Map<string, CardStack>()
  for (const instance of instances) {
    const card = byId.get(instance.cardId)
    if (!card) continue
    const stack = stacks.get(instance.cardId)
    if (stack) stack.instances.push(instance)
    else stacks.set(instance.cardId, { card, instances: [instance] })
  }
  return [...stacks.values()].sort((a, b) => compare(a.card, b.card))
}

/**
 * Splits cards into ordered, non-empty groups along one dimension.
 * Passing null gives a single unlabelled group, which is how the deck side is shown.
 */
export const groupCards = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  dimension: Grouping | null,
): CardGroup[] => {
  const buckets = new Map<string, CardInstance[]>()
  for (const instance of instances) {
    const card = byId.get(instance.cardId)
    if (!card) continue
    const key = dimension ? groupKeyOf(card, dimension) : ''
    const bucket = buckets.get(key)
    if (bucket) bucket.push(instance)
    else buckets.set(key, [instance])
  }

  const known = dimension ? ORDER[dimension].filter((key) => buckets.has(key)) : ['']
  // A talent ORDER does not know about yet (a future set's) still deserves a group.
  const keys = dimension
    ? [...known, ...[...buckets.keys()].filter((key) => !ORDER[dimension].includes(key)).sort()]
    : known

  return keys.map((key) => ({
    key,
    label: dimension ? LABELS[dimension](key) : null,
    stacks: toStacks(buckets.get(key)!, byId),
    count: buckets.get(key)!.length,
  }))
}

/**
 * Splits cards into those the chosen hero may play and those it may not. Nothing is hidden:
 * the rest is shown greyed out. A null hero means no hero picked yet, so nothing is off-hero.
 */
export const partitionByHero = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  heroKey: string | null,
): { playable: CardInstance[]; unplayable: CardInstance[] } => {
  if (!heroKey) return { playable: instances, unplayable: [] }

  const playable: CardInstance[] = []
  const unplayable: CardInstance[] = []
  for (const instance of instances) {
    const card = byId.get(instance.cardId)
    if (!card) continue
    ;(isPlayableBy(card, heroKey) ? playable : unplayable).push(instance)
  }
  return { playable, unplayable }
}

/** The trailing group of cards the hero cannot play, or nothing when they all match. */
export const unplayableGroup = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  heroName: string,
): CardGroup[] =>
  instances.length
    ? [
        {
          key: 'unplayable',
          label: `${heroName} cannot play these`,
          stacks: toStacks(instances, byId),
          count: instances.length,
          dimmed: true,
        },
      ]
    : []

/** A selected card only makes the deck if the hero can actually play it. */
const inDeck = (
  instance: CardInstance,
  byId: Map<string, PoolCard>,
  heroKey: string | null,
): PoolCard | null => {
  if (!instance.selected) return null
  const card = byId.get(instance.cardId)
  if (!card || !countsTowardDeck(card) || !isPlayableBy(card, heroKey)) return null
  return card
}

/** Red / yellow / blue counts of the deck, for the pitch bar. */
export const pitchSplit = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  heroKey: string | null,
): { pitch: number; count: number }[] => {
  const counts = [1, 2, 3].map((pitch) => ({ pitch, count: 0 }))
  for (const instance of instances) {
    const card = inDeck(instance, byId, heroKey)
    if (!card || card.pitch === null) continue
    const entry = counts.find((c) => c.pitch === card.pitch)
    if (entry) entry.count++
  }
  return counts
}

export const deckCount = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  heroKey: string | null,
): number => instances.filter((i) => inDeck(i, byId, heroKey)).length

/**
 * Everything standing between this pool and a legal deck, in plain words.
 * 30 cards is a minimum, not a maximum: extra cards are a sideboard to swap from between games.
 */
export const deckIssues = (
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  hero: PoolCard | null,
): string[] => {
  const issues: string[] = []
  if (!hero) issues.push('No hero chosen')

  const heroKey = hero?.hero ?? null
  const count = deckCount(instances, byId, heroKey)
  if (count < DECK_SIZE) {
    issues.push(`Deck has ${count} cards, ${DECK_SIZE} is the minimum`)
  }

  if (hero) {
    const unplayable = instances.filter((i) => {
      const card = byId.get(i.cardId)
      return i.selected && card && !isPlayableBy(card, heroKey)
    }).length
    if (unplayable) {
      issues.push(`${unplayable} selected card${unplayable > 1 ? 's' : ''} ${hero.name} cannot play`)
    }
  }

  return issues
}
