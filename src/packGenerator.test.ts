import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import { CLASS_COMMON_CLASSES, PACKS_PER_EVENT } from './packConfig'
import {
  countsTowardDeck,
  drawEquipment,
  equipmentRarities,
  generateEventPool,
  generatePack,
  isDrawable,
  isEquipment,
  isHero,
  isWeapon,
  splitClassCommons,
  tally,
  type Rng,
} from './packGenerator'
import { isPromoHero, kitEquipment, signatureWeaponFor, weaponsFor, youngHeroes } from './heroes'
import type { PoolCard } from './types'

const pool = cardsJson as PoolCard[]
const byId = new Map(pool.map((c) => [c.id, c]))
const cardsOf = (cardIds: string[]) => cardIds.map((id) => byId.get(id)!)

/** Feeds a fixed sequence of rolls, then falls back to a midpoint so draws stay valid. */
const scriptedRng = (rolls: number[]): Rng => {
  let i = 0
  return () => (i < rolls.length ? rolls[i++] : 0.5)
}

describe('pack composition', () => {
  it('draws 14 cards: 13 for the deck and one piece of equipment', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      expect(cards).toHaveLength(14)
      expect(cards.filter(isEquipment)).toHaveLength(1)
      expect(cards.filter((c) => !isEquipment(c)).every(countsTowardDeck)).toBe(true)
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

  it('never draws a hero or a weapon, and no Basic card outside the equipment slot', () => {
    for (let i = 0; i < 50; i++) {
      const cards = cardsOf(generatePack(pool))
      expect(cards.some((c) => isHero(c) || isWeapon(c))).toBe(false)
      expect(cards.filter((c) => c.rarity === 'Basic').every(isEquipment)).toBe(true)
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

describe('rarity', () => {
  it('rolls a Majestic in the rare-or-higher slot when the odds say so', () => {
    // First roll picks the rare, second rolls the rare-or-higher rarity.
    const cards = cardsOf(generatePack(pool, scriptedRng([0, 0.001])))
    expect(cards[1].rarity).toBe('Majestic')
  })

  /**
   * Legendary and Fabled are modelled as impossible: about one Legendary in 96 packs means a
   * sealed pool essentially never sees one, so we drop them rather than carry their odds.
   * The snapshot must not hold any either, or they would show up in a pool unpriced.
   */
  it('has no Legendary or Fabled anywhere', () => {
    expect(pool.some((c) => c.rarity === ('Legendary' as string))).toBe(false)
    expect(pool.some((c) => c.rarity === ('Fabled' as string))).toBe(false)
  })
})

describe('the equipment slot', () => {
  /**
   * The slot draws uniformly, which *is* the rarity model only while every equipment in the
   * set is Basic or Common and Basic is assumed as likely as Common. A rarer piece would need
   * real odds, so this fails rather than letting one slide in at the wrong rate.
   */
  it('draws across Basic and Common only, which is what makes a uniform draw right', () => {
    expect([...equipmentRarities(pool)].sort()).toEqual(['Basic', 'Common'])
  })

  it('reaches every piece of equipment in the set', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) seen.add(drawEquipment(pool, Math.random)!.id)
    expect(seen.size).toBe(pool.filter(isEquipment).length)
  })
})

describe('event pool', () => {
  it('holds 8 x 13 deck cards, plus whatever equipment came up', () => {
    const cardIds = generateEventPool(pool)
    const cards = cardsOf(cardIds)
    const deck = cards.filter((c) => !isEquipment(c))

    expect(deck.every(isDrawable)).toBe(true)
    expect(deck).toHaveLength(PACKS_PER_EVENT * 13)
  })

  /** Two of a piece you can only wear one of is worth nothing, and "x2" would imply it is. */
  it('keeps at most one copy of each piece of equipment', () => {
    for (let i = 0; i < 30; i++) {
      const equipment = cardsOf(generateEventPool(pool)).filter(isEquipment)
      expect(new Set(equipment.map((c) => c.id)).size).toBe(equipment.length)
    }
  })

  it('tallies into the cardId -> copies map an event stores', () => {
    const cardIds = generateEventPool(pool)
    const counts = tally(cardIds)

    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(cardIds.length)
    expect(Object.keys(counts)).toEqual([...new Set(cardIds)])
    expect(Object.values(counts).every((n) => n >= 1)).toBe(true)
  })

  it('never opens a hero or its weapon: those come with the kit', () => {
    const cards = cardsOf(generateEventPool(pool))
    for (const hero of youngHeroes(pool)) {
      expect(cards.some((c) => c.id === hero.id)).toBe(false)
      const weapon = signatureWeaponFor(hero, pool)
      if (weapon) expect(cards.some((c) => c.id === weapon.id)).toBe(false)
    }
  })
})

describe('what the kit guarantees', () => {
  /**
   * Pinned deliberately. The set is derived from the card data — Basic equipment plus this
   * set's own talented equipment — so a data refresh keeps it current; this test is what makes
   * such a refresh announce itself instead of quietly changing what every player owns.
   */
  it('is the three class Arms and the cold-foil trio, and nothing else', () => {
    expect(kitEquipment(pool).map((c) => c.name)).toEqual([
      'Appalling Bearers',
      'Grasp of the Darknight',
      'Grille of Repentance',
      'Hex Gauntlet',
      'Path of Repentance',
      'Robe of Repentance',
    ])
  })

  it('covers one Arms per class hero, and every slot between them', () => {
    const kit = kitEquipment(pool)
    const slots = kit.map((c) => c.typeText.split(' - ').pop()!)
    expect(new Set(slots)).toEqual(new Set(['Arms', 'Head', 'Chest', 'Legs']))

    for (const hero of youngHeroes(pool).filter((h) => !isPromoHero(h))) {
      const arms = kit.filter(
        (c) => c.typeText.endsWith('Arms') && c.legalHeroes.includes(hero.hero!),
      )
      expect(arms).toHaveLength(1)
    }
  })

  /** Weapons auto-select, which is only honest while there is nothing to choose between. */
  it('leaves no hero a choice of weapon', () => {
    for (const hero of youngHeroes(pool)) {
      expect(weaponsFor(hero, pool).length).toBeLessThanOrEqual(1)
    }
  })
})

/**
 * The kit predicate was once "anything that is equipment", which held only while this set's
 * equipment was all Shadow. A generic piece was spoiled later and every hero grew a second
 * Legs slot. Generic equipment comes out of a pack; the kit is this set's own.
 */
describe('generic equipment', () => {
  const generic = pool.filter((c) => isEquipment(c) && c.talents.length === 0)

  it('exists in the data and is playable well outside this set', () => {
    expect(generic.length).toBeGreaterThan(0)
    expect(generic.every((c) => c.legalHeroes.length > 50)).toBe(true)
  })

  it('is not guaranteed by the kit — you have to open it', () => {
    for (const piece of generic) expect(kitEquipment(pool)).not.toContain(piece)
  })

  it('is reachable from a pack, unlike the hero and its weapon', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) seen.add(drawEquipment(pool, Math.random)!.id)
    for (const piece of generic) expect(seen).toContain(piece.id)
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
