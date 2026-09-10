import { useEffect, useRef, useState } from 'react'
import { BurgerIcon, ClockIcon, CopyIcon, FabraryIcon, TrashIcon } from './icons'

/**
 * Everything you do to an event rather than to its cards. It opens with the deck's legality
 * at the top, which is the one thing worth knowing before you export: the export used to
 * carry that warning itself, and a popup on a button is a poor place to read a list.
 */
export function EventMenu({
  issues,
  onExport,
  onDuplicate,
  onDelete,
  onResetTimer,
}: {
  issues: string[]
  onExport: () => void
  onDuplicate: () => void
  onDelete: () => void
  onResetTimer: () => void
}) {
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const legal = issues.length === 0

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className="event-menu" ref={menu}>
      <button
        type="button"
        className={open ? 'menu-toggle open' : 'menu-toggle'}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Event actions"
        aria-label="Event actions"
        onClick={() => setOpen(!open)}
      >
        <BurgerIcon />
        {/* The legality of the deck is worth seeing without opening anything. */}
        {!legal && <span className="menu-dot" aria-hidden />}
      </button>

      {open && (
        <div className="menu-panel" role="menu">
          <div className={legal ? 'menu-status ok' : 'menu-status warn'}>
            <span className="menu-status-line">
              <span aria-hidden>{legal ? '✓' : '⚠'}</span>
              {legal ? 'This deck is legal' : 'This deck has the following issues:'}
            </span>
            {!legal && (
              <ul className="issue-list">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" role="menuitem" onClick={run(onResetTimer)}>
            <ClockIcon />
            Reset the timer
          </button>

          <span className="menu-rule" role="separator" />

          <button type="button" role="menuitem" onClick={run(onExport)}>
            <FabraryIcon />
            Copy the deck list for Fabrary
          </button>
          <button type="button" role="menuitem" onClick={run(onDuplicate)}>
            <CopyIcon />
            Duplicate this event
          </button>
          <button type="button" role="menuitem" className="danger" onClick={run(onDelete)}>
            <TrashIcon />
            Delete this event
          </button>
        </div>
      )}
    </div>
  )
}
