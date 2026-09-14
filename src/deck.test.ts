import { describe, expect, it } from 'vitest'
import cardsJson from './data/cards.json'
import {
  deckCount,
  deckIssues,
  heroPoolCounts,
  openedPool,
  pitchSplit,
  poolBandFacets,
  poolPitchFacets,
  poolTotal,
} from './deck'
import { kitEquipment } from './heroes'
import { compareBy } from './sorting'
import { isEquipment } from './packGenerator'
import { matches, partition, type Filter } from './filters'
import { countsTowardDeck, isDrawable } from './packGenerator'
import type { CardCount, PoolCard } from './types'
import { EMPTY_VIEW, toggleBandGroup, togglePitch, type ViewFilter } from './viewFilter'

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

describe('poolTotal', () => {
  const offHero = pool.find((c) => !c.legalHeroes.includes('Malice'))!
  const eventPool = { [playable[0].id]: 3, [playable[1].id]: 1, [offHero.id]: 2 }

  it('counts every copy the hero may play, in the deck or not', () => {
    expect(poolTotal(eventPool, byId, forHero('Malice'), EMPTY_VIEW)).toBe(4)
  })

  it('counts the whole pool before a hero is picked', () => {
    expect(poolTotal(eventPool, byId, forHero(null), EMPTY_VIEW)).toBe(6)
  })

  it('ignores cards that are no longer in the card data', () => {
    expect(poolTotal({ 'gone-from-the-set': 5 }, byId, forHero(null), EMPTY_VIEW)).toBe(0)
  })

  it('narrows to a type or a pitch filter, and both together', () => {
    const red = playable.find((c) => c.pitch === 1)!
    const withPitch = { [red.id]: 2, [playable[1].id]: 1 }
    const onlyRed: ViewFilter = { pitches: new Set([1]), bands: new Set() }
    expect(poolTotal(withPitch, byId, forHero(null), onlyRed)).toBe(2)
  })
})

describe('poolBandFacets', () => {
  const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
  const talent = 'Shadow'

  /**
   * The filter's *logic* must survive a hero change even though its label does not: picking
   * Necromancer and later switching to Runeblade should relabel the same selected band, never
   * silently clear it. Proven here by toggling the class+talent key once and reading it back
   * as still active under a different hero's class name.
   */
  it('keeps the same band selected across a change of hero, only the label moving', () => {
    const view = toggleBandGroup(EMPTY_VIEW, ['class+talent'])
    const asNecromancer = poolBandFacets(wholeSet, byId, forHero('Malice'), view, 'Necromancer', talent)
    const asRuneblade = poolBandFacets(wholeSet, byId, forHero('Viserai2'), view, 'Runeblade', talent)

    expect(asNecromancer.find((b) => b.label === 'Shadow Necromancer')).toBeTruthy()
    expect(asRuneblade.find((b) => b.label === 'Shadow Runeblade')).toBeTruthy()
    // The key underneath both is the same one — the toggle never needed to change.
    expect(asNecromancer.find((b) => b.label === 'Shadow Necromancer')!.key).toEqual(['class+talent'])
    expect(asRuneblade.find((b) => b.label === 'Shadow Runeblade')!.key).toEqual(['class+talent'])
  })

  /** A hero with no class of its own should not be shown two empty class buckets. */
  it('leaves out the bands a hero has nothing in', () => {
    const baalghor = poolBandFacets(wholeSet, byId, forHero('Baalghor'), EMPTY_VIEW, null, talent).map(
      (b) => b.label,
    )
    expect(baalghor).toEqual(['Shadow', 'Generic'])

    const malice = poolBandFacets(
      wholeSet,
      byId,
      forHero('Malice'),
      EMPTY_VIEW,
      'Necromancer',
      talent,
    ).map((b) => b.label)
    expect(malice).toEqual(['Shadow Necromancer', 'Necromancer', 'Shadow', 'Generic'])
  })

  /**
   * No hero: classed cards are not broken down by *which* class, but a class card with the
   * talent is still a different pill from one without — that distinction does not need a hero
   * to be meaningful, only "which class" does.
   */
  it('keeps four distinct pills with no hero, generically labelled', () => {
    const bands = poolBandFacets(wholeSet, byId, forHero(null), EMPTY_VIEW, null, talent)
    expect(bands.map((b) => b.label)).toEqual(['Shadow and Class', 'Class', 'Shadow', 'Generic'])
    expect(bands.map((b) => b.key)).toEqual([['class+talent'], ['class'], ['talent'], ['generic']])

    const total = bands.reduce((sum, b) => sum + b.count, 0)
    expect(total).toBe(poolTotal(wholeSet, byId, forHero(null), EMPTY_VIEW))
  })

  it('toggles the class+talent and class-only pills independently', () => {
    const bands = poolBandFacets(wholeSet, byId, forHero(null), EMPTY_VIEW, null, talent)
    const classTalentPill = bands.find((b) => b.label === 'Shadow and Class')!
    const view = toggleBandGroup(EMPTY_VIEW, classTalentPill.key)

    expect(view.bands).toEqual(new Set(['class+talent']))
    expect(poolTotal(wholeSet, byId, forHero(null), view)).toBe(classTalentPill.count)

    const untoggled = toggleBandGroup(view, classTalentPill.key)
    expect(untoggled.bands.size).toBe(0)
  })

  /**
   * A pill's own block never restricts its own list — clicking a pitch pill should not make
   * band pills disappear, only change their counts. Otherwise a band you just narrowed out of
   * existence could never be clicked back on.
   */
  it('keeps every band pill visible as the pitch filter changes, only moving the counts', () => {
    const labelsAt = (view: ViewFilter) =>
      poolBandFacets(wholeSet, byId, forHero('Malice'), view, 'Necromancer', talent).map(
        (b) => b.label,
      )

    const noFilter = labelsAt(EMPTY_VIEW)
    const blueOnly = togglePitch(EMPTY_VIEW, 3)
    expect(labelsAt(blueOnly)).toEqual(noFilter)

    const total = poolBandFacets(
      wholeSet,
      byId,
      forHero('Malice'),
      blueOnly,
      'Necromancer',
      talent,
    ).reduce((sum, b) => sum + b.count, 0)
    expect(total).toBe(poolTotal(wholeSet, byId, forHero('Malice'), blueOnly))
  })
})

describe('poolPitchFacets', () => {
  it('always returns the same four buckets, in a fixed order', () => {
    const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
    expect(poolPitchFacets(wholeSet, byId, forHero(null), EMPTY_VIEW).map((p) => p.label)).toEqual([
      'No pitch',
      'Red',
      'Yellow',
      'Blue',
    ])
  })

  it('puts equipment and pitchless cards in the No pitch bucket', () => {
    const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
    const equipment = pool.filter((c) => isEquipment(c) && c.legalHeroes.includes('Malice'))
    const facets = poolPitchFacets(wholeSet, byId, forHero('Malice'), EMPTY_VIEW)
    const noPitch = facets.find((f) => f.bucket === 'none')!
    expect(noPitch.count).toBeGreaterThanOrEqual(equipment.length)
  })

  /** Symmetric with poolBandFacets: the type filter narrows counts, not which pills show. */
  it('keeps every pitch pill visible as the type filter changes', () => {
    const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
    const bands = poolBandFacets(wholeSet, byId, forHero('Malice'), EMPTY_VIEW, 'Necromancer', 'Shadow')
    const oneBand = toggleBandGroup(EMPTY_VIEW, bands[0].key)
    const buckets = poolPitchFacets(wholeSet, byId, forHero('Malice'), oneBand).map((p) => p.bucket)
    expect(buckets).toEqual(['none', 1, 2, 3])
  })
})

describe('heroPoolCounts', () => {
  it('gives each hero the total poolTotal would report if they were picked', () => {
    const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
    const heroes = pool.filter((c) => c.types.includes('Hero') && c.young)
    const counts = heroPoolCounts(wholeSet, byId, heroes, EMPTY_VIEW)
    for (const hero of heroes) {
      expect(counts.get(hero.id)).toBe(poolTotal(wholeSet, byId, forHero(hero.hero ?? null), EMPTY_VIEW))
    }
  })

  it('respects the current type and pitch filters', () => {
    const wholeSet = Object.fromEntries(pool.map((c) => [c.id, 1]))
    const heroes = pool.filter((c) => c.types.includes('Hero') && c.young)
    const redOnly = togglePitch(EMPTY_VIEW, 1)
    const counts = heroPoolCounts(wholeSet, byId, heroes, redOnly)
    for (const hero of heroes) {
      expect(counts.get(hero.id)).toBe(poolTotal(wholeSet, byId, forHero(hero.hero ?? null), redOnly))
    }
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

  /**
   * Basic is a mark of the pre-release kit, not of scarcity — the pack odds treat it as Common
   * too — so the class Arms must not sort behind every Common in the set.
   */
  it('ranks Basic equipment with the Commons, not after them', () => {
    const basic = pool.find((c) => isEquipment(c) && c.rarity === 'Basic')!
    const common = pool.find((c) => isEquipment(c) && c.rarity === 'Common')!
    expect(compareBy('rarity')(basic, common)).toBe(compareBy('rarity')(common, basic) * -1)
    expect(Math.abs(compareBy('rarity')(basic, red))).toBeGreaterThan(0)
    expect(compareBy('rarity')(basic, red)).toBeLessThan(0)
    // And a Majestic still outranks it.
    expect(compareBy('rarity')(majestic, basic)).toBeLessThan(0)
  })

  it('is ordered by name like anything else when the sort is by name', () => {
    const [first, second] = ['Zebra', 'Aardvark'].map((name) => ({ ...piece, name }))
    expect(compareBy('name')(first, second)).toBeGreaterThan(0)
  })
})
