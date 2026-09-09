import type { SealedEvent } from './types'

const KEY = 'fab-sealed-events'

/** Default names are "Event 1", "Event 2", ... Renamed events do not hold the counter back. */
export const nextEventName = (events: SealedEvent[]): string => {
  const highest = events.reduce((max, event) => {
    const match = /^Event (\d+)$/.exec(event.name.trim())
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `Event ${highest + 1}`
}

export const loadEvents = (): SealedEvent[] => {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SealedEvent[]) : []
  } catch {
    return []
  }
}

export const saveEvents = (events: SealedEvent[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    // A full or unavailable localStorage should not take the app down mid-deckbuild.
  }
}
