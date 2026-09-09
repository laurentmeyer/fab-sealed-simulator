import { isPlayableBy, signatureWeaponFor } from './heroes'
import { countsTowardDeck, isEquipment } from './packGenerator'
import type { CardInstance, PoolCard } from './types'

const PITCH_NAMES: Record<number, string> = { 1: 'red', 2: 'yellow', 3: 'blue' }

const label = (card: PoolCard) =>
  card.pitch && PITCH_NAMES[card.pitch] ? `${card.name} (${PITCH_NAMES[card.pitch]})` : card.name

/** "3x Acrid Stench (red)" lines, one per distinct card, sorted by name. */
const section = (cards: PoolCard[]): string[] => {
  const counts = new Map<string, { card: PoolCard; count: number }>()
  for (const card of cards) {
    const entry = counts.get(card.id)
    if (entry) entry.count++
    else counts.set(card.id, { card, count: 1 })
  }
  return [...counts.values()]
    .sort(
      (a, b) =>
        // Names are not unique: the same card exists once per pitch. Order those red first.
        a.card.name.localeCompare(b.card.name) || (a.card.pitch ?? 0) - (b.card.pitch ?? 0),
    )
    .map(({ card, count }) => `${count}x ${label(card)}`)
}

/**
 * The deck list in Fabrary's import format. The hero and its signature weapon come from the
 * hero selector rather than the pool, and cards the hero cannot play are left out.
 */
export const exportDeck = (
  eventName: string,
  instances: CardInstance[],
  byId: Map<string, PoolCard>,
  hero: PoolCard | null,
): string => {
  const heroKey = hero?.hero ?? null
  const selected = instances
    .filter((i) => i.selected)
    .map((i) => byId.get(i.cardId))
    .filter((c): c is PoolCard => Boolean(c) && isPlayableBy(c!, heroKey))

  const weapon = hero ? signatureWeaponFor(hero, [...byId.values()]) : null
  const arena = [...(weapon ? [weapon] : []), ...selected.filter(isEquipment)]
  const deck = selected.filter(countsTowardDeck)

  const blocks: string[] = []

  const header = [`Name: ${eventName}`]
  if (hero) header.push(`Hero: ${hero.name}`)
  header.push('Format: Sealed')
  blocks.push(header.join('\n'))

  if (arena.length) blocks.push(['Arena cards', ...section(arena)].join('\n'))
  if (deck.length) blocks.push(['Deck cards', ...section(deck)].join('\n'))

  return blocks.join('\n\n')
}
