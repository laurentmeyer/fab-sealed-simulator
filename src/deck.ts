import { matches, type Filter } from './filters'
import { DECK_SIZE } from './packConfig'
import { countsTowardDeck } from './packGenerator'
import type { CardCount, PoolCard } from './types'

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
 * How much of the pool the chosen hero can actually play, counting every copy opened whether
 * it is in the deck or not: the size of the card pool you are really building from.
 */
export const legalPoolCount = (
  pool: Record<string, number>,
  byId: Map<string, PoolCard>,
  filter: Filter,
): number =>
  Object.entries(pool).reduce((sum, [cardId, copies]) => {
    const card = byId.get(cardId)
    return card && matches(card, filter) ? sum + copies : sum
  }, 0)

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
