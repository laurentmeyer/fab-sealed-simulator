import { CardArt } from './CardArt'
import type { CardStack } from './grouping'
import type { PoolCard } from './types'

/**
 * Copies of the same card are fanned downwards so only the title bar of each one behind shows,
 * the way Fabrary does it. Clicking the stack moves a single copy.
 */
export function CardStackView({
  stack,
  onClick,
  onHover,
  onLeave,
}: {
  stack: CardStack
  onClick: () => void
  onHover: (card: PoolCard, x: number, y: number) => void
  onLeave: () => void
}) {
  const copies = stack.instances.length
  const behind = Array.from({ length: copies - 1 }, (_, i) => i)
  const locked = Boolean(stack.fixed)

  return (
    <div className="stack">
      <div className="stack-inner" style={{ '--copies': copies } as React.CSSProperties}>
        {behind.map((i) => (
          <div key={i} className="stack-layer" style={{ '--i': i } as React.CSSProperties} aria-hidden>
            <CardArt card={stack.card} size="tile" />
          </div>
        ))}
        <button
          type="button"
          className={locked ? 'card-tile locked' : 'card-tile'}
          // Not `disabled`: that would stop the hover preview from firing.
          aria-disabled={locked || undefined}
          title={
            locked
              ? `${stack.card.name} — comes with your hero`
              : copies > 1
                ? `${stack.card.name} (${copies} copies)`
                : stack.card.name
          }
          onClick={locked ? undefined : onClick}
          onMouseEnter={(e) => onHover(stack.card, e.clientX, e.clientY)}
          onMouseMove={(e) => onHover(stack.card, e.clientX, e.clientY)}
          onMouseLeave={onLeave}
        >
          <CardArt card={stack.card} size="tile" />
          {copies > 1 && <span className="stack-count">{copies}</span>}
        </button>
      </div>
    </div>
  )
}
