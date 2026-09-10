import { createContext, useContext, useEffect } from 'react'
import { CardArt } from './CardArt'
import type { PoolCard } from './types'

/**
 * Cards on the table are large enough to read at rest, but a card in a pile shows only its
 * header — so there has to be a way to look at one properly. Any card answers a long press
 * with this, kit cards included.
 */
export const PreviewContext = createContext<(card: PoolCard | null) => void>(() => {})
export const useShowPreview = (): ((card: PoolCard | null) => void) => useContext(PreviewContext)

/** How long the pointer must be held still on a card before it opens. */
export const PRESS_MS = 400
/** Moving further than this is a drag, not a press. */
export const PRESS_SLOP = 6

export function CardOverlay({ card, onClose }: { card: PoolCard; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="card-overlay"
      role="dialog"
      aria-label={card.name}
      // Closing on pointerdown rather than click: the press that opened this is still held,
      // and its release must not count as the dismissal.
      onPointerDown={onClose}
    >
      <div className="card-overlay-card">
        <CardArt card={card} />
      </div>
    </div>
  )
}
