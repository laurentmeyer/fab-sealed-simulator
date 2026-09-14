import { bandOf, type CardBand } from './cardTraits'
import { isEquipment } from './packGenerator'
import type { PoolCard } from './types'

/**
 * The pitch-based filter block. Equipment and the handful of genuinely pitchless cards share
 * one bucket — the "no pitch" shelf ahead of red, the same idea as pitch 0 in sorting.ts.
 */
export type PitchBucket = 1 | 2 | 3 | 'none'

/** Fixed, and always shown in this order — unlike the type block, which varies by hero. */
export const PITCH_BUCKETS: { bucket: PitchBucket; label: string }[] = [
  { bucket: 'none', label: 'No pitch' },
  { bucket: 1, label: 'Red' },
  { bucket: 2, label: 'Yellow' },
  { bucket: 3, label: 'Blue' },
]

export const pitchBucketOf = (card: PoolCard): PitchBucket =>
  isEquipment(card) || card.pitch === null ? 'none' : (card.pitch as 1 | 2 | 3)

/**
 * What the toolbar's Type and Pitch blocks narrow the pool row to. Empty means everything
 * passes — a block with nothing picked filters nothing. Within a block the selections are
 * OR'd (red or yellow); across the two blocks they AND (must satisfy both).
 *
 * `bands` holds `CardBand` values — never rendered label strings. A pill's label depends on
 * the chosen hero's class and can change from one render to the next; the filter it stands for
 * must not change with it, or picking a different hero would silently break a filter you had
 * already set. Toolbar decides, purely as a display choice, whether a band pill stands for one
 * `CardBand` or — with no hero, where cards are not broken down by which class — two of them
 * toggled together as a single "Class" pill.
 *
 * The hero is deliberately not part of this: it decides legality — the kit, the weapon, the
 * export, the 30-count — while this is a lens over what is already legal. Keeping them apart
 * means picking a type or a pitch can never change what a deck is allowed to hold.
 */
export interface ViewFilter {
  bands: ReadonlySet<CardBand>
  pitches: ReadonlySet<PitchBucket>
}

export const EMPTY_VIEW: ViewFilter = { bands: new Set(), pitches: new Set() }

export const matchesView = (card: PoolCard, view: ViewFilter): boolean =>
  (view.bands.size === 0 || view.bands.has(bandOf(card))) &&
  (view.pitches.size === 0 || view.pitches.has(pitchBucketOf(card)))

const toggled = <T>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

/**
 * Toggles a whole group of bands together — on if any are off, off if all are on — so a pill
 * standing for more than one `CardBand` (the merged "Class" pill) behaves as one unit rather
 * than the two halves drifting out of sync. A plain single-band pill is just a group of one.
 */
export const toggleBandGroup = (view: ViewFilter, group: readonly CardBand[]): ViewFilter => {
  const allActive = group.length > 0 && group.every((band) => view.bands.has(band))
  const next = new Set(view.bands)
  for (const band of group) {
    if (allActive) next.delete(band)
    else next.add(band)
  }
  return { ...view, bands: next }
}

export const togglePitch = (view: ViewFilter, bucket: PitchBucket): ViewFilter => ({
  ...view,
  pitches: toggled(view.pitches, bucket),
})
