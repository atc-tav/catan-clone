# Devlog

A running, milestone-by-milestone history of the build. Newest first.

## M3 · AI opponents (in progress)

- Heuristic AI in `src/core/ai` — a pure `decideAction(state, playerId)` that
  plays through the same `dispatch` path as a human (builds cities > settlements
  > expansion roads, bank-trades toward a city, grabs Largest Army, robs the
  leader, discards its cheapest cards). Self-play test runs full 4-bot games to a
  winner with only legal moves.
- UI: pick 0–3 AI opponents (0 = hotseat). Bots auto-play on a short delay; the
  human's controls disable on a bot's turn with a "thinking…" banner.

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
