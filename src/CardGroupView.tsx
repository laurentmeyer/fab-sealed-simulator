import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { CardArt } from './CardArt'
import { PRESS_MS, PRESS_SLOP, useShowPreview } from './CardOverlay'
import type { PoolCard } from './types'

/**
 * Every copy of one card, shown as a single card with an "xN" badge — the pool row and the
 * deck columns are both made of these. Copies never show as separate cards: they always move
 * together, so a counter says more than a fan of identical art would.
 *
 * No tooltip: the card says what it is, and one popping up over the pile below it is in the
 * way. The <img> alt (or the text fallback) is what carries the name to a screen reader.
 * Holding the pointer still on a card opens it full size instead. Right click is left alone:
 * it has a meaning of its own on the web, and taking it over would be a surprise.
 */
export function CardGroupView({
  card,
  count,
  onClick,
  locked,
  dimmed,
  dragging,
  style,
  handleRef,
  handleProps,
}: {
  card: PoolCard
  count: number
  onClick?: () => void
  /** Kit cards, which come with the hero and cannot be moved or clicked away. */
  locked?: boolean
  /** The chosen hero cannot play this card. */
  dimmed?: boolean
  dragging?: boolean
  style?: CSSProperties
  handleRef?: (node: HTMLElement | null) => void
  handleProps?: Record<string, unknown>
}) {
  const showPreview = useShowPreview()
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  // Set when a press opened the preview, so a release that still reaches the card does not
  // also count as a click and move a copy across. Cleared by the next press on this card:
  // the release usually lands on the overlay instead, and no click ever arrives to clear it.
  const opened = useRef(false)

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }
  useEffect(() => cancelPress, [])

  const startPress = (e: PointerEvent) => {
    opened.current = false
    if (e.button !== 0) return
    const { clientX: x, clientY: y } = e
    cancelPress()
    press.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        press.current = null
        opened.current = true
        showPreview(card)
      }, PRESS_MS),
    }
  }

  const movePress = (e: PointerEvent) => {
    const held = press.current
    if (!held) return
    if (Math.abs(e.clientX - held.x) > PRESS_SLOP || Math.abs(e.clientY - held.y) > PRESS_SLOP) {
      cancelPress()
    }
  }

  const className = ['card-group', locked && 'locked', dimmed && 'dimmed', dragging && 'dragging']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={style}
      onPointerDown={startPress}
      onPointerMove={movePress}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
    >
      <button
        type="button"
        className="card-tile"
        ref={handleRef}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (opened.current) {
            opened.current = false
            return
          }
          if (!locked) onClick?.()
        }}
        {...handleProps}
      >
        <CardArt card={card} />
        {count > 1 && <span className="copies">&times;{count}</span>}
      </button>
    </div>
  )
}
