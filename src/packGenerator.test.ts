import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { CLASS_COMMON_CLASSES, PACKS_PER_EVENT } from './packConfig'
import {
  countsTowardDeck,
  generateEventPool,
  generatePack,
  isDrawable,
  isEquipment,
  isHero,
  isWeapon,
  splitClassCommons,
  type Rng,
} from './packGenerator'
import { heroKitFor, isPromoHero, youngHeroes } from './heroes'
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
  it('draws 13 deck cards and nothing else', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      expect(cards).toHaveLength(13)
      expect(cards.every(countsTowardDeck)).toBe(true)
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

  it('never draws kit material: no Basic cards, heroes, weapons or equipment', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      expect(cards.some((c) => c.rarity === 'Basic')).toBe(false)
      expect(cards.some((c) => isHero(c) || isWeapon(c) || isEquipment(c))).toBe(false)
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
    // First roll picks the rare, second rolls the rare-or-higher rarity.
    const cards = cardsOf(generatePack(pool, scriptedRng([0, 0.001])))
    expect(pool.some((c) => c.rarity === 'Fabled')).toBe(false)
    expect(cards[1].rarity).toBe('Majestic')
  })
})

describe('event pool', () => {
  it('holds exactly 8 x 13 deck cards, all unselected', () => {
    const instances = generateEventPool(pool)
    const cards = cardsOf(instances)

    expect(instances.every((i) => !i.selected)).toBe(true)
    expect(cards.every(isDrawable)).toBe(true)
    expect(cards).toHaveLength(PACKS_PER_EVENT * 13)
  })

  it('gives class heroes a kit of weapon, Arms and the three cold-foil pieces', () => {
    const cards = cardsOf(generateEventPool(pool))
    for (const hero of youngHeroes(pool).filter((h) => !isPromoHero(h))) {
      const kit = heroKitFor(hero, pool)
      expect(kit.filter(isWeapon)).toHaveLength(1)
      expect(kit.filter(isEquipment)).toHaveLength(4) // Arms + Head + Chest + Legs
      const slots = kit.filter(isEquipment).map((c) => c.typeText.split(' - ').pop()!)
      expect(slots.sort()).toEqual(['Arms', 'Chest', 'Head', 'Legs'])
      // None of it is ever opened.
      for (const item of [hero, ...kit]) {
        expect(cards.some((c) => c.id === item.id)).toBe(false)
      }
    }
  })

  it('gives Baalghor, the promo hero, no weapon and only the three cold-foil pieces', () => {
    const baalghor = youngHeroes(pool).find(isPromoHero)!
    expect(baalghor.name).toBe('Baalghor, Omen of the End')
    const kit = heroKitFor(baalghor, pool)
    expect(kit.filter(isWeapon)).toHaveLength(0)
    const slots = kit.map((c) => c.typeText.split(' - ').pop()!)
    expect(slots.sort()).toEqual(['Chest', 'Head', 'Legs'])
    // The promo hero card itself is never a pool card either.
    expect(cardsOf(generateEventPool(pool)).some((c) => c.id === baalghor.id)).toBe(false)
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
