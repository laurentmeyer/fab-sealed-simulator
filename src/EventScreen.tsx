import { useMemo, useState } from 'react'
import { deselectCard, remainingPool, selectCard, selectedEntries } from './columns'
import { deckCount, deckIssues, legalPoolCount, pitchSplit } from './deck'
import { exportDeck } from './deckExport'
import { type Filter } from './filters'
import { Footer } from './Footer'
import { HeroSelector } from './HeroSelector'
import { heroKitFor, youngHeroes } from './heroes'
import { DECK_SIZE } from './packConfig'
import { Table } from './Table'
import { Toolbar } from './Toolbar'
import type { DeckColumn, PoolCard, SealedEvent, SortMode } from './types'

const PITCH_BAR = [
  { pitch: 1, className: 'bar-red', label: 'red' },
  { pitch: 2, className: 'bar-yellow', label: 'yellow' },
  { pitch: 3, className: 'bar-blue', label: 'blue' },
]

/**
 * Exporting and deck legality share one control: the button says whether the deck is legal,
 * and names every reason it is not on hover. It always exports, legal or not.
 */
function ExportButton({ issues, onClick }: { issues: string[]; onClick: () => void }) {
  const legal = issues.length === 0
  return (
    <button
      type="button"
      className={legal ? 'export-button' : 'export-button has-issues'}
      onClick={onClick}
      title={legal ? 'Legal deck — copy the list in Fabrary import format' : undefined}
    >
      <span className={legal ? 'export-status ok' : 'export-status warn'} aria-hidden>
        {legal ? '✓' : '⚠'}
      </span>
      Export for Fabrary
      {!legal && (
        <span className="issue-popup">
          <span className="issue-title">
            {issues.length} thing{issues.length > 1 ? 's' : ''} to fix before this deck is legal
          </span>
          <ul className="issue-list">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </span>
      )}
    </button>
  )
}

export function EventScreen({
  event,
  byId,
  onChange,
  onBack,
}: {
  event: SealedEvent
  byId: Map<string, PoolCard>
  onChange: (event: SealedEvent) => void
  onBack: () => void
}) {
  const [sort, setSort] = useState<SortMode>('rarity')
  const [draftName, setDraftName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hoveredPitch, setHoveredPitch] = useState<number | null>(null)

  const allCards = useMemo(() => [...byId.values()], [byId])
  const heroes = useMemo(() => youngHeroes(allCards), [allCards])
  const hero = event.heroId ? (byId.get(event.heroId) ?? null) : null
  // The hero's weapon and equipment, which come with it rather than from a pack.
  const kit = useMemo(() => (hero ? heroKitFor(hero, allCards) : []), [hero, allCards])

  const filter: Filter = { heroKey: hero?.hero ?? null }

  const entries = useMemo(() => selectedEntries(event.columns), [event.columns])
  const remaining = useMemo(
    () => remainingPool(event.pool, event.columns),
    [event.pool, event.columns],
  )
  const missing = Object.keys(event.pool).filter((id) => !byId.has(id)).length

  const count = deckCount(entries, byId, filter)
  const split = pitchSplit(entries, byId, filter)
  const splitTotal = split.reduce((sum, s) => sum + s.count, 0)
  const issues = deckIssues(entries, byId, hero)

  const setColumns = (columns: DeckColumn[]) => onChange({ ...event, columns })
  const pitchOf = (cardId: string) => byId.get(cardId)?.pitch ?? null
  const select = (cardId: string) =>
    setColumns(selectCard(event.columns, cardId, pitchOf, { limit: event.pool[cardId] }))
  const deselect = (cardId: string) => setColumns(deselectCard(event.columns, cardId))

  const commitName = () => {
    const name = (draftName ?? '').trim()
    if (name) onChange({ ...event, name })
    setDraftName(null)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(exportDeck(event.name, entries, byId, hero))
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
          <span
            className={count >= DECK_SIZE ? 'deck-count ok' : 'deck-count warn'}
            title="Cards in your deck; the hero, the arena and off-hero cards do not count"
          >
            {count} / {DECK_SIZE}
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
          <ExportButton issues={issues} onClick={copy} />
        </div>
      </div>

      <Toolbar
        sort={sort}
        onSort={setSort}
        hero={hero?.name ?? null}
        legal={legalPoolCount(event.pool, byId, filter)}
        onClearHero={() => onChange({ ...event, heroId: null })}
      />

      <Table
        columns={event.columns}
        pool={event.pool}
        remaining={remaining}
        byId={byId}
        filter={filter}
        sort={sort}
        hero={hero}
        kit={kit}
        onColumnsChange={setColumns}
        onSelect={select}
        onDeselect={deselect}
      />

      <Footer />

      {copied && (
        <div className="toast" role="status">
          List copied to clipboard
        </div>
      )}
    </div>
  )
}
