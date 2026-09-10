import type { Rarity } from './types'

/**
 * Every tunable number of the pack simulation lives here.
 *
 * The slot odds are back-derived from the per-pack averages in notes/context.md
 * (Rare 1.75, Common ~11, Majestic 1/4, Legendary 1/80, Fabled 1/200) rather than from
 * published pull rates. See the "Open questions" section of the README.
 */

export const PACKS_PER_EVENT = 8

/**
 * How long you get to build. Twenty minutes is the window a Flesh and Blood pre-release gives
 * you once the packs are open — see the "Open questions" section of the README. Nothing
 * enforces it; it is the figure the clock's colour is calibrated against.
 */
export const BUILD_SECONDS = 20 * 60

/**
 * The clock runs green to red across this span and stays red after it: five minutes past the
 * window, so red means "you are over" rather than "you are nearly out of time".
 */
export const TIMER_RED_SECONDS = BUILD_SECONDS + 5 * 60
/** Minimum deck size. Anything above it is a sideboard to swap from between games. */
export const DECK_SIZE = 30

/**
 * High to low. Used to step down when a rolled rarity has no cards in the pool yet.
 *
 * Legendary and Fabled are not on it: none are sealed-legal in the card data, and the real
 * rates (about one Legendary in 96 packs) mean a sealed pool essentially never sees one. We
 * model them as P = 0 rather than carry odds for cards that never arrive, which costs us
 * about 0.02 rares per pack against the average we were given. See the README.
 */
export const RARITY_LADDER: Rarity[] = ['Majestic', 'Rare', 'Common', 'Basic']

export const CLASS_COMMON_CLASSES = ['Necromancer', 'Brute', 'Runeblade'] as const
export const GENERIC_CLASSES = ['Generic', 'NotClassed'] as const

/**
 * Rare-or-higher slot. The remaining probability (0.75) falls through to Rare, which with the
 * guaranteed rare slot and the foil slot gives about 1.77 rares per pack.
 */
export const RARE_OR_HIGHER_ODDS: { rarity: Rarity; chance: number }[] = [
  { rarity: 'Majestic', chance: 1 / 4 },
]

/** The foil slot is a Rare this often, and a Common the rest of the time. */
export const FOIL_SLOT_RARE_CHANCE = 0.0175

/**
 * The equipment slot. Every pack has one, and it is uniform over the set's equipment: with
 * everything currently Basic or Common, and Basic assumed as likely as Common, one draw over
 * all of them is exactly that. A Rare or Majestic equipment would need its own odds — a test
 * fails if one appears, so the decision cannot be skipped. See the README.
 */
export const EQUIPMENT_PER_PACK = 1

export const COMMONS_PER_PACK = 10
/** How many of the 10 commons are class cards; the rest are generic. 50/50 between them. */
export const CLASS_COMMONS_OPTIONS = [6, 7] as const
