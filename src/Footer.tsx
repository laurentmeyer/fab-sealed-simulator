const REPO_URL = 'https://github.com/laurentmeyer/fab-sealed-simulator'

/** Shown on both screens: this is fan work, and LSS owns everything it is built on. */
export function Footer() {
  return (
    <footer className="site-footer">
      <span>
        Unofficial fan project, not affiliated with or endorsed by{' '}
        <a href="https://legendstory.com" target="_blank" rel="noreferrer">
          Legend Story Studios
        </a>
        . Flesh and Blood, card names and card images are their intellectual property.
      </span>
      <span className="footer-sep" aria-hidden>
        ·
      </span>
      <span>
        Card data and art from{' '}
        <a href="https://fabrary.net" target="_blank" rel="noreferrer">
          Fabrary
        </a>
      </span>
      <span className="footer-sep" aria-hidden>
        ·
      </span>
      <a href={REPO_URL} target="_blank" rel="noreferrer">
        Source on GitHub
      </a>
    </footer>
  )
}
