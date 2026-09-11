import { isEquipment } from './packGenerator'
import { RARITY_LADDER } from './packConfig'
import type { PoolCard, SortMode } from './types'

/**
 * Best rarity first, the way a player fans out what they opened — with Basic counted as
 * Common. Basic is a printing detail of the pre-release kit rather than a measure of how rare
 * a card is, so sorting the class Arms behind every Common would say something untrue about
 * them. It also matches the pack odds, which assume the same thing.
 */
const rarityRank = (card: PoolCard) =>
  RARITY_LADDER.indexOf(card.rarity === 'Basic' ? 'Common' : card.rarity)

/**
 * Equipment counts as pitch 0: ahead of the reds wherever pitch decides the order, and no more
 * than that. It has no pitch of its own, but it is not deck material either, so treating it as
 * the colour before red puts it at the head of the shelf without letting it jump a rarity.
 * Cards that genuinely have no pitch — none in this set's deck cards — sort last.
 */
const pitchRank = (card: PoolCard) =>
  isEquipment(card) ? 0 : (card.pitch ?? Number.MAX_SAFE_INTEGER)

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
