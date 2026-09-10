import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { exportDeck } from './deckExport'
import { signatureWeaponFor } from './heroes'
import type { CardInstance, PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))

/** Names are not unique in FaB: a card exists once per pitch value, each with its own id. */
const byName = (name: string) => pool.find((c) => c.name === name)!

const select = (...cards: PoolCard[]): CardInstance[] =>
  cards.map((card, i) => ({ instanceId: `i${i}`, cardId: card.id, selected: true }))

const named = (...names: string[]) => select(...names.map(byName))

const viserai = byName('Viserai, Between Worlds')
const malice = byName('Malice')

describe('exportDeck', () => {
  it('writes the header, the whole kit as arena cards, and the deck cards', () => {
    const red = pool.find(
      (c) => c.rarity === 'Common' && c.pitch === 1 && c.legalHeroes.includes(viserai.hero!),
    )!
    const instances = select(red, red)

    expect(exportDeck('My sealed deck', instances, byId, viserai)).toBe(
      [
        'Name: My sealed deck',
        'Hero: Viserai, Between Worlds',
        'Format: Sealed',
        '',
        'Arena cards',
        '1x Grasp of the Darknight',
        '1x Grille of Repentance',
        '1x Path of Repentance',
        '1x Robe of Repentance',
        '1x Seven Sin Nebula',
        '',
        'Deck cards',
        `2x ${red.name} (red)`,
      ].join('\n'),
    )
  })

  it('brings the signature weapon along with the hero, unasked', () => {
    const text = exportDeck('Event 1', [], byId, malice)
    expect(text).toContain(`1x ${signatureWeaponFor(malice, pool)!.name}`)
    expect(text).toContain('Hero: Malice')
  })

  it('gives Baalghor an arena of just the three cold-foil pieces', () => {
    const text = exportDeck('Event 1', [], byId, byName('Baalghor, Omen of the End'))
    expect(text).toBe(
      [
        'Name: Event 1',
        'Hero: Baalghor, Omen of the End',
        'Format: Sealed',
        '',
        'Arena cards',
        '1x Grille of Repentance',
        '1x Path of Repentance',
        '1x Robe of Repentance',
      ].join('\n'),
    )
  })

  it('omits the Hero line and the whole kit when no hero is picked', () => {
    expect(exportDeck('Event 1', [], byId, null)).toBe('Name: Event 1\nFormat: Sealed')
  })

  it('leaves out cards the hero cannot play', () => {
    const offHero = pool.find(
      (c) => c.rarity === 'Common' && !c.legalHeroes.includes(malice.hero!) && c.pitch !== null,
    )!
    const onHero = pool.find(
      (c) => c.rarity === 'Common' && c.legalHeroes.includes(malice.hero!) && c.pitch !== null,
    )!
    const text = exportDeck('Event 1', select(offHero, onHero), byId, malice)

    expect(text).toContain(onHero.name)
    expect(text).not.toContain(offHero.name)
  })

  it('keeps same-name cards of different pitches apart', () => {
    const twins = pool.filter((c) => c.name === 'Bloodfrenzy Gloomblade')
    expect(twins.length).toBeGreaterThan(1)
    const text = exportDeck('Event 1', select(...twins), byId, null)
    for (const twin of twins) expect(text).toContain(`1x ${twin.name} (`)
    expect(text).not.toContain(`${twins.length}x`)
  })

  it('ignores unselected cards and sorts each section by name', () => {
    const [a, b] = pool
      .filter((c) => c.rarity === 'Common' && c.types.includes('Action'))
      .filter((c, _i, all) => all.filter((o) => o.name === c.name).length === 1)
      .slice(0, 2)
    const instances: CardInstance[] = [
      { instanceId: '1', cardId: b.id, selected: true },
      { instanceId: '2', cardId: a.id, selected: true },
      { instanceId: '3', cardId: a.id, selected: false },
    ]
    const lines = exportDeck('Event 1', instances, byId, null).split('\n')
    const deckLines = lines.slice(lines.indexOf('Deck cards') + 1)
    expect(deckLines).toHaveLength(2)
    expect(deckLines.every((l) => l.startsWith('1x'))).toBe(true)
    expect(deckLines).toEqual([...deckLines].sort())
  })

  it('gives the header alone for an empty selection and no hero', () => {
    expect(exportDeck('Event 3', [], byId, null)).toBe('Name: Event 3\nFormat: Sealed')
  })

  it('adds no pitch suffix to cards without a pitch value', () => {
    // Blood Harvest (Levia-only) is the pool's one pitchless card; kit weapons are too.
    const text = exportDeck('Event 1', named('Blood Harvest'), byId, byName('Levia'))
    expect(text).toContain('1x Blood Harvest')
    expect(text).not.toMatch(/Blood Harvest \(/)
    expect(text).toContain('1x Hell Hammer')
    expect(text).not.toMatch(/Hell Hammer \(/)
  })
})
