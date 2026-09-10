import { RARITY_LADDER } from './packConfig'
import type { PoolCard, SortMode } from './types'

/** Best rarity first, the way a player fans out what they opened. */
const rarityRank = (card: PoolCard) => RARITY_LADDER.indexOf(card.rarity)

/** Cards without a pitch (weapons, equipment) sort last. */
const pitchRank = (card: PoolCard) => card.pitch ?? Number.MAX_SAFE_INTEGER

/**
 * One order for the pool row and for the inside of every column. Each mode falls through to
 * the others, so the order is total and a card never jumps around between renders.
 */
export const compareBy = (sort: SortMode) => (a: PoolCard, b: PoolCard): number => {
  const byName = a.name.localeCompare(b.name)
  const byPitch = pitchRank(a) - pitchRank(b)
  const byRarity = rarityRank(a) - rarityRank(b)
  if (sort === 'name') return byName || byPitch
  if (sort === 'pitch') return byPitch || byRarity || byName
  return byRarity || byPitch || byName
}

export const SORT_MODES: { value: SortMode; label: string }[] = [
  { value: 'rarity', label: 'Rarity' },
  { value: 'name', label: 'Name' },
  { value: 'pitch', label: 'Pitch' },
]
