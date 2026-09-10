import { Footer } from './Footer'
import { HeroPortrait } from './HeroPortrait'
import { TrashIcon } from './icons'
import { isLegacyEvent, type PoolCard, type StoredEvent } from './types'

const SET_IMAGE = 'https://content.fabrary.net/sets/usurp-the-shadow-throne.webp'

export function MainScreen({
  events,
  byId,
  onCreate,
  onOpen,
  onDelete,
}: {
  events: StoredEvent[]
  byId: Map<string, PoolCard>
  onCreate: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const heroOf = (event: StoredEvent) => (event.heroId ? byId.get(event.heroId) : null) ?? null

  const remove = (event: StoredEvent) => {
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
          <p className="subtitle">Open 8 packs, build a deck, and test online!</p>
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
                const outdated = isLegacyEvent(event)
                return (
                  <li key={event.id} className={outdated ? 'outdated' : undefined}>
                    <button type="button" className="event-open" onClick={() => onOpen(event.id)}>
                      <span
                        className={hero ? 'event-portrait' : 'event-portrait none'}
                        aria-hidden={!hero}
                      >
                        {hero && <HeroPortrait hero={hero} />}
                      </span>
                      <span className="event-name">
                        {event.name}
                        {hero && <span className="event-hero"> &ndash; {hero.name}</span>}
                        {outdated && (
                          <span className="event-tag" title="Saved by an older version of the app">
                            outdated
                          </span>
                        )}
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
