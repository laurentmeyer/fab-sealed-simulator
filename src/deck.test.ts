import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { deckCount, deckIssues, legalPoolCount, pitchSplit } from './deck'
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
