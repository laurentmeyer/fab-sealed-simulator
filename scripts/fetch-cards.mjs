/**
 * Snapshots the sealed-legal Usurp the Shadow Throne cards into src/data/cards.json.
 *
 * The set is not fully revealed yet. To pick up newly revealed cards:
 *
 *     npm update @flesh-and-blood/cards @flesh-and-blood/types
 *     npm run fetch-cards
 *
 * then commit the regenerated src/data/cards.json. Saved events keep working: they store
 * card ids, and the UI renders an unknown id as a placeholder rather than crashing.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cards } from '@flesh-and-blood/cards'
import { Class, Format, Rarity, Release, Type } from '@flesh-and-blood/types'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/cards.json')
const SET = Release.UsurpTheShadowThrone

/**
 * Usurp the Shadow Throne only supports these classes. Anything else (Guardian, Ninja, ...)
 * is dropped from the pool entirely, so the "any class" pack slots can never roll one.
 */
const SUPPORTED_CLASSES = new Set([
  Class.Necromancer,
  Class.Brute,
  Class.Runeblade,
  Class.Generic,
  Class.NotClassed,
])

/** Marvel is a treatment, not a real rarity, so it is not part of our ladder. */
const KEPT_RARITIES = new Set([
  Rarity.Basic,
  Rarity.Common,
  Rarity.Rare,
  Rarity.Majestic,
  Rarity.Legendary,
  Rarity.Fabled,
])

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** The non-foil printing from this set carries the image id we want (e.g. "IAR069"). */
const imageId = (card) => {
  const printings = card.printings ?? []
  const setPrint =
    printings.find((p) => p.set === SET && !p.foiling && !p.treatment) ??
    printings.find((p) => p.set === SET)
  return setPrint?.image ?? card.defaultImage ?? null
}

/**
 * Cards another card creates during play (tokens, and reprints like Corrupted Corpse that are
 * typed as Actions). They are never opened in a pack nor put in a deck, so they stay out of
 * the pool entirely.
 */
const createdCardIds = new Set(cards.flatMap((c) => c.createdExtras ?? []))
const isCreated = (c) => createdCardIds.has(c.cardIdentifier) || (c.types ?? []).includes(Type.Token)

const inSet = cards.filter((c) => c.sets?.includes(SET))
const sealed = inSet.filter((c) => c.legalFormats?.includes(Format.Sealed))

const excludedByClass = sealed.filter((c) => !(c.classes ?? []).every((k) => SUPPORTED_CLASSES.has(k)))
const excludedByRarity = sealed.filter((c) => !KEPT_RARITIES.has(c.rarity))
const excludedAsCreated = sealed.filter(isCreated)
const kept = sealed.filter(
  (c) =>
    (c.classes ?? []).every((k) => SUPPORTED_CLASSES.has(k)) &&
    KEPT_RARITIES.has(c.rarity) &&
    !isCreated(c),
)

const pool = kept
  .map((c) => ({
    id: c.cardIdentifier,
    name: c.name,
    pitch: num(c.pitch),
    cost: num(c.cost),
    power: num(c.power),
    defense: num(c.defense),
    rarity: c.rarity,
    classes: c.classes ?? [],
    types: c.types ?? [],
    typeText: c.typeText ?? '',
    image: imageId(c),
    // Which heroes may play this card. Authoritative, and finer than matching on class.
    legalHeroes: c.legalHeroes ?? [],
    // Hero cards only: the key other cards refer to in legalHeroes (Viserai2, not Viserai).
    ...(c.types?.includes(Type.Hero) ? { hero: c.hero ?? null, young: Boolean(c.young) } : {}),
  }))
  .sort((a, b) => a.id.localeCompare(b.id))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(pool, null, 2) + '\n')

// --- summary, so data regressions are visible on every run ------------------------------
const tally = (items, key) => {
  const counts = new Map()
  for (const item of items) {
    for (const value of [].concat(key(item))) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
}
const show = (label, rows) =>
  console.log(`${label}: ${rows.map(([k, v]) => `${k}=${v}`).join(', ') || '(none)'}`)

console.log(`\n${SET}`)
console.log(`  cards in set: ${inSet.length}, sealed-legal: ${sealed.length}, kept: ${pool.length}`)
show('  rarity', tally(pool, (c) => c.rarity))
show('  class', tally(pool, (c) => c.classes))
show('  type', tally(pool, (c) => c.types))
console.log(`  without image id: ${pool.filter((c) => !c.image).length}`)
console.log(`  without legalHeroes: ${pool.filter((c) => !c.legalHeroes.length && !c.hero).length}`)
for (const hero of pool.filter((c) => c.hero)) {
  const playable = pool.filter((c) => c.legalHeroes.includes(hero.hero)).length
  const weapon = pool.find((c) => c.types.includes(Type.Weapon) && c.legalHeroes.includes(hero.hero))
  console.log(`  ${hero.name} (${hero.hero}): ${playable} playable cards, weapon: ${weapon?.name ?? 'NONE'}`)
}
if (excludedByClass.length)
  console.log(`  excluded (unsupported class): ${excludedByClass.map((c) => c.name).join(', ')}`)
if (excludedByRarity.length)
  console.log(`  excluded (unsupported rarity): ${excludedByRarity.map((c) => c.name).join(', ')}`)
if (excludedAsCreated.length)
  console.log(`  excluded (created during play): ${excludedAsCreated.map((c) => c.name).join(', ')}`)
console.log(`\nWrote ${OUT}\n`)
