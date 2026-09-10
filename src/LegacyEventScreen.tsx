import { Footer } from './Footer'
import type { LegacyEvent } from './types'

/**
 * Events saved before the table view stored one entry per physical copy, with no notion of
 * columns. Rather than guess a layout for them, the app says so plainly and offers the two
 * things you can actually do. The event stays in storage until you delete it.
 */
export function LegacyEventScreen({
  event,
  onDelete,
  onBack,
}: {
  event: LegacyEvent
  onDelete: () => void
  onBack: () => void
}) {
  return (
    <div className="main-page">
      <div className="main-screen">
        <header className="intro">
          <p className="intro-set">{event.name}</p>
          <h1>This event cannot be opened</h1>
          <p className="subtitle">
            It was created by an older version of the app, before decks were built as columns
            on a table. Its pool cannot be read any more.
          </p>
          <div className="legacy-actions">
            <button type="button" onClick={onBack}>
              &larr; Back to events
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              Delete this event
            </button>
          </div>
        </header>
      </div>
      <Footer />
    </div>
  )
}
