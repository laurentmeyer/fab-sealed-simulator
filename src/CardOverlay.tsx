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
/**
 * Moving further than this is a drag, not a press. It must stay comfortably *below* the
 * distance that starts a drag (see Table's PointerSensor): if a drag could begin while a press
 * was still pending, the press would fire mid-drag and drop this overlay over the table.
 */
export const PRESS_SLOP = 5

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
