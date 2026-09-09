import { describe, expect, it } from 'vitest'
import { nextEventName } from './storage'
import type { SealedEvent } from './types'

const named = (...names: string[]): SealedEvent[] =>
  names.map((name, i) => ({ id: `${i}`, name, createdAt: '', cards: [] }))

describe('nextEventName', () => {
  it('starts at Event 1', () => {
    expect(nextEventName([])).toBe('Event 1')
  })

  it('continues past the highest existing number, whatever the order', () => {
    expect(nextEventName(named('Event 1', 'Event 2'))).toBe('Event 3')
    expect(nextEventName(named('Event 7', 'Event 2'))).toBe('Event 8')
  })

  it('ignores renamed events', () => {
    expect(nextEventName(named('Locals warmup', 'Event 4', 'Event 4 practice'))).toBe('Event 5')
  })
})
