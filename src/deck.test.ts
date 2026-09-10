import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { deckCount, deckIssues, legalPoolCount, openedPool, pitchSplit } from './deck'
import { kitEquipment } from './heroes'
import { compareBy } from './sorting'
import { isEquipment } from './packGenerator'
import { matches, partition, type Filter } from './filters'
import { countsTowardDeck, isDrawable } from './packGenerator'
import type { CardCount, PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))

const malice = pool.find((c) => c.name === 'Malice')!
const forHero = (heroKey: string | null): Filter => ({ heroKey })

const playable = pool.filter((c) => c.legalHeroes.includes('Malice') && countsTowardDeck(c))

/** n deck cards for Malice, spread over as few distinct cards as the pool allows. */
const deckOf = (n: number): CardCount[] =>
  playable.slice(0, n).map((card) => ({ cardId: card.id, count: 1 }))

describe('matches', () => {
  it('lets everything through before a hero is picked', () => {
    expect(pool.every((c) => matches(c, forHero(null)))).toBe(true)
  })

  it('goes by legalHeroes, not by class', () => {
    const filter = forHero('Levia')
    for (const card of pool) {
      expect(matches(card, filter)).toBe(card.legalHeroes.includes('Levia'))
    }
  })

  /**
   * FaB has cards specialized to a single hero, which class alone would get wrong. This set
   * has one hero per class, so the two agree — if a data update ever breaks this, the hero
   * rule is the correct one and only this expectation needs dropping.
   */
  it('agrees with the class mapping while there is one hero per class', () => {
    const drawable = pool.filter(isDrawable)
    const generic = (c: PoolCard) => c.classes.some((k) => k === 'Generic' || k === 'NotClassed')
    for (const [heroKey, className] of [
      ['Levia', 'Brute'],
      ['Malice', 'Necromancer'],
      ['Viserai2', 'Runeblade'],
    ]) {
      const { matching, others } = partition(drawable, (c) => c, forHero(heroKey))
      expect(matching.every((c) => c.classes.includes(className) || generic(c))).toBe(true)
      expect(others.every((c) => !c.classes.includes(className) && !generic(c))).toBe(true)
    }
  })
})

describe('partition', () => {
  it('splits without losing or duplicating anything, and keeps the input order', () => {
    const { matching, others } = partition(pool, (c) => c, forHero('Levia'))
    expect(matching.length + others.length).toBe(pool.length)
    expect(others.length).toBeGreaterThan(0)
    expect(matching).toEqual(pool.filter((c) => c.legalHeroes.includes('Levia')))
  })
})

describe('deckCount', () => {
  it('counts every copy of an entry, not the entry', () => {
    const [card] = playable
    expect(deckCount([{ cardId: card.id, count: 3 }], byId, forHero('Malice'))).toBe(3)
  })

  it('leaves out the arena and the cards the hero cannot play', () => {
    const weapon = pool.find((c) => c.name === 'Hell Hammer')!
    const offHero = pool.find((c) => !c.legalHeroes.includes('Malice') && countsTowardDeck(c))!
    const entries = [...deckOf(2), { cardId: weapon.id, count: 1 }, { cardId: offHero.id, count: 1 }]
    expect(deckCount(entries, byId, forHero('Malice'))).toBe(2)
  })
})

describe('pitchSplit', () => {
  it('tallies red, yellow and blue deck cards', () => {
    const reds = playable.filter((c) => c.pitch === 1).slice(0, 2)
    const blue = playable.find((c) => c.pitch === 3)!
    const entries = [
      ...reds.map((c) => ({ cardId: c.id, count: 2 })),
      { cardId: blue.id, count: 1 },
    ]
    expect(pitchSplit(entries, byId, forHero('Malice'))).toEqual([
      { pitch: 1, count: 4 },
      { pitch: 2, count: 0 },
      { pitch: 3, count: 1 },
    ])
  })
})

describe('legalPoolCount', () => {
  const offHero = pool.find((c) => !c.legalHeroes.includes('Malice'))!
  const eventPool = { [playable[0].id]: 3, [playable[1].id]: 1, [offHero.id]: 2 }

  it('counts every copy the hero may play, in the deck or not', () => {
    expect(legalPoolCount(eventPool, byId, forHero('Malice'))).toBe(4)
  })

  it('counts the whole pool before a hero is picked', () => {
    expect(legalPoolCount(eventPool, byId, forHero(null))).toBe(6)
  })

  it('ignores cards that are no longer in the card data', () => {
    expect(legalPoolCount({ 'gone-from-the-set': 5 }, byId, forHero(null))).toBe(0)
  })
})

describe('deckIssues', () => {
  it('asks for a hero first', () => {
    expect(deckIssues(deckOf(30), byId, null)).toContain('No hero chosen')
  })

  it('is happy with exactly 30 cards and a hero', () => {
    expect(deckIssues(deckOf(30), byId, malice)).toEqual([])
  })

  it('treats 30 as a minimum, not a maximum — extras are a sideboard', () => {
    expect(deckIssues(deckOf(45), byId, malice)).toEqual([])
  })

  it('complains below 30', () => {
    expect(deckIssues(deckOf(29), byId, malice)).toEqual(['Deck has 29 cards, 30 is the minimum'])
  })

  it('names cards the hero cannot play, counting every copy', () => {
    const offHero = pool.find((c) => !c.legalHeroes.includes('Malice'))!
    const entries = [...deckOf(30), { cardId: offHero.id, count: 2 }]
    expect(deckIssues(entries, byId, malice)).toEqual(['2 selected cards Malice cannot play'])
  })
})

describe('openedPool', () => {
  const kit = kitEquipment(pool)

  it('adds the equipment the kit guarantees to whatever the packs dealt', () => {
    const merged = openedPool({ [playable[0].id]: 2 }, pool)
    expect(merged[playable[0].id]).toBe(2)
    for (const piece of kit) expect(merged[piece.id]).toBe(1)
  })

  /** You can wear one per slot, so a second copy would be a lie however it got there. */
  it('holds one of each piece, even if a pack somehow dealt more', () => {
    const merged = openedPool({ [kit[0].id]: 3 }, pool)
    expect(merged[kit[0].id]).toBe(1)
  })

  /**
   * The guarantee is derived at render rather than stored, so events saved before equipment
   * was selectable gain it without a migration.
   */
  it('gives an event that never stored equipment the full kit anyway', () => {
    const merged = openedPool({}, pool)
    expect(Object.keys(merged).sort()).toEqual(kit.map((c) => c.id).sort())
  })
})

describe('sorting equipment', () => {
  const piece = pool.find((c) => isEquipment(c) && c.rarity === 'Common')!
  const red = pool.find((c) => c.pitch === 1 && c.rarity === 'Common')!
  const majestic = pool.find((c) => c.rarity === 'Majestic')!

  /** Equipment counts as the colour before red — and as nothing more than that. */
  it('sorts ahead of the reds when pitch decides the order', () => {
    expect(compareBy('pitch')(piece, red)).toBeLessThan(0)
    expect(compareBy('pitch')(red, piece)).toBeGreaterThan(0)
  })

  it('still loses to a better rarity when rarity decides the order', () => {
    expect(compareBy('rarity')(majestic, piece)).toBeLessThan(0)
    expect(compareBy('rarity')(piece, majestic)).toBeGreaterThan(0)
  })

  it('leads its own rarity band, ahead of the reds in it', () => {
    expect(compareBy('rarity')(piece, red)).toBeLessThan(0)
  })

  it('is ordered by name like anything else when the sort is by name', () => {
    const [first, second] = ['Zebra', 'Aardvark'].map((name) => ({ ...piece, name }))
    expect(compareBy('name')(first, second)).toBeGreaterThan(0)
  })
})
