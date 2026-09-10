import type { StoredEvent } from './types'

const KEY = 'fab-sealed-events'

/**
 * Default names are "Sealed event 1", "Sealed event 2", ... Renamed events do not hold the
 * counter back. The bare "Event N" of earlier versions still counts, so renaming the default
 * does not start the numbering over on top of events you already have.
 */
export const nextEventName = (events: StoredEvent[]): string => {
  const highest = events.reduce((max, event) => {
    const match = /^(?:Sealed event|Event) (\d+)$/i.exec(event.name.trim())
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `Sealed event ${highest + 1}`
}

/**
 * Events of every schema are kept, including the ones this version cannot open: deleting
 * somebody's saved pool behind their back would be worse than telling them it is outdated.
 */
export const loadEvents = (): StoredEvent[] => {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as StoredEvent[]) : []
  } catch {
    return []
  }
}

export const saveEvents = (events: StoredEvent[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    // A full or unavailable localStorage should not take the app down mid-deckbuild.
  }
}
