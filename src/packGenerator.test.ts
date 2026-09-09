import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { CLASS_COMMON_CLASSES, PACKS_PER_EVENT } from './packConfig'
import {
  countsTowardDeck,
  generateEventPool,
  generatePack,
  isDrawable,
  isEquipment,
  isSingleton,
  splitClassCommons,
  type Rng,
} from './packGenerator'
import type { PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))
const cardsOf = (instances: { cardId: string }[]) => instances.map((i) => byId.get(i.cardId)!)

/** Feeds a fixed sequence of rolls, then falls back to a midpoint so draws stay valid. */
const scriptedRng = (rolls: number[]): Rng => {
  let i = 0
  return () => (i < rolls.length ? rolls[i++] : 0.5)
}

describe('pack composition', () => {
  it('draws 14 cards with exactly one equipment', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      expect(cards).toHaveLength(14)
      expect(cards.filter(isEquipment)).toHaveLength(1)
    }
  })

  it('draws 10 commons split 6-7 class / 3-4 generic, balanced across classes', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      // The common slots are the last 10 cards; the foil slot before them is usually a
      // Common too, which is what lifts the per-pack average to ~11.
      const commons = cards.slice(-10)
      expect(commons.every((c) => c.rarity === 'Common' && !isEquipment(c))).toBe(true)

      const perClass = CLASS_COMMON_CLASSES.map(
        (name) => commons.filter((c) => c.classes.includes(name)).length,
      )
      const classTotal = perClass.reduce((a, b) => a + b, 0)
      expect(classTotal).toBeGreaterThanOrEqual(6)
      expect(classTotal).toBeLessThanOrEqual(7)
      expect(10 - classTotal).toBeGreaterThanOrEqual(3)
      expect(Math.max(...perClass) - Math.min(...perClass)).toBeLessThanOrEqual(1)
    }
  })

  it('never draws a Basic card inside a pack except in the equipment slot', () => {
    for (let i = 0; i < 50; i++) {
      const basics = cardsOf(generatePack(pool)).filter(isSingleton)
      expect(basics.every(isEquipment)).toBe(true)
    }
  })
})

describe('splitClassCommons', () => {
  it('splits 6 evenly and 7 with a single random extra', () => {
    expect(splitClassCommons(6, Math.random)).toEqual({ Necromancer: 2, Brute: 2, Runeblade: 2 })
    const seven = Object.values(splitClassCommons(7, Math.random)).sort()
    expect(seven).toEqual([2, 2, 3])
  })
})

describe('rarity fallback', () => {
  it('steps down to Majestic when a Fabled is rolled but none exists in the pool', () => {
    // First roll picks the equipment, second the rare, third rolls the rare-or-higher rarity.
    const cards = cardsOf(generatePack(pool, scriptedRng([0, 0, 0.001])))
    expect(pool.some((c) => c.rarity === 'Fabled')).toBe(false)
    expect(cards[2].rarity).toBe('Majestic')
  })
})

describe('event pool', () => {
  it('holds one of each Basic card and no pack-drawn duplicates of them', () => {
    const instances = generateEventPool(pool)
    const cards = cardsOf(instances)
    const singletons = pool.filter((c) => isSingleton(c) && isDrawable(c))

    for (const basic of singletons) {
      expect(cards.filter((c) => c.id === basic.id)).toHaveLength(1)
    }
    expect(instances.every((i) => !i.selected)).toBe(true)

    // 8 packs of 14, minus the Basic equipment draws that merged, plus the singletons.
    const nonBasic = cards.filter((c) => !isSingleton(c)).length
    expect(nonBasic).toBeGreaterThan(PACKS_PER_EVENT * 14 - PACKS_PER_EVENT - 1)
    expect(nonBasic).toBeLessThanOrEqual(PACKS_PER_EVENT * 14)
    expect(cards).toHaveLength(nonBasic + singletons.length)
  })

  it('never holds two copies of the same equipment, whatever the packs gave', () => {
    // Common equipment is drawable many times over 8 packs, but a second copy is unusable.
    for (let run = 0; run < 30; run++) {
      const equipment = cardsOf(generateEventPool(pool)).filter(isEquipment)
      expect(new Set(equipment.map((c) => c.id)).size).toBe(equipment.length)
    }
  })

  it('merges a Basic equipment draw instead of adding a second copy', () => {
    // Force every equipment slot onto the first equipment card, which is Basic.
    const equipment = pool.filter(isEquipment)
    const first = [...equipment].sort((a, b) => a.id.localeCompare(b.id))[0]
    expect(first.rarity).toBe('Basic')

    const cards = cardsOf(generateEventPool(pool, scriptedRng([])))
    expect(cards.filter((c) => c.id === first.id).length).toBeLessThanOrEqual(1)
  })
})

describe('countsTowardDeck', () => {
  it('excludes equipment, heroes and weapons, and includes ordinary cards', () => {
    const byName = (name: string) => pool.find((c) => c.name === name)!
    expect(countsTowardDeck(byName('Hex Gauntlet'))).toBe(false) // Basic equipment
    expect(countsTowardDeck(byName('Path of Repentance'))).toBe(false) // Common equipment
    expect(countsTowardDeck(byName('Malice'))).toBe(false) // hero
    expect(countsTowardDeck(byName('Hell Hammer'))).toBe(false) // weapon
    expect(countsTowardDeck(byName('Acrid Stench'))).toBe(true)
  })
})

describe('cards created during play', () => {
  it('keeps tokens and created cards out of the pool entirely', () => {
    for (const name of ['Blasmophet, the Insatiable Hunger', "Gate to i'Arathael", 'Corrupted Corpse']) {
      expect(pool.find((c) => c.name === name)).toBeUndefined()
    }
    expect(pool.some((c) => c.types.includes('Token'))).toBe(false)
  })
})

describe('pull rates over many packs', () => {
  it('averages ~1.75 rares and ~0.25 majestics per pack', () => {
    const packs = 4000
    let rares = 0
    let majestics = 0
    for (let i = 0; i < packs; i++) {
      for (const card of cardsOf(generatePack(pool))) {
        if (card.rarity === 'Rare') rares++
        if (card.rarity === 'Majestic') majestics++
      }
    }
    expect(rares / packs).toBeGreaterThan(1.6)
    expect(rares / packs).toBeLessThan(1.9)
    expect(majestics / packs).toBeGreaterThan(0.2)
    expect(majestics / packs).toBeLessThan(0.3)
  })
})
