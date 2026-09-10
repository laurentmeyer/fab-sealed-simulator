import { TIMER_RED_SECONDS } from './packConfig'
import type { EventTimer } from './types'

/**
 * How long you have been building. A sealed event gives you a fixed window, and building in
 * twenty minutes is a different exercise from building at leisure — which is most of what
 * there is to simulate once the packs are open.
 *
 * It counts up rather than down, and nothing happens when the window closes: the colour of the
 * clock is the whole of the pressure. This simulates a sealed event, it does not referee one.
 *
 * It runs whenever the event is open — opening one puts you back on the clock — and stopping
 * it lasts only as long as you stay on the screen.
 */

export const NEW_TIMER: EventTimer = { spent: 0 }

export const secondsSince = (start: Date, now: Date): number =>
  Math.max(0, (now.getTime() - start.getTime()) / 1000)

/** What the clock reads: what was banked, plus the run in progress. */
export const elapsedOf = (timer: EventTimer, startedAt: Date | null, now: Date): number =>
  timer.spent + (startedAt ? secondsSince(startedAt, now) : 0)

/** Puts the current run into the bank, so the clock can be stopped or rebased on it. */
export const bank = (timer: EventTimer, startedAt: Date | null, now: Date): EventTimer => ({
  ...timer,
  spent: elapsedOf(timer, startedAt, now),
})

/** 0 at the start of the build, 1 once the clock has gone as red as it goes. */
export const timerRamp = (seconds: number): number =>
  Math.min(1, Math.max(0, seconds / TIMER_RED_SECONDS))

/**
 * Green through yellow and orange to red, held at red afterwards. Hue alone carries it: 140°
 * is green and 0° is red, and the path between them runs the right way round the wheel.
 */
export const timerColour = (seconds: number): string =>
  `hsl(${Math.round(140 * (1 - timerRamp(seconds)))}, 70%, 55%)`

/** "0:07", "19:07", or "1:02:30" once there is an hour to show. */
export const formatTime = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds))
  const parts = [Math.floor(whole / 60) % 60, whole % 60]
  if (whole >= 3600) parts.unshift(Math.floor(whole / 3600))
  return parts.map((n, i) => (i ? String(n).padStart(2, '0') : String(n))).join(':')
}
