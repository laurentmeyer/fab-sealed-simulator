import { isEquipment, isHero, isWeapon } from './packGenerator'
import type { PoolCard } from './types'

const legalFor = (card: PoolCard, hero: PoolCard): boolean =>
  Boolean(hero.hero) && card.legalHeroes.includes(hero.hero!)

/**
 * The young heroes you can bring to a sealed event. The class heroes come first; the promo
 * hero (Baalghor, the kit's lucky rainbow foil) closes the row.
 */
export const youngHeroes = (cards: PoolCard[]): PoolCard[] =>
  cards
    .filter((c) => isHero(c) && c.young && c.hero)
    .sort((a, b) => Number(isPromoHero(a)) - Number(isPromoHero(b)) || a.name.localeCompare(b.name))

/** The class heroes are Basic cards from the kit; Baalghor is a Rare rainbow-foil promo. */
export const isPromoHero = (hero: PoolCard): boolean => hero.rarity !== 'Basic'

/**
 * The equipment the pre-release kit guarantees you own: every hero's class Arms (Basic) and
 * the cold-foil trio, which is this set's own equipment — what the talent marks. Equipment
 * with no talent at all is a generic piece playable in any deck in the game and comes out of
 * a pack instead.
 *
 * It is derived from the card data rather than listed, so a refresh keeps it current; a test
 * pins today's set so a refresh cannot change what the kit guarantees unnoticed.
 *
 * Note what this is *not*: none of it is worn for you. The kit hands you the cards, and you
 * pick which to put in the arena, exactly as at a real pre-release.
 */
export const kitEquipment = (cards: PoolCard[]): PoolCard[] =>
  cards
    .filter((c) => isEquipment(c) && (c.rarity === 'Basic' || c.talents.length > 0))
    .sort((a, b) => a.name.localeCompare(b.name))

/**
 * The one thing put into play for you, beyond the hero: its signature weapon, the one Basic
 * weapon legal for it. No hero in this set has a legal alternative, so there is nothing to
 * choose between — see the README's assumptions table, and the test that watches for it.
 */
export const signatureWeaponFor = (hero: PoolCard, cards: PoolCard[]): PoolCard | null =>
  cards.find((c) => c.rarity === 'Basic' && isWeapon(c) && legalFor(c, hero)) ?? null

/** Every weapon this hero could legally wield, which should always be one or none. */
export const weaponsFor = (hero: PoolCard, cards: PoolCard[]): PoolCard[] =>
  cards.filter((c) => isWeapon(c) && legalFor(c, hero))

/** Fabrary hosts hero portraits under the card identifier. */
export const heroImageUrl = (hero: PoolCard): string =>
  `https://content.fabrary.net/heroes/${hero.id}.webp`

/** With no hero picked yet, nothing is off-hero: everything still shows normally. */
export const isPlayableBy = (card: PoolCard, heroKey: string | null): boolean =>
  !heroKey || card.legalHeroes.includes(heroKey)
