# Implementation Plan — FaB Sealed Simulator (Usurp the Shadow Throne)

A front-end-only web app to simulate opening 8 booster packs of the Flesh and Blood set
**Usurp the Shadow Throne** (set code IAR) and building a 30-card sealed deck.
See `context.md` for the original requirements. This plan is the implementation spec.

## 1. Constraints & decisions already made

- **Stack**: React + TypeScript + Vite. Keep it simple and light: **no router library, no state
  library, no CSS framework** — plain `useState`/`useEffect`, a ~20-line hash router, one plain
  CSS file. Vitest for unit tests.
- **Persistence**: `localStorage` only. No backend.
- **Card pool**: strictly cards whose `legalFormats` includes `Format.Sealed`
  (user decision: do NOT include the set's Legendary/Fabled cards while the upstream data
  flags them as not sealed-legal — the generator must degrade gracefully, see §4).
- **Card data is incomplete** (pre-release set, ~153 sealed-legal cards today). The data
  pipeline must be re-runnable on demand when more cards are revealed (see §3). Never
  hard-code card counts.
- **Copy format**: Fabrary-compatible (see §7).
- **Card display**: images with a styled text-card fallback (see §8).
- **Supported classes only**: the whole pool is restricted to cards whose `classes` contain
  only supported values — Necromancer, Brute, Runeblade, Generic, NotClassed. Cards of any
  other class (e.g. Guardian) are excluded everywhere, including the "any class" slots
  (rare, rare-or-higher, foil-slot). Enforced once, at snapshot time (see §3).
- **Foils are not modeled at all**: no `foil` flag in storage, no visual treatment. The
  pack's foil slot still exists as a card slot (see §4), we just don't remember that the
  card was foil.
- **No Marvel rarity**: Marvel is a treatment tangential to real rarity (like foiling).
  The rarity ladder everywhere is Basic < Common < Rare < Majestic < Legendary < Fabled.
- **Physical packs contain 16 cards, but 2 are always removed** at sealed events (bonus cards
  for other classes / collectible cards). We do NOT simulate those 2 cards at all: the
  generator produces exactly the **14 playable cards** per pack described in §4.

## 2. Project structure

```
fab-sealed-simulator/
├── context.md, PLAN.md
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── scripts/
│   └── fetch-cards.mjs        # data snapshot script (Node, run manually)
├── src/
│   ├── data/
│   │   └── cards.json         # generated snapshot — committed to git
│   ├── types.ts               # PoolCard, CardInstance, SealedEvent, Grouping
│   ├── packConfig.ts          # ALL odds/constants in one place
│   ├── packGenerator.ts       # pure functions, unit-tested
│   ├── storage.ts             # localStorage read/write, event naming
│   ├── deckExport.ts          # Fabrary-format text export
│   ├── cardImage.ts           # image URL builder (single constant)
│   ├── App.tsx                # hash router: '' → MainScreen, '#/event/<id>' → EventScreen
│   ├── MainScreen.tsx
│   ├── EventScreen.tsx        # menu bar + two panes
│   ├── CardTile.tsx           # small card in a pane (image or text fallback)
│   ├── CardPreview.tsx        # enlarged hover view
│   ├── main.tsx
│   └── styles.css
└── src/*.test.ts              # vitest tests colocated with the modules
```

Dependencies: `react`, `react-dom`; dev: `vite`, `@vitejs/plugin-react`, `typescript`,
`vitest`, `@flesh-and-blood/cards`, `@flesh-and-blood/types` (dev-only: used by the fetch
script, never bundled into the app).

## 3. Data pipeline — `scripts/fetch-cards.mjs`

The app never parses fabrary's 13k-line TS file at runtime. A Node script snapshots the data
into a lean `src/data/cards.json` that is imported statically.

- Source: the npm package `@flesh-and-blood/cards` (published from
  https://github.com/fabrary/cards). It exports the full card array; `@flesh-and-blood/types`
  provides the enums (`Format`, `Rarity`, `Class`, `Release`, `Type`). Check the package's
  exports — there may be a `latest-set` subpath export matching
  `packages/cards/latest-set/index.ts`; otherwise filter the full list by
  `card.sets.includes(Release.UsurpTheShadowThrone)`.
- Filter: keep cards where `legalFormats.includes(Format.Sealed)` AND every entry of
  `classes` is one of Necromancer, Brute, Runeblade, Generic, NotClassed (define
  `SUPPORTED_CLASSES` in the script; print any excluded card so surprises are visible).
- Emit one JSON entry per card:

```ts
interface PoolCard {
  id: string;          // cardIdentifier, e.g. "acrid-stench-red"
  name: string;        // "Acrid Stench"
  pitch: number | null;    // 1 | 2 | 3 | null (equipment has none)
  cost: number | null;
  power: number | null;
  defense: number | null;
  rarity: "Basic" | "Common" | "Rare" | "Majestic" | "Legendary" | "Fabled";
  classes: string[];   // e.g. ["Necromancer"], ["Generic"], ["NotClassed"]
  types: string[];     // e.g. ["Action"], ["Equipment"]
  typeText: string;    // "Shadow Necromancer Action - Attack"
  image: string;       // IAR print image id from the IAR printing, e.g. "IAR069"
}
```

  For `image`, pick the printing whose `set` is `Release.UsurpTheShadowThrone` and which has
  no `foiling` (the non-foil print); fall back to `defaultImage`.
- npm script: `"fetch-cards": "node scripts/fetch-cards.mjs"`.
- **Update procedure when new cards are revealed** (document this in a comment at the top of
  the script): `npm update @flesh-and-blood/cards @flesh-and-blood/types && npm run
  fetch-cards`, commit the regenerated `cards.json`. Existing saved events are unaffected
  (they store card ids; a card id missing from the new snapshot should render as a text card
  with just its id — don't crash).

Current pool snapshot for sanity-checking (WILL grow as cards are revealed): 153 sealed-legal
cards — 73 Common, 49 Rare, 19 Majestic, 12 Basic; 6 Equipment. The script should print a
summary table (count per rarity, per class, equipment count) so regressions are visible.

## 4. Pack generation — `packGenerator.ts` + `packConfig.ts`

An event's pool = 8 packs × 14 cards, plus fixed singletons, minus merged Basics (see
below):

```ts
interface CardInstance {
  instanceId: string;  // crypto.randomUUID()
  cardId: string;      // PoolCard.id
  selected: boolean;
}
```

All draws are uniform **with replacement** within their category (duplicates across and
within packs are normal in sealed). All probabilities live in `packConfig.ts` as named
constants so they can be tuned in one place.

Per pack, generate exactly these slots:

1. **1 Equipment** — uniform among sealed-legal cards with `types` including `Equipment`.
2. **1 Rare** — uniform among Rare cards (any class).
3. **1 Rare-or-higher** — roll rarity first:
   - Fabled: 1/200
   - Legendary: 1/80
   - Majestic: 1/4
   - otherwise Rare (p = 1 − 1/200 − 1/80 − 1/4 = 0.7325)
   Then uniform among cards of that rarity. **Fallback**: if the rolled rarity has zero cards
   in the pool (true today for Fabled/Legendary), step down the rarity ladder
   (Fabled → Legendary → Majestic → Rare) until a non-empty rarity is found.
   This keeps the generator correct now and automatically activates the top rarities when
   the upstream data marks them sealed-legal.
4. **1 Foil-slot card** — Rare with p = 0.0175, otherwise Common; uniform within the rarity
   (commons here include both class and generic commons). The physical card is foil, but we
   don't model foiling: it's stored and displayed as a normal card.
5. **10 Commons**:
   - Roll classCount = 6 or 7 (50/50). genericCount = 10 − classCount.
   - **Class commons** (classCount): split as evenly as possible among Necromancer, Brute,
     Runeblade — each gets ⌊classCount/3⌋, and the remainder (0/1/2) goes to distinct classes
     chosen at random. Each card drawn uniform among Common cards of that class.
   - **Generic commons** (genericCount): uniform among Common cards whose `classes` is
     `["Generic"]` or `["NotClassed"]`.

Why these numbers — they reproduce the per-pack averages in `context.md`:
Rare = 1 + 0.7325 + 0.0175 = **1.75** ✓; Common = 10 + 0.9825 ≈ **11** ✓;
Majestic = **1/4** ✓; Legendary = **1/80** ✓; Fabled = **1/200** ✓ (the last two once the
data includes such cards).

**Fixed singletons & Basic merging.** Every event's pool gets **exactly one instance of
each Basic-rarity sealed-legal card** (today 12: 3 young heroes, 3 weapons, 3 token-style
cards, 3 class equipment). Derive this set from the data (`rarity === "Basic"`), never from
a hard-coded list, so it grows with data updates. Basic cards are strictly singletons: the
equipment slot CAN roll a Basic equipment, but a pack-drawn Basic **merges** into the
existing singleton (the drawn instance is discarded), so the pack contribution can be fewer
than 8 × 14 = 112 instances. Implementation: generate the 8 packs normally, drop every
pack-drawn instance whose card is Basic rarity, then append one singleton instance per
Basic card. Total pool size = 112 − (Basic draws) + (number of Basic cards).

Expose pure functions `generatePack(pool: PoolCard[], rng?: () => number): CardInstance[]`
and `generateEventPool(pool): CardInstance[]` (8 packs with Basic merging + the fixed
singletons, flattened). Accepting an injectable `rng` (default `Math.random`) makes tests
deterministic.

**Deck-count rule.** Heroes, weapons, equipment, and tokens are technically not part of the
30-card deck. A card counts toward the deck iff its types don't include Equipment AND its
rarity is not Basic. Implement as a helper `countsTowardDeck(card: PoolCard): boolean` in
`packGenerator.ts` (or `types.ts`) and use it everywhere the count is shown or exported —
never duplicate the classification logic.

**Tests** (`packGenerator.test.ts`):
- A pack has exactly 14 cards before Basic merging; exactly 1 equipment slot.
- `generateEventPool` yields exactly one instance of every Basic card, zero pack-drawn Basic
  duplicates, and 112 − (Basic draws) non-Basic pack cards, all unselected.
- With a seeded rng forcing the equipment slot onto a Basic equipment, that draw merges (no
  duplicate instance of that card in the pool).
- `countsTowardDeck` is false for equipment, heroes, weapons, and tokens; true for a common
  action.
- Slot 5 always yields 10 commons with the 6–7 / 3–4 class/generic split and per-class
  counts differing by at most 1.
- With a seeded rng forcing the Fabled branch on today's pool, the fallback lands on Majestic
  (no crash).
- Over N=10 000 generated packs with `Math.random`, average rares/pack within [1.6, 1.9] and
  majestics/pack within [0.2, 0.3] (loose statistical bounds, not flaky).

## 5. State & persistence — `storage.ts`

```ts
interface SealedEvent {
  id: string;          // crypto.randomUUID()
  name: string;
  createdAt: string;   // ISO
  cards: CardInstance[];
}
```

- Single localStorage key `fab-sealed-events` holding `SealedEvent[]`. Read once on load,
  write-through on every mutation (rename, select/deselect, delete). Wrap JSON.parse in
  try/catch → empty list on corruption.
- **Default naming**: scan existing names matching `/^Event (\d+)$/`, use max+1 (start at
  "Event 1"). Renamed events don't block the counter. Unit-test this.

## 6. UI

### Main screen (`MainScreen.tsx`)
- Title, a "New sealed event" button, and the list of existing events (name, creation date,
  selected count), newest first. Clicking an event navigates to `#/event/<id>`.
- "New sealed event": create event (default name, generated pool, all cards unselected),
  persist, navigate to it.

### Event screen (`EventScreen.tsx`)
Menu bar (single row, sticky at top):
- **← Back** button → main screen (state is already persisted; no confirmation needed).
- **Name**: rendered as text; on click becomes a text input + **OK** button (Enter also
  confirms). Empty name → keep previous.
- **Grouping selector**: three options — Rarity / Class / Pitch (default: Rarity). Applies to
  both panes.
- **Count**: "X / 30" where X = selected instances whose card `countsTowardDeck` (heroes,
  weapons, equipment, and tokens are excluded from X even when selected). A legal sealed
  deck has **exactly 30** cards — no more, no less — but legality is **never enforced**,
  only signaled visually: when X ≠ 30 render the count in red/amber with a tooltip
  "A sealed deck needs exactly 30 cards"; when X = 30 render it normally (or green).
  Copy/export always works regardless of legality.
- **Pitch split viz**, next to the count: a small three-segment stacked bar (red/yellow/blue)
  showing the pitch distribution of the selected deck cards (pitch 1/2/3; no-pitch cards
  don't count toward the deck so they never appear here). Segment widths proportional to
  counts; a tooltip (or tiny labels) gives the exact numbers, e.g. "12 red · 10 yellow ·
  8 blue". Empty deck → empty/neutral bar.
- **Copy** button → clipboard (`navigator.clipboard.writeText`), format in §7. Tooltip
  (`title` attribute is enough): "Copy deck list in Fabrary import format". Brief
  "Copied!" feedback on the button.
- **Delete** button → `window.confirm("Delete this event?")`; on confirm, remove from
  storage and go back to main screen.

Two panes below, side by side (CSS grid `1fr 1fr`), each scrolling independently:
- Left: instances with `selected === false`; right: `selected === true`. Pane headers
  "Card pool" / "Deck".
- Cards render as a compact grid of `CardTile`s (small image, **200px wide**).
- **Click** a tile → toggle `selected`, card moves to the other pane. Persist immediately.
- **Hover** → `CardPreview`: enlarged card (~340px) rendered in a fixed-position overlay near
  the cursor (keep within viewport). No preview on touch devices — clicking still works.

### Grouping (applies within each pane)
- Each group is introduced by a **separator row spanning the pane width**: a horizontal rule
  with the group name and the count of cards in that group (e.g. "— Rare (11) —").
  Groups in this order (skip empty groups):
  - **Rarity**: Fabled, Legendary, Majestic, Rare, Common, Basic.
  - **Class**: Brute, Necromancer, Runeblade, Generic (merge `Generic` + `NotClassed` under
    "Generic").
  - **Pitch**: Red (pitch 1), Yellow (2), Blue (3), No pitch (null — equipment etc.).
- Within a group, sort by pitch asc (null last), then name. Identical duplicates simply
  appear as multiple tiles.

## 7. Deck export — `deckExport.ts`

Fabrary-compatible text with a header and two sections. Exact shape:

```
Name: My sealed deck
Hero: Viserai, Between Worlds
Format: Sealed

Arena cards
1x Grasp of the Darknight
1x Seven Sin Nebula

Deck cards
1x Bloodfrenzy Gloomblade (red)
1x Bloodsong Gloomblade (red)
1x Cullingsong Gloomblade (red)
```

Rules:
- `Name:` is the event name. `Format:` is always `Sealed`.
- `Hero:` is the name of the selected card whose `types` include `Hero`. If none is selected,
  **omit the whole `Hero:` line**. If several are selected (allowed — nothing is enforced),
  use the first by name and don't error.
- **Arena cards** = selected cards whose `types` include `Equipment` or `Weapon` (the hero is
  excluded — it's already in the header). Omit the section entirely when empty.
- **Deck cards** = selected cards where `countsTowardDeck` is true. Omit the section when
  empty.
- **Tokens are not exported** (`types` includes `Token`): they're created during play and
  Fabrary derives them from the deck. This is a default worth confirming — it's on the
  open-questions list in §10.
- Within each section: aggregate by `cardId` into `<n>x <name>`, sorted by name. Append the
  pitch suffix ` (red|yellow|blue)` for pitch 1|2|3, and nothing when `pitch` is null — the
  card names in the data don't carry the color, so derive it from `pitch`.
- Sections are separated by a blank line; there is no trailing blank line.

Unit-test: header with and without a hero, arena/deck split, token exclusion, aggregation,
pitch suffix, no-pitch card, sorting, empty-selection output.

## 8. Card images — `cardImage.ts`

- One exported function `cardImageUrl(image: string): string` built on a single URL-pattern
  constant, so the pattern can be changed in one line later.
- **Confirmed working pattern** (verified 2026-09-09, returns image/webp including for
  already-revealed IAR cards): `https://content.fabrary.net/cards/{image}.webp`
  (e.g. https://content.fabrary.net/cards/IAR109.webp). Use it as the constant. Not all IAR
  cards are revealed/uploaded yet, so 404s are expected until release — hence the fallback.
- Every `<img>` gets `onError` → swap to the **text fallback card**: a card-shaped div with
  pitch-colored top strip (red/yellow/blue/gray), name, cost in a corner circle, power/defense
  when present, and `typeText` at the bottom. The fallback must look decent since it may be
  the primary rendering until release day. `CardPreview` uses the same fallback, larger, plus
  `functionalText` is NOT in the snapshot — keep the preview to the fields we have.
- `loading="lazy"` on tile images.

## 9. Assumptions / open questions (agreed defaults, revisit if wrong)

1. **Weapons are treated like heroes/equipment/tokens**: the user listed "tokens, hero and
   equipment" as not counting toward the 30; weapons follow the same FaB rule (they live in
   the arena, not the deck), so they don't count either. In code, "doesn't count" ==
   Equipment type or Basic rarity.
2. **Equipment-slot odds**: uniform among ALL sealed-legal equipment, Basic and Common alike
   (the real Basic-vs-Common ratio in packs is unknown; keep it a tweakable weight in
   `packConfig.ts`). A Basic result merges into the singleton, shrinking the pool.
3. The foil slot never yields Majestic+ (keeps pack-wide averages matching `context.md`).
4. No undo/redo; clicking a card back is the undo.

## 10. README & license

Write a proper `README.md` as part of the build (not an afterthought):

- **What it is**: one-paragraph pitch + a screenshot (add a placeholder
  `![screenshot](docs/screenshot.png)` and take the screenshot once the UI exists).
- **Usage**: `npm install`, `npm run dev`, `npm test`, `npm run build`; how to update the
  card data when new cards are revealed (`npm update @flesh-and-blood/cards
  @flesh-and-blood/types && npm run fetch-cards`).
- **Acknowledgments** — credit everything we build on:
  - [Fabrary](https://fabrary.net) and its card data packages
    ([fabrary/fab-cards](https://github.com/fabrary/fab-cards), npm
    `@flesh-and-blood/cards` / `@flesh-and-blood/types`, MIT license) — the source of all
    card data.
  - [Legend Story Studios](https://legendstory.com) — Flesh and Blood, all card names,
    text, and images are © Legend Story Studios. This is an unofficial fan project, not
    affiliated with or endorsed by LSS.
  - Card images from the official [FaB card database](https://cards.fabtcg.com) (when
    available).
  - React / Vite / Vitest.
- **"Open questions / to verify with FaB specialists"** — a visible README section (not a
  buried comment) listing the pack-simulation details we had to guess, so a knowledgeable
  player can correct them. Each entry: what we assumed, where it lives in the code, why we
  are unsure. Seed it with:
  1. **Basic vs Common equipment in the equipment slot.** We draw uniformly among all
     sealed-legal equipment, so a Basic class equipment (Hex Gauntlet, Appalling Bearers,
     Grasp of the Darknight) is as likely as a Common one (the Repentance cycle). The real
     print ratio is unknown — Basic equipment may be far more or far less frequent, or may
     not share the slot at all. Tunable in `packConfig.ts`. Note the knock-on effect: a
     Basic draw merges into the singleton (§4), so it changes the pool size, not just the
     odds.
  2. **Tokens in the export.** We omit `Type.Token` cards from the Fabrary list (§7);
     confirm Fabrary imports ignore/derive them.
  3. **The 6–7 / 3–4 common split** is a 50/50 coin flip, and class commons are split as
     evenly as possible — the true distribution may be weighted.
  4. **Foil-slot rarity odds** (Rare p=0.0175, else Common) are back-derived from the
     per-pack averages in `context.md`, not from published pull rates.
- **License — recommendation: MIT for the code**, with an explicit carve-out notice. Rationale
  to include in the README/LICENSE decision:
  - The card data we snapshot comes from an MIT-licensed package, so redistributing
    `cards.json` under MIT is consistent.
  - The code itself has no constraint; MIT is the simplest permissive choice and matches the
    upstream ecosystem. (Alternative: GPL-3.0 if the owner wants derivatives to stay open —
    ask before choosing anything other than MIT.)
  - **Important**: card names, game text, and images remain LSS intellectual property and are
    NOT covered by the repo license. Add a "Legal" section in the README following the spirit
    of LSS's fan/community content policy (unofficial, non-commercial fan work, LSS IP
    acknowledged). Do not commit card image files to the repo; only hotlink/load them at
    runtime.
  - Deliverables: `LICENSE` file (MIT, copyright the repo owner) + the README "Legal" section.

## 11. Build order & acceptance checklist

Build in this order, testing as you go:
1. Scaffold Vite project; `fetch-cards.mjs`; commit `cards.json`.
2. `packConfig.ts` + `packGenerator.ts` + tests (vitest green).
3. `storage.ts` (+ naming test), `deckExport.ts` (+ tests).
4. `App.tsx` hash router, `MainScreen`, `EventScreen` with panes/click-to-move.
5. Grouping, hover preview, copy/delete/rename, count badge.
6. `styles.css` polish (dark theme suits a TCG tool; system font stack; no framework).
7. `README.md` + `LICENSE` per §10.

Acceptance:
- [ ] `npm run dev` works; `npm run build` produces a static bundle with no runtime fetches.
- [ ] New event: pool appears unselected — one of each Basic card, plus the non-Basic pack
      cards (≤ 112); distribution passes the §4 tests.
- [ ] Events survive reload; "Event X" naming increments correctly.
- [ ] Click moves cards; count only includes deck cards (selecting a hero or equipment does
      not change X); X ≠ 30 shows the illegal-deck warning, nothing is ever blocked.
- [ ] Pitch split bar next to the count reflects the selected deck's red/yellow/blue counts.
- [ ] All three groupings render correct groups in both panes.
- [ ] Copy produces the §7 format (header, Arena cards, Deck cards); delete asks for
      confirmation; rename works inline.
- [ ] README has the "Open questions / to verify with FaB specialists" section from §10.
- [ ] Unknown pattern images fall back to readable text cards.
- [ ] `npm test` green.
- [ ] `README.md` with acknowledgments + legal section, and `LICENSE` file exist per §10.
