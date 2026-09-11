import { useEffect, useMemo, useRef, useState } from 'react'
import cardsJson from './data/cards.json'
import { EventScreen } from './EventScreen'
import { MainScreen } from './MainScreen'
import { LegacyEventScreen } from './LegacyEventScreen'
import { generateEventPool, tally } from './packGenerator'
import { copyEventName, loadEvents, nextEventName, saveEvents } from './storage'
import { isLegacyEvent, type PoolCard, type SealedEvent, type StoredEvent } from './types'

const pool = cardsJson as PoolCard[]

const eventIdFromHash = (hash: string): string | null => {
  const match = /^#\/event\/(.+)$/.exec(hash)
  return match ? match[1] : null
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

export default function App() {
  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [])
  const [events, setEvents] = useState<StoredEvent[]>(loadEvents)
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  /**
   * The list as it is right now, which a callback held by a screen may not be. The build clock
   * banks its time as the event screen goes away, and that write used to arrive through a
   * closure holding the pre-delete list — resurrecting the event you had just deleted.
   */
  const latest = useRef(events)
  latest.current = events

  const persist = (next: StoredEvent[]) => {
    latest.current = next
    setEvents(next)
    saveEvents(next)
  }

  /** Writes an event back. An event that is no longer there is not brought back to life. */
  const updateEvent = (updated: SealedEvent) => {
    const events = latest.current
    if (!events.some((e) => e.id === updated.id)) return
    persist(events.map((e) => (e.id === updated.id ? updated : e)))
  }

  const navigate = (target: string) => {
    window.location.hash = target
    setHash(target)
  }

  const createEvent = () => {
    const event: SealedEvent = {
      schemaVersion: 2,
      id: newId(),
      name: nextEventName(events),
      createdAt: new Date().toISOString(),
      pool: tally(generateEventPool(pool)),
      columns: [],
      heroId: null,
    }
    persist([...events, event])
    navigate(`#/event/${event.id}`)
  }

  /**
   * The same event again, build and all: somewhere to try a variant without losing what you
   * have. The columns are copied rather than shared, so the two events cannot alias.
   */
  const duplicateEvent = (id: string) => {
    const source = events.find((e) => e.id === id)
    if (!source || isLegacyEvent(source)) return
    const event: SealedEvent = {
      ...source,
      id: newId(),
      name: copyEventName(source.name, events),
      createdAt: new Date().toISOString(),
      pool: { ...source.pool },
      columns: source.columns.map((column) => ({ ...column, cards: column.cards.map((c) => ({ ...c })) })),
    }
    persist([...events, event])
    navigate(`#/event/${event.id}`)
  }

  const openEventId = eventIdFromHash(hash)
  const openEvent = openEventId ? events.find((e) => e.id === openEventId) : undefined

  const remove = (id: string) => persist(events.filter((e) => e.id !== id))

  if (openEvent && isLegacyEvent(openEvent)) {
    return (
      <LegacyEventScreen
        event={openEvent}
        onDelete={() => {
          remove(openEvent.id)
          navigate('')
        }}
        onBack={() => navigate('')}
      />
    )
  }

  if (openEvent) {
    return (
      <EventScreen
        event={openEvent}
        byId={byId}
        onChange={updateEvent}
        onBack={() => navigate('')}
        onDuplicate={() => duplicateEvent(openEvent.id)}
        onDelete={() => {
          remove(openEvent.id)
          navigate('')
        }}
      />
    )
  }

  return (
    <MainScreen
      events={events}
      byId={byId}
      onCreate={createEvent}
      onOpen={(id) => navigate(`#/event/${id}`)}
      onDelete={remove}
    />
  )
}
