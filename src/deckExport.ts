import { isPlayableBy, signatureWeaponFor } from './heroes'
import { countsTowardDeck, isDrawable } from './packGenerator'
import type { CardCount, PoolCard } from './types'

const PITCH_NAMES: Record<number, string> = { 1: 'red', 2: 'yellow', 3: 'blue' }

const label = (card: PoolCard) =>
  card.pitch && PITCH_NAMES[card.pitch] ? `${card.name} (${PITCH_NAMES[card.pitch]})` : card.name

interface Line {
  card: PoolCard
  count: number
}

/** "3x Acrid Stench (red)" lines, one per distinct card, sorted by name. */
const section = (lines: Line[]): string[] =>
  [...lines]
    .sort(
      (a, b) =>
        // Names are not unique: the same card exists once per pitch. Order those red first.
        a.card.name.localeCompare(b.card.name) || (a.card.pitch ?? 0) - (b.card.pitch ?? 0),
    )
    .map(({ card, count }) => `${count}x ${label(card)}`)

/**
 * The deck list in Fabrary's import format. The hero and its signature weapon come from the
 * hero selector rather than the pool; equipment is whatever you put in the arena; and cards
 * the hero cannot play are left out of both.
 */
export const exportDeck = (
  eventName: string,
  entries: CardCount[],
  /** Card ids of the equipment you chose to wear. */
  arena: string[],
  byId: Map<string, PoolCard>,
  hero: PoolCard | null,
): string => {
  const heroKey = hero?.hero ?? null
  const selected = entries
    .map(({ cardId, count }) => ({ card: byId.get(cardId)!, count }))
    // isDrawable drops Basic cards, which come with the hero rather than the pool.
    .filter(({ card }) => card && isDrawable(card) && isPlayableBy(card, heroKey))

  /*
   * The arena is the weapon you were given plus the equipment you chose. Equipment the hero
   * cannot play is left out, exactly as an off-hero deck card is.
   */
  const weapon = hero ? signatureWeaponFor(hero, [...byId.values()]) : null
  const worn = arena
    .map((cardId) => byId.get(cardId)!)
    .filter((card) => card && isPlayableBy(card, heroKey))
  const arenaLines = [...(weapon ? [weapon] : []), ...worn].map((card) => ({ card, count: 1 }))

  const deck = selected.filter(({ card }) => countsTowardDeck(card))

  const blocks: string[] = []

  const header = [`Name: ${eventName}`]
  if (hero) header.push(`Hero: ${hero.name}`)
  header.push('Format: Sealed')
  blocks.push(header.join('\n'))

  if (arenaLines.length) blocks.push(['Arena cards', ...section(arenaLines)].join('\n'))
  if (deck.length) blocks.push(['Deck cards', ...section(deck)].join('\n'))

  return blocks.join('\n\n')
}
