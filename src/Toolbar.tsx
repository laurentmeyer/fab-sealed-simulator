import type { CardBand } from './cardTraits'
import type { PoolBand, PitchFacet } from './deck'
import { HeroSelector } from './HeroSelector'
import { SORT_MODES } from './sorting'
import type { PitchBucket } from './viewFilter'
import type { PoolCard, SortMode } from './types'

/**
 * One filter pill: a label and a live count. Clicking an active pill clears it — the same
 * click that turned it on. The label is optional: the pitch pills carry only their colour, on
 * the reasoning that red/yellow/blue is already how the deck's own pitch bar speaks, so a word
 * next to it would be saying the same thing twice. `title` stands in for anyone the colour
 * alone does not reach.
 */
function Pill({
  active,
  count,
  onClick,
  className,
  title,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  className?: string
  title?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={['pill', active && 'active', className].filter(Boolean).join(' ')}
      aria-pressed={active}
      aria-label={children ? undefined : title}
      title={title ?? (active ? 'Click to clear' : undefined)}
      onClick={onClick}
    >
      {children && <span className="pill-label">{children}</span>}
      <span className="pill-count">{count}</span>
    </button>
  )
}

const PITCH_CLASS: Record<PitchBucket, string> = {
  none: 'pitch-none',
  1: 'pitch-red',
  2: 'pitch-yellow',
  3: 'pitch-blue',
}

/**
 * The filter bar: how cards are ordered, and three blocks that narrow what the pool row shows
 * — Hero (exclusive, and the only one that also decides legality), Class/Talent, and Pitch.
 * Within a block the pills OR together; across blocks they AND. A pill's count is faceted: it
 * reflects the other blocks' current selection, not this block's own.
 *
 * Hero sits on its own row: it is the one selection that also decides legality, and giving it
 * a row of its own keeps that apart from the two that are purely a lens over the pool. There is
 * no separate running total — the active hero's own pill already carries that number, and a
 * second count saying the same thing would just be one more thing to keep in sync.
 */
export function Toolbar({
  sort,
  onSort,
  heroes,
  allCards,
  selectedHeroId,
  heroCounts,
  onSelectHero,
  bands,
  selectedBands,
  onToggleBand,
  pitches,
  selectedPitches,
  onTogglePitch,
}: {
  sort: SortMode
  onSort: (sort: SortMode) => void
  heroes: PoolCard[]
  allCards: PoolCard[]
  selectedHeroId: string | null
  heroCounts: Map<string, number>
  onSelectHero: (heroId: string | null) => void
  bands: PoolBand[]
  selectedBands: ReadonlySet<CardBand>
  onToggleBand: (keys: CardBand[]) => void
  pitches: PitchFacet[]
  selectedPitches: ReadonlySet<PitchBucket>
  onTogglePitch: (bucket: PitchBucket) => void
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <HeroSelector
          heroes={heroes}
          cards={allCards}
          counts={heroCounts}
          selectedId={selectedHeroId}
          onSelect={onSelectHero}
        />
      </div>

      <div className="toolbar-row">
        {bands.length > 0 && (
          <span className="filter-block" role="group" aria-label="Class and talent">
            {bands.map((band) => (
              <Pill
                key={band.key.join('+')}
                active={band.key.every((k) => selectedBands.has(k))}
                count={band.count}
                onClick={() => onToggleBand(band.key)}
              >
                {band.label}
              </Pill>
            ))}
          </span>
        )}

        <span className="filter-block" role="group" aria-label="Pitch">
          {pitches.map((pitch) => (
            <Pill
              key={pitch.bucket}
              active={selectedPitches.has(pitch.bucket)}
              count={pitch.count}
              className={PITCH_CLASS[pitch.bucket]}
              title={pitch.label}
              onClick={() => onTogglePitch(pitch.bucket)}
            />
          ))}
        </span>

        <span className="toolbar-spacer" />

        <label className="control-label">
          Sort by{' '}
          <select value={sort} onChange={(e) => onSort(e.target.value as SortMode)}>
            {SORT_MODES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
