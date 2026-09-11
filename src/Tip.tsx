import { useState, type ReactNode } from 'react'
import { dismissTip, isTipDismissed } from './storage'

/**
 * A one-off note about something the screen cannot show you. It floats over the table rather
 * than taking a slice of it, and is dismissed for good on this device — either by closing it
 * or by doing the thing it describes, since a tip you have already acted on is just clutter.
 *
 * Reserve it for what is genuinely undiscoverable. Anything a player could find by looking is
 * a design problem, not a tip.
 */
export function Tip({
  id,
  dismissed,
  onDismiss,
  children,
}: {
  id: string
  /** Set when the gesture has been used, so the tip retires itself. */
  dismissed?: boolean
  onDismiss?: () => void
  children: ReactNode
}) {
  const [closed, setClosed] = useState(() => isTipDismissed(id))

  const close = () => {
    dismissTip(id)
    setClosed(true)
    onDismiss?.()
  }

  if (closed || dismissed) return null

  return (
    <div className="tip" role="note">
      <span className="tip-text">{children}</span>
      <button type="button" className="tip-close" aria-label="Got it" onClick={close}>
        Got it
      </button>
    </div>
  )
}
