import { describe, expect, it } from 'vitest'
import { BUILD_SECONDS, TIMER_RED_SECONDS } from './packConfig'
import { bank, elapsedOf, formatTime, NEW_TIMER, secondsSince, timerColour, timerRamp } from './timer'

const at = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, seconds))
const hueOf = (colour: string) => Number(/hsl\((\d+)/.exec(colour)![1])

describe('the clock', () => {
  it('starts at nothing and counts up from when the screen opened', () => {
    expect(elapsedOf(NEW_TIMER, at(0), at(0))).toBe(0)
    expect(elapsedOf(NEW_TIMER, at(0), at(90))).toBe(90)
  })

  it('stands still while the run is stopped', () => {
    const timer = { spent: 120 }
    expect(elapsedOf(timer, null, at(0))).toBe(120)
    expect(elapsedOf(timer, null, at(600))).toBe(120)
  })

  it('adds the run in progress to what was banked earlier', () => {
    expect(elapsedOf({ spent: 300 }, at(0), at(45))).toBe(345)
  })
})

describe('banking', () => {
  it('folds the run into the total', () => {
    expect(bank(NEW_TIMER, at(0), at(75))).toEqual({ spent: 75 })
    expect(bank({ spent: 100 }, at(0), at(75))).toEqual({ spent: 175 })
  })

  /** Banking rebases the run, so the same seconds must never be added twice. */
  it('never double-counts across repeated banking', () => {
    let timer = NEW_TIMER
    let from = at(0)
    for (const moment of [10, 25, 25, 60, 300]) {
      timer = bank(timer, from, at(moment))
      from = at(moment)
    }
    expect(timer.spent).toBe(300)
  })

  it('is a no-op when the clock is stopped', () => {
    expect(bank({ spent: 42 }, null, at(600))).toEqual({ spent: 42 })
  })
})

describe('the colour ramp', () => {
  it('runs green at the start to red once the build has overrun', () => {
    expect(hueOf(timerColour(0))).toBe(140)
    expect(hueOf(timerColour(TIMER_RED_SECONDS))).toBe(0)
  })

  it('stays red rather than wrapping back round the wheel', () => {
    expect(hueOf(timerColour(TIMER_RED_SECONDS * 3))).toBe(0)
    expect(timerRamp(TIMER_RED_SECONDS * 10)).toBe(1)
  })

  it('darkens the whole way, never brightening again', () => {
    let last = 141
    for (let s = 0; s <= TIMER_RED_SECONDS; s += 30) {
      const hue = hueOf(timerColour(s))
      expect(hue).toBeLessThanOrEqual(last)
      last = hue
    }
  })

  /** The window is 20 minutes and red is five past it, so the window ends amber-orange. */
  it('is still short of red when the build window closes', () => {
    const hue = hueOf(timerColour(BUILD_SECONDS))
    expect(hue).toBeGreaterThan(0)
    expect(hue).toBeLessThan(40)
  })
})

describe('secondsSince', () => {
  it('never runs backwards, whatever the clock does', () => {
    expect(secondsSince(at(10), at(70))).toBe(60)
    expect(secondsSince(at(70), at(10))).toBe(0)
  })
})

describe('formatTime', () => {
  it('reads as minutes and seconds, and adds hours only when there are some', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(7)).toBe('0:07')
    expect(formatTime(BUILD_SECONDS)).toBe('20:00')
    expect(formatTime(3750)).toBe('1:02:30')
  })

  it('never shows a negative clock', () => {
    expect(formatTime(-5)).toBe('0:00')
  })
})
