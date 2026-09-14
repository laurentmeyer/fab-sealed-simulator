import { filterLabel, type CardBand } from './cardTraits'
import { matches, type Filter } from './filters'
import { kitEquipment } from './heroes'
import { DECK_SIZE } from './packConfig'
import { countsTowardDeck } from './packGenerator'
import type { CardCount, PoolCard } from './types'
import { bandOf } from './cardTraits'
import { PITCH_BUCKETS, matchesView, pitchBucketOf, type PitchBucket, type ViewFilter } from './viewFilter'

/**
 * The pool you actually build from: what the eight packs gave you, plus the equipment the
 * pre-release kit guarantees. The kit half is derived rather than stored, so events saved
 * before equipment was selectable gain it without a migration.
 */
export const openedPool = (
  pool: Record<string, number>,
  cards: PoolCard[],
): Record<string, number> => {
  const merged = { ...pool }
  // One of each: a second copy of a piece you already own is worth nothing.
  for (const card of kitEquipment(cards)) merged[card.id] = 1
  return merged
}

export const PITCH_LABELS: Record<number, string> = { 1: 'Red', 2: 'Yellow', 3: 'Blue' }

/** Turns selected entries into the cards they name, dropping anything not in the data. */
const cardsOf = (entries: CardCount[], byId: Map<string, PoolCard>): { card: PoolCard; count: number }[] =>
  entries
    .map(({ cardId, count }) => ({ card: byId.get(cardId), count }))
    .filter((e): e is { card: PoolCard; count: number } => Boolean(e.card))

/** A selected card only makes the deck if the hero can actually play it. */
const inDeck = (entries: CardCount[], byId: Map<string, PoolCard>, filter: Filter) =>
  cardsOf(entries, byId).filter(({ card }) => countsTowardDeck(card) && matches(card, filter))

/**
 * The toolbar's filter pills, faceted: each pill's count is "how many cards would match if
 * this pill alone were toggled on", given whatever the *other* blocks are currently narrowed
 * to. A block's own selection never affects its own pills' counts — only the pills of the
 * other blocks — which is what lets you compare "how many more reds vs yellows" honestly.
 *
 * The hero is a filter like the others for this purpose (it decides which pool cards are even
 * in play), but never for legality: deckCount, deckIssues and export all take their own Filter
 * and never see a ViewFilter. Picking a type or a pitch narrows what you are looking at, never
 * what a deck is allowed to hold.
 */
export interface PoolBand {
  /** One `CardBand`, or two toggled together as the merged "Class" pill with no hero picked. */
  key: CardBand[]
  label: string
  count: number
}

export interface PitchFacet {
  bucket: PitchBucket
  label: string
  count: number
}

/** Every pool entry the hero may legally play, expanded to one row per card. */
const legalEntries = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  heroFilter: Filter,
): { card: PoolCard; count: number }[] =>
  Object.entries(pool)
    .map(([cardId, count]) => ({ card: byId.get(cardId), count }))
    .filter(
      (e): e is { card: PoolCard; count: number } => Boolean(e.card) && matches(e.card!, heroFilter),
    )

/** What "N total" reads: hero-legal cards that also satisfy the current type and pitch filters. */
export const poolTotal = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  heroFilter: Filter,
  view: ViewFilter,
): number =>
  legalEntries(pool, byId, heroFilter)
    .filter((e) => matchesView(e.card, view))
    .reduce((sum, e) => sum + e.count, 0)

/** The four bands, in the order a player thinks about them — see cardTraits.ts. */
const ALL_BANDS: CardBand[] = ['class+talent', 'class', 'talent', 'generic']

/**
 * The type block's pills: always the same four bands — a card either has a class, the talent,
 * both or neither — whether or not a hero is picked. Only the *label* changes with the hero:
 * with one picked, the class-ish bands name it ("Shadow Necromancer", "Necromancer"); with
 * none, they read generically ("Shadow Class", "Class"). Classed cards are never broken down
 * by *which* class, hero or not — that would need a hero to be meaningful to act on.
 *
 * Which pills exist is decided by hero legality alone, so the block does not lose or gain
 * pills as the pitch filter changes — only their counts move, which respect the pitch filter
 * but not the type block's own selection.
 */
export const poolBandFacets = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  heroFilter: Filter,
  view: ViewFilter,
  heroClass: string | null,
  talent: string | null,
): PoolBand[] => {
  const legal = legalEntries(pool, byId, heroFilter)
  const withPitch = legal.filter(
    (e) => view.pitches.size === 0 || view.pitches.has(pitchBucketOf(e.card)),
  )
  const countOf = (band: CardBand) =>
    withPitch.filter((e) => bandOf(e.card) === band).reduce((sum, e) => sum + e.count, 0)
  const existsAny = (band: CardBand) => legal.some((e) => bandOf(e.card) === band)

  return ALL_BANDS.filter(existsAny).map((band) => ({
    key: [band],
    label: filterLabel(band, heroClass, talent),
    count: countOf(band),
  }))
}

/**
 * The pitch block's pills: always the same four — No pitch, Red, Yellow, Blue — so the block
 * never reshuffles as you filter. Counts respect the type filter but not the pitch block's own
 * selection, mirroring poolBandFacets.
 */
export const poolPitchFacets = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  heroFilter: Filter,
  view: ViewFilter,
): PitchFacet[] => {
  const legal = legalEntries(pool, byId, heroFilter)
  const withBand = legal.filter((e) => view.bands.size === 0 || view.bands.has(bandOf(e.card)))

  return PITCH_BUCKETS.map(({ bucket, label }) => ({
    bucket,
    label,
    count: withBand
      .filter((e) => pitchBucketOf(e.card) === bucket)
      .reduce((sum, e) => sum + e.count, 0),
  }))
}

/**
 * The hero block's pills: for each hero you could pick, how much pool would be legal for them
 * under the current type and pitch filters — the same total `poolTotal` would report if that
 * hero were the one selected. Lets you compare heroes before committing to one.
 */
export const heroPoolCounts = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  heroes: PoolCard[],
  view: ViewFilter,
): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const hero of heroes) {
    counts.set(hero.id, poolTotal(pool, byId, { heroKey: hero.hero ?? null }, view))
  }
  return counts
}

export const deckCount = (
  entries: CardCount[],
  byId: Map<string, PoolCard>,
  filter: Filter,
): number => inDeck(entries, byId, filter).reduce((sum, { count }) => sum + count, 0)

/** Red / yellow / blue counts of the deck, for the pitch bar. */
export const pitchSplit = (
  entries: CardCount[],
  byId: Map<string, PoolCard>,
  filter: Filter,
): { pitch: number; count: number }[] => {
  const counts = [1, 2, 3].map((pitch) => ({ pitch, count: 0 }))
  for (const { card, count } of inDeck(entries, byId, filter)) {
    const entry = counts.find((c) => c.pitch === card.pitch)
    if (entry) entry.count += count
  }
  return counts
}

/**
 * Everything standing between this pool and a legal deck, in plain words.
 * 30 cards is a minimum, not a maximum: extra cards are a sideboard to swap from between games.
 */
export const deckIssues = (
  entries: CardCount[],
  byId: Map<string, PoolCard>,
  hero: PoolCard | null,
): string[] => {
  const issues: string[] = []
  if (!hero) issues.push('No hero chosen')

  const filter: Filter = { heroKey: hero?.hero ?? null }
  const count = deckCount(entries, byId, filter)
  if (count < DECK_SIZE) {
    issues.push(`Deck has ${count} cards, ${DECK_SIZE} is the minimum`)
  }

  if (hero) {
    const unplayable = cardsOf(entries, byId)
      .filter(({ card }) => !matches(card, filter))
      .reduce((sum, { count }) => sum + count, 0)
    if (unplayable) {
      issues.push(`${unplayable} selected card${unplayable > 1 ? 's' : ''} ${hero.name} cannot play`)
    }
  }

  return issues
}
