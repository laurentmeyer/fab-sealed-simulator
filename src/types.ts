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
  /** Keys of the heroes allowed to play this card. */
  legalHeroes: string[]
  /** Hero cards only: the key other cards use in legalHeroes (e.g. "Viserai2"). */
  hero?: string | null
  young?: boolean
}

/** One physical copy of a card in an event's pool. Foiling is not modelled. */
export interface CardInstance {
  instanceId: string
  cardId: string
  selected: boolean
}

export interface SealedEvent {
  id: string
  name: string
  createdAt: string
  cards: CardInstance[]
  /** Card id of the chosen young hero. It brings its signature weapon along. */
  heroId?: string | null
}

export type Grouping = 'rarity' | 'class' | 'pitch'
