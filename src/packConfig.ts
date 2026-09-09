import type { Rarity } from './types'

/**
 * Every tunable number of the pack simulation lives here.
 *
 * The slot odds are back-derived from the per-pack averages in notes/context.md
 * (Rare 1.75, Common ~11, Majestic 1/4, Legendary 1/80, Fabled 1/200) rather than from
 * published pull rates. See the "Open questions" section of the README.
 */

export const PACKS_PER_EVENT = 8
/** Minimum deck size. Anything above it is a sideboard to swap from between games. */
export const DECK_SIZE = 30

/** High to low. Used to step down when a rolled rarity has no cards in the pool yet. */
export const RARITY_LADDER: Rarity[] = ['Fabled', 'Legendary', 'Majestic', 'Rare', 'Common', 'Basic']

export const CLASS_COMMON_CLASSES = ['Necromancer', 'Brute', 'Runeblade'] as const
export const GENERIC_CLASSES = ['Generic', 'NotClassed'] as const

/**
 * Rare-or-higher slot. The remaining probability (0.7325) falls through to Rare, which with
 * the guaranteed rare slot gives the 1.75 rares per pack we are aiming for.
 */
export const RARE_OR_HIGHER_ODDS: { rarity: Rarity; chance: number }[] = [
  { rarity: 'Fabled', chance: 1 / 200 },
  { rarity: 'Legendary', chance: 1 / 80 },
  { rarity: 'Majestic', chance: 1 / 4 },
]

/** The foil slot is a Rare this often, and a Common the rest of the time. */
export const FOIL_SLOT_RARE_CHANCE = 0.0175

export const COMMONS_PER_PACK = 10
/** How many of the 10 commons are class cards; the rest are generic. 50/50 between them. */
export const CLASS_COMMONS_OPTIONS = [6, 7] as const

/**
 * Relative likelihood of a Basic equipment against a Common one in the equipment slot.
 * 1 means uniform across all equipment. The true print ratio is unknown — see the README.
 */
export const BASIC_EQUIPMENT_WEIGHT = 1
