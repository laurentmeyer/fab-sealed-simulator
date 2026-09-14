import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { bandOf, classOf, compareBands, filterLabel, talentName, talentOf } from './cardTraits'
import { compareBy } from './sorting'
import type { PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const deckCards = pool.filter((c) => !c.types.includes('Hero'))
const find = (band: string) => deckCards.find((c) => bandOf(c) === band)!

const classTalent = find('class+talent')
const classOnly = find('class')
const talentOnly = find('talent')
const generic = find('generic')

describe('reading a card', () => {
  it('sees Generic as the absence of a class rather than a class of its own', () => {
    expect(classOf(generic)).toBeNull()
    expect(talentOf(generic)).toBeNull()
    expect(bandOf(generic)).toBe('generic')
  })

  it('tells the four kinds apart, and the set has all four', () => {
    for (const [card, band] of [
      [classTalent, 'class+talent'],
      [classOnly, 'class'],
      [talentOnly, 'talent'],
      [generic, 'generic'],
    ] as const) {
      expect(bandOf(card)).toBe(band)
    }
    expect(classOf(classTalent)).not.toBeNull()
    expect(talentOf(classTalent)).toBe('Shadow')
    expect(classOf(talentOnly)).toBeNull()
    expect(talentOf(classOnly)).toBeNull()
  })

})

describe('talentName', () => {
  it('reads the set\'s own talent word from the data rather than hardcoding it', () => {
    expect(talentName(pool)).toBe('Shadow')
  })

  it('finds nothing to report in a pool with no talent at all', () => {
    expect(talentName([generic])).toBeNull()
  })
})

describe('filterLabel', () => {
  const talent = 'Shadow'

  it('names the class and the talent together, in that order, whatever the class is', () => {
    expect(filterLabel('class+talent', 'Runeblade', talent)).toBe('Shadow Runeblade')
    expect(filterLabel('class+talent', 'Necromancer', talent)).toBe('Shadow Necromancer')
  })

  it('is just the class name on its own for the class-only band', () => {
    expect(filterLabel('class', 'Necromancer', talent)).toBe('Necromancer')
  })

  it('falls back to the plain words when there is no hero to name a class after, but keeps the two apart', () => {
    expect(filterLabel('class', null, talent)).toBe('Class')
    expect(filterLabel('class+talent', null, talent)).toBe('Shadow and Class')
    expect(filterLabel('class', null, talent)).not.toBe(filterLabel('class+talent', null, talent))
  })

  it('never changes for the talent-only and Generic bands, hero or not', () => {
    for (const heroClass of [null, 'Necromancer', 'Runeblade']) {
      expect(filterLabel('talent', heroClass, talent)).toBe('Shadow')
      expect(filterLabel('generic', heroClass, talent)).toBe('Generic')
    }
  })
})

/** A stand-in for the pool-row label, independent of any hero — just for reading the order. */
const runKeyOf = (card: PoolCard): string => `${bandOf(card)}:${classOf(card) ?? ''}`

describe('the class and talent order', () => {
  it('runs each class talent-first, then the talent alone, then Generic', () => {
    const order = [...deckCards].sort(compareBands).map(runKeyOf)
    const seen = [...new Set(order)]
    expect(seen).toEqual([
      'class+talent:Brute',
      'class:Brute',
      'class+talent:Necromancer',
      'class:Necromancer',
      'class+talent:Runeblade',
      'class:Runeblade',
      'talent:',
      'generic:',
    ])
  })

  /** Each band is one contiguous run: a class's cards never straddle another class. */
  it('leaves no band split across the row', () => {
    const keys = [...deckCards].sort(compareBands).map(runKeyOf)
    const runs = keys.filter((key, i) => i === 0 || key !== keys[i - 1])
    expect(runs.length).toBe(new Set(runs).size)
  })
})

describe('where the band sits in each sort mode', () => {
  const sameRarityAndPitch = (a: PoolCard, b: PoolCard) =>
    a.rarity === b.rarity && a.pitch === b.pitch

  it('decides the order outright in Class/Talent mode', () => {
    expect(compareBy('class')(talentOnly, classTalent)).toBeGreaterThan(0)
    expect(compareBy('class')(classTalent, generic)).toBeLessThan(0)
  })

  it('breaks ties ahead of name in Rarity and Pitch modes', () => {
    // Two cards alike on rarity and pitch, from different bands.
    const a = deckCards.find(
      (c) => bandOf(c) === 'class+talent' && deckCards.some((d) => bandOf(d) === 'generic' && sameRarityAndPitch(c, d)),
    )!
    const b = deckCards.find((d) => bandOf(d) === 'generic' && sameRarityAndPitch(a, d))!
    expect(a).toBeDefined()
    expect(compareBy('rarity')(a, b)).toBeLessThan(0)
    expect(compareBy('pitch')(a, b)).toBeLessThan(0)
  })

  /** Ask for the alphabet and you get the alphabet. */
  it('does not disturb Name mode', () => {
    const named = [...deckCards].sort(compareBy('name')).map((c) => c.name)
    expect(named).toEqual([...named].sort((x, y) => x.localeCompare(y)))
  })
})
