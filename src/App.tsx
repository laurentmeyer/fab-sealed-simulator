import { useEffect, useMemo, useState } from 'react'
import cardsJson from './data/cards.json'
import { EventScreen } from './EventScreen'
import { MainScreen } from './MainScreen'
import { generateEventPool } from './packGenerator'
import { loadEvents, nextEventName, saveEvents } from './storage'
import type { PoolCard, SealedEvent } from './types'

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
  const [events, setEvents] = useState<SealedEvent[]>(loadEvents)
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const persist = (next: SealedEvent[]) => {
    setEvents(next)
    saveEvents(next)
  }

  const navigate = (target: string) => {
    window.location.hash = target
    setHash(target)
  }

  const createEvent = () => {
    const event: SealedEvent = {
      id: newId(),
      name: nextEventName(events),
      createdAt: new Date().toISOString(),
      cards: generateEventPool(pool),
      heroId: null,
    }
    persist([...events, event])
    navigate(`#/event/${event.id}`)
  }

  const openEventId = eventIdFromHash(hash)
  const openEvent = openEventId ? events.find((e) => e.id === openEventId) : undefined

  if (openEvent) {
    return (
      <EventScreen
        event={openEvent}
        byId={byId}
        onChange={(updated) => persist(events.map((e) => (e.id === updated.id ? updated : e)))}
        onBack={() => navigate('')}
      />
    )
  }

  return (
    <MainScreen
      events={events}
      byId={byId}
      onCreate={createEvent}
      onOpen={(id) => navigate(`#/event/${id}`)}
      onDelete={(id) => persist(events.filter((e) => e.id !== id))}
    />
  )
}
