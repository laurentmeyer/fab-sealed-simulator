import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { deckIssues, groupCards, partitionByHero, unplayableGroup } from './grouping'
import { countsTowardDeck, isDrawable } from './packGenerator'
import type { CardInstance, PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))

const instancesOf = (...cards: PoolCard[]): CardInstance[] =>
  cards.map((card, i) => ({ instanceId: `i${i}`, cardId: card.id, selected: false }))

const find = (match: (c: PoolCard) => boolean) => pool.find(match)!

describe('groupCards', () => {
  it('returns one unlabelled group when grouping is off', () => {
    const groups = groupCards(instancesOf(...pool.slice(0, 10)), byId, null)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBeNull()
  })

  it('orders rarity groups from best to worst', () => {
    const groups = groupCards(instancesOf(...pool), byId, 'rarity')
    expect(groups.map((g) => g.label)).toEqual(['Majestic', 'Rare', 'Common', 'Basic'])
  })

  it('orders pitch groups red, yellow, blue, then cards without a pitch', () => {
    const groups = groupCards(instancesOf(...pool), byId, 'pitch')
    expect(groups.map((g) => g.label)).toEqual(['Red', 'Yellow', 'Blue', 'No pitch'])
  })

  it('splits classless cards into the talent group and the truly Generic one', () => {
    const groups = groupCards(instancesOf(...pool), byId, 'class')
    const labels = groups.map((g) => g.label)
    expect(labels).toEqual(['Brute', 'Necromancer', 'Runeblade', 'Shadow', 'Generic'])

    const shadow = groups.find((g) => g.label === 'Shadow')!
    const generic = groups.find((g) => g.label === 'Generic')!
    // Shadow cards are for Shadow heroes only; Generic cards are for (almost) everyone.
    expect(shadow.stacks.every((s) => s.card.talents.includes('Shadow'))).toBe(true)
    expect(shadow.stacks.every((s) => s.card.legalHeroes.length <= 10)).toBe(true)
    expect(generic.stacks.every((s) => s.card.legalHeroes.length > 50)).toBe(true)
  })

  it('collects copies of a card into one stack', () => {
    const card = find((c) => c.rarity === 'Common')
    const other = find((c) => c.rarity === 'Common' && c.id !== card.id)
    const groups = groupCards(instancesOf(card, card, card, other), byId, null)

    expect(groups[0].count).toBe(4)
    const stack = groups[0].stacks.find((s) => s.card.id === card.id)!
    expect(stack.instances).toHaveLength(3)
    expect(groups[0].stacks.find((s) => s.card.id === other.id)!.instances).toHaveLength(1)
  })
})

describe('partitionByHero', () => {
  const all = instancesOf(...pool)

  it('treats everything as playable before a hero is picked', () => {
    const { playable, unplayable } = partitionByHero(all, byId, null)
    expect(playable).toHaveLength(all.length)
    expect(unplayable).toHaveLength(0)
  })

  it('splits on what the hero may actually play', () => {
    const { playable, unplayable } = partitionByHero(all, byId, 'Levia')
    const cardsOf = (list: typeof all) => list.map((i) => byId.get(i.cardId)!)

    expect(playable.length + unplayable.length).toBe(all.length)
    expect(cardsOf(playable).every((c) => c.legalHeroes.includes('Levia'))).toBe(true)
    expect(cardsOf(unplayable).every((c) => !c.legalHeroes.includes('Levia'))).toBe(true)
    expect(unplayable.length).toBeGreaterThan(0)
  })

  /**
   * FaB has cards specialized to a single hero, which class alone would get wrong. This set
   * has one hero per class, so the two agree — if a data update ever breaks this, the hero
   * rule is the correct one and only this expectation needs dropping.
   */
  it('agrees with the class mapping while there is one hero per class', () => {
    // Only pool cards: the kit and hero cards are not subject to the class heuristic.
    const all = instancesOf(...pool.filter(isDrawable))
    const generic = (c: PoolCard) => c.classes.some((k) => k === 'Generic' || k === 'NotClassed')
    for (const [heroKey, className] of [
      ['Levia', 'Brute'],
      ['Malice', 'Necromancer'],
      ['Viserai2', 'Runeblade'],
    ]) {
      const { playable, unplayable } = partitionByHero(all, byId, heroKey)
      const cardsOf = (list: typeof all) => list.map((i) => byId.get(i.cardId)!)
      expect(cardsOf(playable).every((c) => c.classes.includes(className) || generic(c))).toBe(true)
      expect(cardsOf(unplayable).every((c) => !c.classes.includes(className) && !generic(c))).toBe(true)
    }
  })
})

describe('deckIssues', () => {
  const malice = pool.find((c) => c.name === 'Malice')!
  const playable = pool.filter((c) => c.legalHeroes.includes('Malice') && countsTowardDeck(c))
  const deckOf = (n: number): CardInstance[] =>
    Array.from({ length: n }, (_, i) => ({
      instanceId: `d${i}`,
      cardId: playable[i % playable.length].id,
      selected: true,
    }))

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

  it('names cards the hero cannot play', () => {
    const offHero = pool.find((c) => !c.legalHeroes.includes('Malice'))!
    const cards = [...deckOf(30), { instanceId: 'x', cardId: offHero.id, selected: true }]
    expect(deckIssues(cards, byId, malice)).toEqual(['1 selected card Malice cannot play'])
  })
})

describe('unplayableGroup', () => {
  it('is empty when the hero can play everything', () => {
    expect(unplayableGroup([], byId, 'Levia')).toEqual([])
  })

  it('collects the leftovers into one dimmed group named after the hero', () => {
    const card = find((c) => !c.legalHeroes.includes('Levia'))
    const [group] = unplayableGroup(instancesOf(card, card), byId, 'Levia')
    expect(group.label).toBe('Levia cannot play these')
    expect(group.dimmed).toBe(true)
    expect(group.count).toBe(2)
    expect(group.stacks).toHaveLength(1)
  })
})
