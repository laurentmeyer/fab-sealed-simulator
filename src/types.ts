/** Marvel is deliberately absent: it is a treatment, not a real rarity. */
export type Rarity = 'Basic' | 'Common' | 'Rare' | 'Majestic' | 'Legendary' | 'Fabled'

/** One card of the set, as snapshotted by scripts/fetch-cards.mjs. */
export interface PoolCard {
  id: string
  name: string
  pitch: number | null
  cost: number | null
  power: number | null
  defense: number | null
  rarity: Rarity
  classes: string[]
  types: string[]
  typeText: string
  image: string | null
  /** e.g. ["Shadow"]. Cards with no class and no talent are truly Generic. */
  talents: string[]
  /** Keys of the heroes allowed to play this card. */
  legalHeroes: string[]
  /** Hero cards only: the key other cards use in legalHeroes (e.g. "Viserai2"). */
  hero?: string | null
  young?: boolean
}

/**
 * Copies of a card have no identity of their own: duplicates always merge and always move
 * as a group, so the deck is counts rather than instances.
 */
export interface CardCount {
  cardId: string
  count: number
}

/** One pile on the table. A cardId appears in at most ONE column of an event. */
export interface DeckColumn {
  /** Stable key for React and dnd-kit; it outlives every card that passes through. */
  id: string
  /** Entry order is irrelevant: the view sorts by the active sort mode. */
  cards: CardCount[]
}

/**
 * How long has gone into this build. The run in progress is not stored — it is measured from
 * when the event screen opened — so the banked total is the only thing that needs writing.
 * Stopping the clock lasts as long as you are on the screen: opening the event starts it.
 */
export interface EventTimer {
  /** Seconds banked from earlier runs. */
  spent: number
}

export interface SealedEvent {
  schemaVersion: 2
  id: string
  name: string
  createdAt: string
  /** Card id of the chosen young hero. It brings its kit along. */
  heroId?: string | null
  /** cardId -> copies opened. Fixed at creation; the deck is carved out of it. */
  pool: Record<string, number>
  /** The selected cards, in column order. */
  columns: DeckColumn[]
  /** Absent on events built before there was a clock; they start from zero. */
  timer?: EventTimer
}

/**
 * An event saved by a version that stored individual card instances. It is kept in storage
 * and listed, but cannot be opened — see LegacyEventScreen.
 */
export interface LegacyEvent {
  schemaVersion?: undefined
  id: string
  name: string
  createdAt: string
  heroId?: string | null
  cards?: unknown[]
}

export type StoredEvent = SealedEvent | LegacyEvent

export const isLegacyEvent = (event: StoredEvent): event is LegacyEvent =>
  event.schemaVersion !== 2

/** How cards are ordered, both in the pool row and inside every column. */
export type SortMode = 'rarity' | 'name' | 'pitch'
