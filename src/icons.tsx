import { useState } from 'react'

/** The line icons used by the event list and the event menu. All 16x16, currentColor. */

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden focusable="false">
    {children}
  </svg>
)

export const TrashIcon = () => (
  <Icon>
    <path
      fill="currentColor"
      d="M6.5 1a.5.5 0 0 0-.5.5V2H3.5a.5.5 0 0 0 0 1H4v9.5A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5V3h.5a.5.5 0 0 0 0-1H10v-.5a.5.5 0 0 0-.5-.5h-3ZM7 2h2v.5H7V2ZM5 3h6v9.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5V3Zm1.5 1.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"
    />
  </Icon>
)

/** Two sheets: a second run at the same pool. */
export const CopyIcon = () => (
  <Icon>
    <path
      fill="currentColor"
      d="M5.5 1A1.5 1.5 0 0 0 4 2.5V3h-.5A1.5 1.5 0 0 0 2 4.5v9A1.5 1.5 0 0 0 3.5 15h7a1.5 1.5 0 0 0 1.5-1.5V13h.5a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 1h-7ZM11 13v.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H4v7.5A1.5 1.5 0 0 0 5.5 13H11Zm2-1.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v9Z"
    />
  </Icon>
)

/**
 * Fabrary's own mark, from their site, since the deck list is copied in their import format.
 * Loaded rather than inlined — the app already leans on their CDN for every card image — and
 * it falls back to a plain export glyph if it does not arrive.
 */
export const FabraryIcon = () => {
  const [failed, setFailed] = useState(false)
  if (failed) return <ExportIcon />
  return (
    <img
      className="icon-img"
      src="https://fabrary.net/favicon.png"
      alt=""
      width="15"
      height="15"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

/** A list leaving the page: the deck copied out to somewhere you can play it. */
export const ExportIcon = () => (
  <Icon>
    <path
      fill="currentColor"
      d="M2.5 2a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6Zm0 3a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4Zm0 3a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4Zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-6Zm9.15-6.35a.5.5 0 0 0-.7.7L12.29 6.5H8.5a.5.5 0 0 0 0 1h3.79l-1.34 1.15a.5.5 0 1 0 .65.76l2.25-1.93a.5.5 0 0 0 0-.76l-2.25-1.93a.5.5 0 0 0-.05-.04Z"
    />
  </Icon>
)

export const BurgerIcon = () => (
  <Icon>
    <path
      fill="currentColor"
      d="M2 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.25Zm0 3.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm.75 3a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z"
    />
  </Icon>
)
