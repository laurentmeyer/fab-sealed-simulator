import type { CardCount } from './types'

/** A Flesh and Blood card is 450 x 628. */
const ASPECT = 628 / 450

/** One card size, everywhere. Wide enough that the rules text of a stacked card stays legible. */
export const CARD_WIDTH = 220

/**
 * Everything the table needs to know about how cards stack, in pixels.
 *
 * Cards in a stack overlap: only the top strip of the one underneath shows, which is where
 * the pitch, the name and the cost sit. A card carrying an "xN" badge needs more room, since
 * the badge hangs below the header — see `.copies` in styles.css, which the two must agree on.
 */
export const CARD = {
  width: CARD_WIDTH,
  height: Math.round(CARD_WIDTH * ASPECT),
  /** How far down the next card starts over a plain card. */
  step: Math.round(CARD_WIDTH * 0.155),
  /** The same, over a card whose badge must stay visible. */
  stepOverBadge: Math.round(CARD_WIDTH * 0.28),
}

/** The top of each card of a stack, and the height the whole stack needs. */
export const stackOffsets = (entries: CardCount[]): { tops: number[]; height: number } => {
  const tops: number[] = []
  let top = 0
  for (const entry of entries) {
    tops.push(top)
    top += entry.count > 1 ? CARD.stepOverBadge : CARD.step
  }
  return { tops, height: (tops.at(-1) ?? 0) + CARD.height }
}

/** A stack of single cards, which is what the hero kit is. */
export const stackHeight = (cards: number): number =>
  Math.max(0, cards - 1) * CARD.step + CARD.height
