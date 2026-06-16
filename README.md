# catan-clone

it's a catan clone

i'll trade you two sheep for stone

sent from my iphone

Built React/Next.js + Three.js on the surface, but the heart of the project is a
**portable, framework-free TypeScript game core** designed to be translated to
C#/Unity later with minimal friction. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Status

**Milestone 1 — the game-logic core (complete).** Pure, tested rules engine.

- Deterministic, seeded board generation (19 hexes, terrains, number tokens,
  9 ports).
- A `GameManager` state machine driven entirely by serializable **actions**
  (the command pattern) — the single seam everything else plugs into.
- Full rules: snake-draft setup, dice + resource production, the robber
  (discard/move/steal), roads/settlements/cities, bank & port trades, the
  development-card set, Longest Road, Largest Army, and the win condition.
- 30 unit tests.

**Milestone 2 — 3D board renderer (in progress).** A Next.js app renders the
seeded board in 3D with Three.js (via React Three Fiber): hex tiles, number
tokens, and the robber, with orbit/zoom and a "New board" reroll.

Next up: 3D piece models (settlements/cities/roads) and the interactive hotseat
turn loop, then the Unity port.

## Layout

```
src/core/            portable game logic — NO framework deps (this ports to C#)
  rng/               deterministic PRNG (Mulberry32)
  coordinates/       axial hex math + canonical vertex/edge identity
  domain/            enums, constants, Player
  board/             tile/vertex/edge graph + board generation
  game/              GameState, GameManager (rules), actions, rule helpers
app/                 Next.js (App Router) pages — the renderer shell
components/three/     React Three Fiber scene + procedural piece geometry
tests/               Vitest suite
```

## Develop

```bash
npm install
npm run dev       # http://localhost:3000 — the 3D board
npm test          # run the test suite
npm run typecheck # core-purity check + app typecheck
npm run build     # production build (what Vercel runs)
```

## Deploy (Vercel)

This is a standard Next.js app, so Vercel deploys it with zero config:

1. Push to GitHub (already done).
2. In Vercel, **Add New → Project → Import** this repo. Vercel auto-detects
   Next.js; just click **Deploy**. No build settings needed.
3. Every push to `main` redeploys; every PR gets a preview URL.

**Secret safety (this is a public repo):** the app has **no secrets** — the game
runs entirely in the browser, no API keys or database. Should you ever add one:

- Never commit secrets. `.env`/`.env.*` are git-ignored (see `.env.example`).
- Put secrets in **Vercel → Project → Settings → Environment Variables**, not in
  the repo. They are injected at build/runtime and never exposed publicly.
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser — never put a
  secret behind that prefix.

## Design principle

Rules live only in `src/core` and never touch the renderer. Input becomes a
`GameAction`; `GameManager.dispatch` validates and applies it; the view draws the
resulting `GameState`. That boundary is what makes the Unity port a translation
rather than a rewrite.
