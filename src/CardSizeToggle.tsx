export type CardSize = 'small' | 'large'

/**
 * The grid works off a per-size CSS class rather than a fixed pixel width. A plain
 * `minmax(165px, …)` broke down on a narrow pane, where both sizes fit the same number of
 * columns and the toggle appeared to do nothing. See `.size-small` / `.size-large` in
 * styles.css: each size guarantees a column count on narrow panes and grows on wide ones.
 */
export const CARD_SIZE_CLASS: Record<CardSize, string> = {
  small: 'size-small',
  large: 'size-large',
}

const Grid = ({ cells }: { cells: number }) => {
  const step = 16 / cells
  const dot = step * 0.62
  const offset = (step - dot) / 2
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      {Array.from({ length: cells * cells }, (_, i) => (
        <rect
          key={i}
          x={(i % cells) * step + offset}
          y={Math.floor(i / cells) * step + offset}
          width={dot}
          height={dot}
          rx={dot * 0.3}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

export function CardSizeToggle({
  size,
  onChange,
}: {
  size: CardSize
  onChange: (size: CardSize) => void
}) {
  return (
    <span className="size-toggle" role="group" aria-label="Card size">
      <button
        type="button"
        className={size === 'large' ? 'active' : ''}
        onClick={() => onChange('large')}
        title="Bigger cards"
        aria-pressed={size === 'large'}
      >
        <Grid cells={2} />
      </button>
      <button
        type="button"
        className={size === 'small' ? 'active' : ''}
        onClick={() => onChange('small')}
        title="Smaller cards"
        aria-pressed={size === 'small'}
      >
        <Grid cells={3} />
      </button>
    </span>
  )
}
