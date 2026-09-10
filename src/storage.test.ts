import { describe, expect, it } from 'vitest'
import { copyEventName, nextEventName } from './storage'
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

describe('copyEventName', () => {
  it('suffixes the name it was given', () => {
    expect(copyEventName('Sealed event 1', named('Sealed event 1'))).toBe('Sealed event 1 (Copy)')
  })

  it('numbers the suffix once the plain one is taken', () => {
    const events = named('Sealed event 1', 'Sealed event 1 (Copy)')
    expect(copyEventName('Sealed event 1', events)).toBe('Sealed event 1 (Copy 2)')
    expect(copyEventName('Sealed event 1', [...events, ...named('Sealed event 1 (Copy 2)')])).toBe(
      'Sealed event 1 (Copy 3)',
    )
  })

  it('takes the first number free, so renaming a copy frees its name again', () => {
    const events = named('Locals', 'Locals (Copy)', 'Locals (Copy 3)')
    expect(copyEventName('Locals', events)).toBe('Locals (Copy 2)')
  })

  /** Otherwise copying a copy of a copy would read "Locals (Copy) (Copy) (Copy)". */
  it('copies a copy without stacking the suffixes up', () => {
    const events = named('Locals', 'Locals (Copy)')
    expect(copyEventName('Locals (Copy)', events)).toBe('Locals (Copy 2)')
    expect(copyEventName('Locals (Copy 2)', [...events, ...named('Locals (Copy 2)')])).toBe(
      'Locals (Copy 3)',
    )
  })

  it('leaves a renamed event\'s own words alone', () => {
    expect(copyEventName('Copycat deck', [])).toBe('Copycat deck (Copy)')
  })
})
