import { useMemo, useState } from 'react'
import { CardPreview } from './CardPreview'
import { CARD_SIZE_CLASS, CardSizeToggle, type CardSize } from './CardSizeToggle'
import { CardStackView } from './CardStackView'
import { exportDeck } from './deckExport'
import { Footer } from './Footer'
import {
  deckIssues,
  fixedStack,
  groupCards,
  partitionByHero,
  pitchSplit,
  toStacks,
  unplayableGroup,
  type CardGroup,
} from './grouping'
import { HeroSelector } from './HeroSelector'
import { heroKitFor, youngHeroes } from './heroes'
import { DECK_SIZE } from './packConfig'
import { countsTowardDeck, isDrawable } from './packGenerator'
import type { CardInstance, Grouping, PoolCard, SealedEvent } from './types'

const GROUPINGS: { value: Grouping; label: string }[] = [
  { value: 'rarity', label: 'Rarity' },
  { value: 'class', label: 'Class' },
  { value: 'pitch', label: 'Pitch' },
]

const PITCH_BAR = [
  { pitch: 1, className: 'bar-red', label: 'red' },
  { pitch: 2, className: 'bar-yellow', label: 'yellow' },
  { pitch: 3, className: 'bar-blue', label: 'blue' },
]

interface Hovered {
  card: PoolCard
  x: number
  y: number
}

/**
 * Exporting and deck legality share one control: the button says whether the deck is legal,
 * and names every reason it is not on hover. It always exports, legal or not.
 */
function ExportButton({
  issues,
  onClick,
}: {
  issues: string[]
  onClick: () => void
}) {
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

function Pane({
  title,
  subtitle,
  groups,
  controls,
  onToggle,
  onHover,
  onLeave,
  emptyText,
}: {
  title: string
  subtitle?: React.ReactNode
  groups: CardGroup[]
  controls?: React.ReactNode
  onToggle: (instance: CardInstance) => void
  onHover: (card: PoolCard, x: number, y: number) => void
  onLeave: () => void
  emptyText: string
}) {
  const isEmpty = groups.every((group) => group.count === 0)

  return (
    <section className="pane">
      <div className="pane-header">
        <h2 className="pane-title">{title}</h2>
        {subtitle}
        {controls}
      </div>
      <div className="pane-body">
        {isEmpty && <p className="empty">{emptyText}</p>}
        {groups.map((group) => (
          <div key={group.key} className={group.dimmed ? 'group dimmed' : 'group'}>
            {group.label && (
              <div className="group-separator">
                <span className="group-label">{group.label}</span>
                <span className={`group-count ${group.tone ?? ''}`}>
                  {group.countLabel ?? group.count}
                </span>
                <span className="group-rule" />
              </div>
            )}
            <div className="group-cards">
              {group.stacks.map((stack) => (
                <CardStackView
                  key={stack.card.id}
                  stack={stack}
                  onClick={() => onToggle(stack.instances[0])}
                  onHover={onHover}
                  onLeave={onLeave}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
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
  const [grouping, setGrouping] = useState<Grouping>('rarity')
  const [cardSize, setCardSize] = useState<CardSize>('small')
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hoveredPitch, setHoveredPitch] = useState<number | null>(null)

  const inData = useMemo(() => event.cards.filter((c) => byId.has(c.cardId)), [event.cards, byId])
  // Basic cards used to sit in the pool as singletons and now come with the hero, so events
  // saved before that change can still hold them. Drop them rather than showing them twice.
  const known = useMemo(
    () => inData.filter((c) => isDrawable(byId.get(c.cardId)!)),
    [inData, byId],
  )

  const allCards = useMemo(() => [...byId.values()], [byId])
  const heroes = useMemo(() => youngHeroes(allCards), [allCards])
  const hero = event.heroId ? (byId.get(event.heroId) ?? null) : null
  const heroKey = hero?.hero ?? null
  // The hero's weapon and class Arms equipment, which come with it rather than from a pack.
  const heroKit = useMemo(() => (hero ? heroKitFor(hero, allCards) : []), [hero, allCards])

  const poolGroups = useMemo(() => {
    const { playable, unplayable } = partitionByHero(
      known.filter((c) => !c.selected),
      byId,
      heroKey,
    )
    return [
      ...groupCards(playable, byId, grouping),
      ...unplayableGroup(unplayable, byId, hero?.name ?? ''),
    ]
  }, [known, byId, heroKey, hero, grouping])

  // The right pane splits what you have chosen into what sits in the arena and what is
  // actually the deck, so the deck section carries the only count that matters.
  const selectedGroups = useMemo(() => {
    const { playable, unplayable } = partitionByHero(known.filter((c) => c.selected), byId, heroKey)

    // Everything in the arena comes with the kit; nothing there is opened or clicked.
    const arenaStacks = hero ? [fixedStack(hero), ...heroKit.map(fixedStack)] : []
    const deckInstances = playable.filter((i) => countsTowardDeck(byId.get(i.cardId)!))

    return [
      ...(arenaStacks.length
        ? [
            {
              key: 'arena',
              label: 'Arena',
              stacks: arenaStacks,
              count: arenaStacks.reduce((sum, s) => sum + s.instances.length, 0),
            },
          ]
        : []),
      {
        key: 'deck',
        label: 'Deck',
        stacks: toStacks(deckInstances, byId),
        count: deckInstances.length,
        countLabel: `${deckInstances.length} / ${DECK_SIZE}`,
        tone: deckInstances.length >= DECK_SIZE ? ('ok' as const) : ('warn' as const),
      },
      ...unplayableGroup(unplayable, byId, hero?.name ?? ''),
    ]
  }, [known, byId, heroKey, hero, heroKit])

  const split = pitchSplit(event.cards, byId, heroKey)
  const splitTotal = split.reduce((sum, s) => sum + s.count, 0)
  const issues = deckIssues(event.cards, byId, hero)

  const toggle = (instance: CardInstance) =>
    onChange({
      ...event,
      cards: event.cards.map((c) =>
        c.instanceId === instance.instanceId ? { ...c, selected: !c.selected } : c,
      ),
    })

  const commitName = () => {
    const name = (draftName ?? '').trim()
    if (name) onChange({ ...event, name })
    setDraftName(null)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(exportDeck(event.name, event.cards, byId, hero))
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
          {inData.length < event.cards.length && (
            <span className="warning" title="They are no longer part of the card pool.">
              {event.cards.length - inData.length} cards no longer in the card data
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

        <div className="menu-right" />
      </div>

      <div className={`panes ${CARD_SIZE_CLASS[cardSize]}`}>
        <Pane
          title="Card pool"
          subtitle={
            hero && (
              <span className="pane-subtitle">
                legal cards for {hero.name} &mdash;{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => onChange({ ...event, heroId: null })}
                >
                  clear
                </button>
              </span>
            )
          }
          groups={poolGroups}
          controls={
            <div className="pane-controls">
              <label className="control-label">
                Group by{' '}
                <select value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}>
                  {GROUPINGS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <CardSizeToggle size={cardSize} onChange={setCardSize} />
            </div>
          }
          onToggle={toggle}
          onHover={(card, x, y) => setHovered({ card, x, y })}
          onLeave={() => setHovered(null)}
          emptyText="Every card is in the deck."
        />
        <Pane
          title="Selected cards"
          groups={selectedGroups}
          controls={
            <div className="pane-controls">
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
          }
          onToggle={toggle}
          onHover={(card, x, y) => setHovered({ card, x, y })}
          onLeave={() => setHovered(null)}
          emptyText="Click cards on the left to add them."
        />
      </div>

      <Footer />

      {hovered && <CardPreview card={hovered.card} x={hovered.x} y={hovered.y} />}
      {copied && <div className="toast" role="status">List copied to clipboard</div>}
    </div>
  )
}
