import { isPlayableBy } from './heroes'
import type { PoolCard } from './types'

/**
 * What the table considers "matching". Today the only filter is the chosen hero, but pitch
 * and rarity filters are on the backlog: everything downstream goes through `matches`, so
 * adding one means widening this type and this function, and nothing else.
 */
export interface Filter {
  heroKey: string | null
}

export const matches = (card: PoolCard, filter: Filter): boolean =>
  isPlayableBy(card, filter.heroKey)

/**
 * Splits cards into the matching ones and the rest, keeping the input order within each side.
 * The pool greys the non-matching ones and sorts them to the end of the row; the deck does not
 * show them at all, and counts them on one tile instead.
 */
export const partition = <T>(
  items: T[],
  cardOf: (item: T) => PoolCard,
  filter: Filter,
): { matching: T[]; others: T[] } => {
  const matching: T[] = []
  const others: T[] = []
  for (const item of items) (matches(cardOf(item), filter) ? matching : others).push(item)
  return { matching, others }
}
