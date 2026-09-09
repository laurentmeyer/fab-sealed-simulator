import { Footer } from './Footer'
import type { PoolCard, SealedEvent } from './types'

const SET_IMAGE = 'https://content.fabrary.net/sets/usurp-the-shadow-throne.webp'

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden focusable="false">
    <path
      fill="currentColor"
      d="M6.5 1a.5.5 0 0 0-.5.5V2H3.5a.5.5 0 0 0 0 1H4v9.5A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5V3h.5a.5.5 0 0 0 0-1H10v-.5a.5.5 0 0 0-.5-.5h-3ZM7 2h2v.5H7V2ZM5 3h6v9.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5V3Zm1.5 1.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"
    />
  </svg>
)

export function MainScreen({
  events,
  byId,
  onCreate,
  onOpen,
  onDelete,
}: {
  events: SealedEvent[]
  byId: Map<string, PoolCard>
  onCreate: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const heroOf = (event: SealedEvent) => (event.heroId ? byId.get(event.heroId) : null) ?? null

  const remove = (event: SealedEvent) => {
    if (window.confirm(`Delete "${event.name}"? This cannot be undone.`)) onDelete(event.id)
  }

  return (
    <div className="main-page">
      <div className="banner">
        <img className="banner-art" src={SET_IMAGE} alt="" aria-hidden />
      </div>

      <div className="main-screen">
        <header className="intro">
          <p className="intro-set">Usurp the Shadow Throne</p>
          <h1>Sealed Simulator</h1>
          <p className="subtitle">Open 8 packs, build 30 cards, sleeve up.</p>
          <button type="button" className="primary" onClick={onCreate}>
            New sealed event
          </button>
        </header>

        {sorted.length === 0 ? (
          <p className="empty">No events yet. Crack some packs.</p>
        ) : (
          <>
            <h2 className="list-heading">Past sealed events:</h2>
            <ul className="event-list">
              {sorted.map((event) => {
                const hero = heroOf(event)
                return (
                  <li key={event.id}>
                    <button type="button" className="event-open" onClick={() => onOpen(event.id)}>
                      <span className="event-name">
                        {event.name}
                        {hero && <span className="event-hero"> &ndash; {hero.name}</span>}
                      </span>
                      <span className="event-meta">
                        {new Date(event.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="event-delete"
                      title={`Delete ${event.name}`}
                      aria-label={`Delete ${event.name}`}
                      onClick={() => remove(event)}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
