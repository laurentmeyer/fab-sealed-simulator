import { describe, expect, it } from 'vitest'
import { nextEventName } from './storage'
import type { StoredEvent } from './types'

const named = (...names: string[]): StoredEvent[] =>
  names.map((name, i) => ({ schemaVersion: 2, id: `${i}`, name, createdAt: '', pool: {}, columns: [] }))

describe('nextEventName', () => {
  it('starts at Sealed event 1', () => {
    expect(nextEventName([])).toBe('Sealed event 1')
  })

  it('continues past the highest existing number, whatever the order', () => {
    expect(nextEventName(named('Sealed event 1', 'Sealed event 2'))).toBe('Sealed event 3')
    expect(nextEventName(named('Sealed event 7', 'Sealed event 2'))).toBe('Sealed event 8')
  })

  it('counts the bare "Event N" that earlier versions handed out', () => {
    expect(nextEventName(named('Event 4'))).toBe('Sealed event 5')
    expect(nextEventName(named('Event 2', 'Sealed event 3'))).toBe('Sealed event 4')
  })

  it('ignores renamed events', () => {
    expect(nextEventName(named('Locals warmup', 'Sealed event 4', 'Sealed event 4 practice'))).toBe(
      'Sealed event 5',
    )
  })
})
