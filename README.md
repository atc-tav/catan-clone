# catan-clone

A Settlers of Catan clone — *"I'll trade you two sheep for stone."*

Built React/Next.js + Three.js on the surface, but the heart of the project is a
**portable, framework-free TypeScript game core** designed to be translated to
C#/Unity later with minimal friction. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Status

**Milestone 1 — the game-logic core (complete).** Pure, tested rules engine with
no rendering yet. Local hotseat is the target play mode.

What works today:

- Deterministic, seeded board generation (19 hexes, terrains, number tokens,
  9 ports).
- A `GameManager` state machine driven entirely by serializable **actions**
  (the command pattern) — the single seam everything else plugs into.
- Full rules: snake-draft setup, dice + resource production, the robber
  (discard/move/steal), roads/settlements/cities, bank & port trades, the
  development-card set, Longest Road, Largest Army, and the win condition.
- 30 unit tests.

Next up: a Three.js renderer (procedural piece/tile models) and a Next.js
hotseat UI on top of this core, then the Unity port.

## Layout

```
src/core/            portable game logic — NO framework deps (this ports to C#)
  rng/               deterministic PRNG (Mulberry32)
  coordinates/       axial hex math + canonical vertex/edge identity
  domain/            enums, constants, Player
  board/             tile/vertex/edge graph + board generation
  game/              GameState, GameManager (rules), actions, rule helpers
tests/               Vitest suite
```

## Develop

```bash
npm install
npm test          # run the test suite
npm run typecheck # tsc --noEmit
```

## Design principle

Rules live only in `src/core` and never touch the renderer. Input becomes a
`GameAction`; `GameManager.dispatch` validates and applies it; the view draws the
resulting `GameState`. That boundary is what makes the Unity port a translation
rather than a rewrite.
