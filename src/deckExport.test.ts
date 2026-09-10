import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { exportDeck } from './deckExport'
import { signatureWeaponFor } from './heroes'
import type { CardCount, PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))

/** Names are not unique in FaB: a card exists once per pitch value, each with its own id. */
const byName = (name: string) => pool.find((c) => c.name === name)!

/** Copies merge into one entry with a count, the way the columns hold them. */
const select = (...cards: PoolCard[]): CardCount[] => {
  const entries: CardCount[] = []
  for (const card of cards) {
    const entry = entries.find((e) => e.cardId === card.id)
    if (entry) entry.count++
    else entries.push({ cardId: card.id, count: 1 })
  }
  return entries
}

const named = (...names: string[]) => select(...names.map(byName))

const viserai = byName('Viserai, Between Worlds')
const malice = byName('Malice')

describe('exportDeck', () => {
  it('writes the header, the arena and the deck cards', () => {
    const red = pool.find(
      (c) => c.rarity === 'Common' && c.pitch === 1 && c.legalHeroes.includes(viserai.hero!),
    )!
    expect(exportDeck('My sealed deck', select(red, red), [], byId, viserai)).toBe(
      [
        'Name: My sealed deck',
        'Hero: Viserai, Between Worlds',
        'Format: Sealed',
        '',
        'Arena cards',
        '1x Seven Sin Nebula',
        '',
        'Deck cards',
        `2x ${red.name} (red)`,
      ].join('\n'),
    )
  })

  it('brings the signature weapon along with the hero, unasked', () => {
    const text = exportDeck('Event 1', [], [], byId, malice)
    expect(text).toContain(`1x ${signatureWeaponFor(malice, pool)!.name}`)
    expect(text).toContain('Hero: Malice')
  })

  it('gives Baalghor, who has no weapon, an empty arena until he wears something', () => {
    const baalghor = byName('Baalghor, Omen of the End')
    expect(exportDeck('Event 1', [], [], byId, baalghor)).toBe(
      ['Name: Event 1', 'Hero: Baalghor, Omen of the End', 'Format: Sealed'].join('\n'),
    )
  })

  it('lists the equipment you chose to wear, alongside the weapon you were given', () => {
    const worn = [byName('Robe of Repentance').id, byName('Hex Gauntlet').id]
    const text = exportDeck('Event 1', [], worn, byId, byName('Levia'))
    expect(text).toBe(
      [
        'Name: Event 1',
        'Hero: Levia',
        'Format: Sealed',
        '',
        'Arena cards',
        '1x Hell Hammer',
        '1x Hex Gauntlet',
        '1x Robe of Repentance',
      ].join('\n'),
    )
  })

  it('leaves out equipment the hero cannot play, as it does an off-hero deck card', () => {
    // Appalling Bearers is Malice's Arms; Levia cannot wear it.
    const worn = [byName('Appalling Bearers').id, byName('Robe of Repentance').id]
    const text = exportDeck('Event 1', [], worn, byId, byName('Levia'))
    expect(text).toContain('1x Robe of Repentance')
    expect(text).not.toContain('Appalling Bearers')
  })

  it('wears nothing unless asked: the kit hands you equipment, it does not put it on', () => {
    const text = exportDeck('Event 1', [], [], byId, byName('Levia'))
    expect(text).toContain('1x Hell Hammer')
    expect(text).not.toContain('Repentance')
    expect(text).not.toContain('Hex Gauntlet')
  })

  it('omits the Hero line and the whole kit when no hero is picked', () => {
    expect(exportDeck('Event 1', [], [], byId, null)).toBe('Name: Event 1\nFormat: Sealed')
  })

  it('leaves out cards the hero cannot play', () => {
    const offHero = pool.find(
      (c) => c.rarity === 'Common' && !c.legalHeroes.includes(malice.hero!) && c.pitch !== null,
    )!
    const onHero = pool.find(
      (c) => c.rarity === 'Common' && c.legalHeroes.includes(malice.hero!) && c.pitch !== null,
    )!
    const text = exportDeck('Event 1', select(offHero, onHero), [], byId, malice)

    expect(text).toContain(onHero.name)
    expect(text).not.toContain(offHero.name)
  })

  it('keeps same-name cards of different pitches apart', () => {
    const twins = pool.filter((c) => c.name === 'Bloodfrenzy Gloomblade')
    expect(twins.length).toBeGreaterThan(1)
    const text = exportDeck('Event 1', select(...twins), [], byId, null)
    for (const twin of twins) expect(text).toContain(`1x ${twin.name} (`)
    expect(text).not.toContain(`${twins.length}x`)
  })

  it('sorts each section by name', () => {
    const [a, b] = pool
      .filter((c) => c.rarity === 'Common' && c.types.includes('Action'))
      .filter((c, _i, all) => all.filter((o) => o.name === c.name).length === 1)
      .slice(0, 2)
    // Column order is arbitrary; the export always comes out sorted.
    const entries: CardCount[] = [
      { cardId: b.id, count: 1 },
      { cardId: a.id, count: 1 },
    ]
    const lines = exportDeck('Event 1', entries, [], byId, null).split('\n')
    const deckLines = lines.slice(lines.indexOf('Deck cards') + 1)
    expect(deckLines).toHaveLength(2)
    expect(deckLines.every((l) => l.startsWith('1x'))).toBe(true)
    expect(deckLines).toEqual([...deckLines].sort())
  })

  it('gives the header alone for an empty selection and no hero', () => {
    expect(exportDeck('Event 3', [], [], byId, null)).toBe('Name: Event 3\nFormat: Sealed')
  })

  it('adds no pitch suffix to cards without a pitch value', () => {
    // Blood Harvest (Levia-only) is the pool's one pitchless card; kit weapons are too.
    const text = exportDeck('Event 1', named('Blood Harvest'), [], byId, byName('Levia'))
    expect(text).toContain('1x Blood Harvest')
    expect(text).not.toMatch(/Blood Harvest \(/)
    expect(text).toContain('1x Hell Hammer')
    expect(text).not.toMatch(/Hell Hammer \(/)
  })
})
