import { SORT_MODES } from './sorting'
import type { SortMode } from './types'

/** One slim bar above the table: how cards are ordered, and what the filter is doing. */
export function Toolbar({
  sort,
  onSort,
  hero,
  legal,
  onClearHero,
}: {
  sort: SortMode
  onSort: (sort: SortMode) => void
  hero: string | null
  /** Copies of the pool this hero may play, deck included: the pool you are building from. */
  legal: number
  onClearHero: () => void
}) {
  return (
    <div className="toolbar">
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

      {hero && (
        <span className="toolbar-note">
          {legal} legal card{legal === 1 ? '' : 's'} for {hero} &mdash;{' '}
          <button type="button" className="link" onClick={onClearHero}>
            clear
          </button>
        </span>
      )}

      <span className="toolbar-spacer" />
    </div>
  )
}
