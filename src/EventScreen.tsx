import { useEffect, useMemo, useRef, useState } from 'react'
import { CardOverlay, PreviewContext } from './CardOverlay'
import { deselectCard, remainingPool, selectCard, selectedEntries } from './columns'
import { deckCount, deckIssues, legalPoolCount, openedPool, pitchSplit } from './deck'
import { exportDeck } from './deckExport'
import { EventMenu } from './EventMenu'
import { type Filter } from './filters'
import { Footer } from './Footer'
import { HeroSelector } from './HeroSelector'
import { CardsIcon, ClockIcon } from './icons'
import { signatureWeaponFor, youngHeroes } from './heroes'
import { DECK_SIZE } from './packConfig'
import { isEquipment } from './packGenerator'
import { Table } from './Table'
import { Tip } from './Tip'
import { Toolbar } from './Toolbar'
import { dismissTip } from './storage'
import { bank, elapsedOf, formatTime, NEW_TIMER, timerColour } from './timer'
import type { DeckColumn, PoolCard, SealedEvent, SortMode } from './types'

/** Identifies the tip in storage; changing it would show the tip again to everyone. */
const LONG_PRESS_TIP = 'long-press'

const PITCH_BAR = [
  { pitch: 1, className: 'bar-red', label: 'red' },
  { pitch: 2, className: 'bar-yellow', label: 'yellow' },
  { pitch: 3, className: 'bar-blue', label: 'blue' },
]

/** How often the clock is written down, so a crash costs seconds rather than minutes. */
const BANK_MS = 15000

/**
 * How long this build has taken, at the head of the menu bar beside the deck count — the two
 * things worth keeping half an eye on. Clicking it stops the clock and clicking it again
 * carries on, the way you would put the cards down at a real event.
 */
function BuildClock({
  seconds,
  running,
  onToggle,
}: {
  seconds: number
  running: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={running ? 'build-clock' : 'build-clock paused'}
      style={{ color: timerColour(seconds) }}
      title={running ? 'Time spent building — click to stop the clock' : 'Stopped — click to carry on'}
      onClick={onToggle}
    >
      <ClockIcon />
      <span className="stat-value">{formatTime(seconds)}</span>
      {!running && <span className="stat-note">paused</span>}
    </button>
  )
}

export function EventScreen({
  event,
  byId,
  onChange,
  onBack,
  onDuplicate,
  onDelete,
}: {
  event: SealedEvent
  byId: Map<string, PoolCard>
  onChange: (event: SealedEvent) => void
  onBack: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [sort, setSort] = useState<SortMode>('rarity')
  const [preview, setPreview] = useState<PoolCard | null>(null)
  /*
   * Opening a card full size is the one thing on this screen nobody can discover alone, so a
   * tip says so once. Doing it retires the tip as surely as closing it does.
   */
  const [tipUsed, setTipUsed] = useState(false)
  const showPreview = (card: PoolCard | null) => {
    if (card) {
      dismissTip(LONG_PRESS_TIP)
      setTipUsed(true)
    }
    setPreview(card)
  }

  /*
   * The clock runs while this screen is open: what the event stores is the total banked so
   * far, and the run in progress is measured from when the screen opened. So nothing is
   * written every second, and time spent on another screen is not time spent building.
   */
  const timer = event.timer ?? NEW_TIMER
  // Opening the event puts you back on the clock: a stop lasts as long as you are looking.
  const [startedAt, setStartedAt] = useState<Date | null>(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const elapsed = elapsedOf(timer, startedAt, now)

  useEffect(() => {
    if (!startedAt) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  /*
   * Banking rebases the run on the moment it happened, so the same seconds are never counted
   * twice. It runs on a slow interval and again when the screen goes away, which is what makes
   * the total survive leaving the event, closing the tab, or a crash.
   */
  const commit = useRef(() => {})
  commit.current = () => {
    if (!startedAt) return
    const at = new Date()
    onChange({ ...event, timer: bank(timer, startedAt, at) })
    setStartedAt(at)
  }

  useEffect(() => {
    const id = window.setInterval(() => commit.current(), BANK_MS)
    const onHide = () => commit.current()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pagehide', onHide)
      commit.current()
    }
  }, [])

  const toggleTimer = () => {
    const at = new Date()
    setNow(at)
    if (startedAt) {
      onChange({ ...event, timer: bank(timer, startedAt, at) })
      setStartedAt(null)
    } else {
      setStartedAt(at)
    }
  }
  const [draftName, setDraftName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hoveredPitch, setHoveredPitch] = useState<number | null>(null)

  const allCards = useMemo(() => [...byId.values()], [byId])
  const heroes = useMemo(() => youngHeroes(allCards), [allCards])
  const hero = event.heroId ? (byId.get(event.heroId) ?? null) : null
  // The only thing put into play with the hero; the rest of the kit is yours to choose.
  const weapon = useMemo(() => (hero ? signatureWeaponFor(hero, allCards) : null), [hero, allCards])

  /*
   * Equipment is not deck material and never forms a pile, so it is held beside the columns.
   * The pool it comes from is what the packs dealt plus what the kit guarantees.
   */
  const arena = useMemo(() => event.arena ?? [], [event.arena])
  const worn = useMemo(
    () => arena.map((id) => byId.get(id)).filter((c): c is PoolCard => Boolean(c)),
    [arena, byId],
  )
  const pool = useMemo(() => openedPool(event.pool, allCards), [event.pool, allCards])

  const filter: Filter = { heroKey: hero?.hero ?? null }

  const entries = useMemo(() => selectedEntries(event.columns), [event.columns])
  /** Everything chosen, for legality: the piles and what is worn. */
  const chosen = useMemo(
    () => [...entries, ...arena.map((cardId) => ({ cardId, count: 1 }))],
    [entries, arena],
  )
  const remaining = useMemo(() => {
    const worn = new Set(arena)
    return remainingPool(pool, event.columns).filter((entry) => !worn.has(entry.cardId))
  }, [pool, event.columns, arena])
  const missing = Object.keys(event.pool).filter((id) => !byId.has(id)).length

  const count = deckCount(entries, byId, filter)
  const split = pitchSplit(entries, byId, filter)
  const splitTotal = split.reduce((sum, s) => sum + s.count, 0)
  const issues = deckIssues(chosen, byId, hero)

  const setColumns = (columns: DeckColumn[]) => onChange({ ...event, columns })
  const pitchOf = (cardId: string) => byId.get(cardId)?.pitch ?? null

  /** Equipment goes to the arena; everything else is deck material and joins a pile. */
  const select = (cardId: string) => {
    const card = byId.get(cardId)
    if (card && isEquipment(card)) {
      if (!arena.includes(cardId)) onChange({ ...event, arena: [...arena, cardId] })
      return
    }
    setColumns(selectCard(event.columns, cardId, pitchOf, { limit: pool[cardId] }))
  }
  const deselect = (cardId: string) => setColumns(deselectCard(event.columns, cardId))
  const unwear = (cardId: string) =>
    onChange({ ...event, arena: arena.filter((id) => id !== cardId) })

  const commitName = () => {
    const name = (draftName ?? '').trim()
    if (name) onChange({ ...event, name })
    setDraftName(null)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(exportDeck(event.name, entries, arena, byId, hero))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="event-screen">
      <div className="menu-bar">
        <div className="menu-left">
          <button type="button" onClick={onBack} title="Back to all events">
            &larr; Events
          </button>
          {missing > 0 && (
            <span className="warning" title="They are no longer part of the card pool.">
              {missing} cards no longer in the card data
            </span>
          )}
        </div>

        <div className="menu-center">
          {draftName === null ? (
            <button
              type="button"
              className="name-button"
              onClick={() => setDraftName(event.name)}
              title="Rename this event"
            >
              {event.name}
            </button>
          ) : (
            <span className="name-editor">
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName()
                  if (e.key === 'Escape') setDraftName(null)
                }}
              />
              <button type="button" onClick={commitName}>
                OK
              </button>
            </span>
          )}
          <HeroSelector
            heroes={heroes}
            cards={allCards}
            selectedId={event.heroId ?? null}
            onSelect={(heroId) => onChange({ ...event, heroId })}
          />
        </div>

        <div className="menu-right">
          <BuildClock seconds={elapsed} running={startedAt !== null} onToggle={toggleTimer} />
          <span
            className={count >= DECK_SIZE ? 'deck-count ok' : 'deck-count warn'}
            title="Cards in your deck; the hero, the arena and off-hero cards do not count"
          >
            <CardsIcon />
            <span className="stat-value">
              {count} / {DECK_SIZE}
            </span>
          </span>
          <span className="pitch-bar-wrap">
            <span className="pitch-bar" aria-label="Pitch split of the deck">
              {splitTotal === 0 ? (
                <span className="bar-empty" />
              ) : (
                split.map((s) => (
                  <span
                    key={s.pitch}
                    className={PITCH_BAR[s.pitch - 1].className}
                    style={{ flexGrow: s.count }}
                    onMouseEnter={() => setHoveredPitch(s.pitch)}
                    onMouseLeave={() => setHoveredPitch(null)}
                  />
                ))
              )}
            </span>
            {/* Outside the bar, which clips its own children to stay rounded. */}
            {hoveredPitch !== null && (
              <span className="bar-tip">
                {split[hoveredPitch - 1].count} {PITCH_BAR[hoveredPitch - 1].label} deck card
                {split[hoveredPitch - 1].count === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <EventMenu
            issues={issues}
            onExport={copy}
            onDuplicate={onDuplicate}
            onDelete={() => {
              if (window.confirm(`Delete "${event.name}"? This cannot be undone.`)) onDelete()
            }}
            onResetTimer={() => {
              setStartedAt(new Date())
              onChange({ ...event, timer: NEW_TIMER })
            }}
          />
        </div>
      </div>

      <Toolbar
        sort={sort}
        onSort={setSort}
        hero={hero?.name ?? null}
        legal={legalPoolCount(pool, byId, filter)}
        onClearHero={() => onChange({ ...event, heroId: null })}
      />

      <PreviewContext.Provider value={showPreview}>
        <Table
          columns={event.columns}
          pool={pool}
          remaining={remaining}
          arena={arena}
          byId={byId}
          filter={filter}
          sort={sort}
          hero={hero}
          weapon={weapon}
          worn={worn}
          onColumnsChange={setColumns}
          onArenaChange={(next) => onChange({ ...event, arena: next })}
          onSelect={select}
          onDeselect={deselect}
          onUnwear={unwear}
        />
      </PreviewContext.Provider>

      <Footer />

      <Tip id={LONG_PRESS_TIP} dismissed={tipUsed}>
        Hold any card down to see it full size.
      </Tip>
      {preview && <CardOverlay card={preview} onClose={() => setPreview(null)} />}
      {copied && (
        <div className="toast" role="status">
          List copied to clipboard
        </div>
      )}
    </div>
  )
}
