# Devlog

A running, milestone-by-milestone history of the build. Newest first.

## M3 · AI opponents, trading & TwoSheep-style UI (in progress)

- **Game log**: the engine now emits a structured event stream
  (`src/core/game/events.ts`) for every action — rolls, production, builds,
  robber/steals, dev cards, trades, awards, wins — rendered as a scrolling,
  emoji game log on the right.
- **Layout overhaul** toward the TwoSheep concept: left rail = what you can
  build (with cost + affordability), bottom = your resource bank + dev cards +
  actions, right rail = dice, game log, and player standings.
- Earlier in M3:

- Heuristic AI in `src/core/ai` — a pure `decideAction(state, playerId)` that
  plays through the same `dispatch` path as a human, and now uses **every
  mechanic**: cities/settlements/roads, bank trades, all dev cards (Knight,
  Road Building, Year of Plenty, Monopoly), robber targeting the leader.
- **Player trading** with bots both ways: you propose and opponents auto-accept/
  decline (`evaluateTrade`); bots offer you trades (`decideTradeOffer`) in the
  bottom-right panel.
- **Single human vs all AI** (one human seat) so opponents' hands stay hidden.
  Difficulty selector placeholder (Normal).
- **Ports** rendered on the board (2:1 / 3:1 buoys).
- **Card-based UI**: resource & development cards in the bottom-left deck (dev
  cards click to play), slimmer action bar.

## M2 · 3D board renderer

- Playtest polish: dice in a dedicated tray (rounded, engraved pips), producing
  tiles glow with resource tokens floating off them, bottom-anchored UI (deck /
  actions / reserved offers).
- Main turn loop: dice + production, building, robber, bank & player trades,
  development cards, win.

- **Interactive setup + 3D pieces** (PR #5) — procedural piece models
  (settlement/city/road) and a clickable snake-draft: glowing ghost markers show
  legal spots; clicks dispatch `PlaceSetupSettlement` / `PlaceSetupRoad` through
  the `GameManager`. Turn banner, per-player counts, 2–4 players, "New game".
- **3D board** (PR #3) — Next.js (App Router) app rendering the seeded board with
  React Three Fiber: hex tiles (6-sided cylinders) colored by terrain, number
  tokens (6/8 in red), the robber, orbit/zoom. Deployable to Vercel.

## Infrastructure

- **CI** (PR #4) — GitHub Actions runs typecheck + tests + production build on
  every PR and push to `main`. A core-purity tsconfig fails the build if anything
  in `src/core` imports the DOM/React/Three.js.

## M1 · Portable game core (complete, PR #1)

- Deterministic Mulberry32 RNG (seed-reproducible boards/dice).
- Axial hex coordinates with integer-only canonical vertex/edge identity
  (19 tiles / 54 vertices / 72 edges).
- Standard board generation: terrains, number tokens (red-token spacing), ports.
- `GameManager` state machine driven by serializable actions (command pattern).
- Full rules: setup, production (with bank scarcity), robber, building,
  bank/port trades, development cards, Longest Road, Largest Army, win.
- 30 Vitest tests.

## Docs

- `THREEJS-HOWTO.md` (PR #6) — reusable React Three Fiber guide.
- `ARCHITECTURE.md` — design + the TS→C#/Unity porting strategy.
- README slimmed to just the project haiku; overview moved to `OVERVIEW.md`.
