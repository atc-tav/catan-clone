# Architecture

This document explains how the project is structured and, crucially, **how it is
designed to port to C#/Unity**. Read this before adding features — staying inside
these boundaries is what keeps the port cheap.

## The one rule

> **`src/core/` is pure game logic with zero framework, DOM, Node, React, or
> Three.js dependencies.**

Everything in `src/core/` is plain TypeScript that could be transliterated to C#
almost line-for-line. The rendering layer (Next.js + Three.js, under `app/` and
`components/`) sits *on top* of the core and depends on it; the core never
depends on the renderer. When you port to Unity, you rewrite the thin renderer
in C#/MonoBehaviour and translate the core directly. The rules don't change.

**This boundary is enforced, not just documented.** `tsconfig.core.json`
typechecks `src/core` with the DOM library removed, so any accidental
browser/React/Three.js usage in the core fails `npm run typecheck`.

```
┌─────────────────────────────────────────────┐
│  Renderer (Next.js + Three.js)   ← later     │   replaced by Unity/C# on port
│   - draws GameState                          │
│   - turns clicks into GameActions            │
└───────────────────────┬─────────────────────┘
                        │ dispatch(action) / read state
┌───────────────────────▼─────────────────────┐
│  src/core  (portable, no framework deps)     │   translated ~1:1 to C#
│   GameManager  ← the only thing that mutates │
│   GameState    ← serializable model          │
│   rules / Board / domain / coordinates / rng │
└─────────────────────────────────────────────┘
```

## Layers (bottom-up)

| Folder | Responsibility | Ports to C# as |
| --- | --- | --- |
| `rng/` | Deterministic Mulberry32 PRNG | A `class Rng` with a `uint` state |
| `coordinates/` | Axial hex math; canonical vertex/edge identity | Immutable structs/records |
| `domain/` | Enums, constants, the `Player` entity | `enum`s + a `Player` class |
| `board/` | The tile/vertex/edge graph + board generation | `Board` class, `Dictionary<string,...>` |
| `game/` | `GameState`, `GameManager`, rules, actions | State class + manager + sealed action records |

## Key patterns and why they matter for the port

### 1. Command pattern (`game/actions.ts`)
Every player intent is a serializable data object with a discriminating `type`.
`GameManager.dispatch(action)` is the *only* way to change the game. Benefits:
- All rules live in one place and are reused verbatim by Unity.
- Actions serialize trivially → future online play, replays, and AI come almost
  for free (an AI is just code that emits `GameAction`s).
- In C#, the union becomes a `sealed record` hierarchy handled by a `switch`.

### 2. Model/Manager split (state vs. behavior)
`GameState` is pure data (easy to serialize and to mirror as a C# class).
`GameManager` holds the behavior. This mirrors a clean Unity setup where the
state is a plain serializable object and the manager is a system/`MonoBehaviour`.

### 3. Deterministic RNG
`Rng` (Mulberry32) is seedable and reproducible. The same seed yields the same
board and dice in TS today and in C# tomorrow — provided the C# port uses
`unchecked` 32-bit arithmetic to match JS wraparound. This underpins tests and
future networked play.

### 4. Integer-only board identity
Board corners/edges are identified by the **set of hexes that meet there**
(sorted coordinate tuples), not floating-point positions. Identity is therefore
exact and hashes identically across languages. Floating point appears only in
`hexToWorld` / `vertexWorld`, which are render-only and never touched by rules.

## Porting checklist (TS → C#)

- `enum` (string) → C# `enum`. Keep names identical.
- `interface X { type: "..." }` action union → `sealed record X(...) : GameAction`.
- `Map<string, T>` → `Dictionary<string, T>`; `Set<string>` → `HashSet<string>`.
- `Record<ResourceType, number>` → `Dictionary<ResourceType,int>` or a struct.
- `Rng`: use `uint` + `unchecked`; `Math.imul(a,b)` → `unchecked(a * b)`.
- `Result` → a small `readonly struct Result { bool Ok; string Error; }`.
- Keep the `src/core` folder boundaries as C# namespaces (`Catan.Core.Game`, …).

## What exists today (Milestone 1)

The complete, tested, portable game core:

- Board generation (standard 19-hex board, terrains, number tokens with red-token
  spacing, 9 ports), all from a seed.
- Snake-draft setup, dice + resource production (with bank-scarcity rule), the
  robber (discard / move / steal), building (roads/settlements/cities), bank &
  port trades, the full development-card set, Longest Road (DFS) and Largest
  Army, and the victory-point win condition.
- 30 unit tests (`npm test`).

## What's next (later milestones)

1. **Renderer**: Next.js app + a Three.js scene that draws `GameState` with
   procedural geometry (hex prisms, settlement/city/road/robber meshes) and
   converts pointer input into `GameAction`s.
2. **Local hotseat UI**: turn banner, hand, build menu, trade panel.
3. **AI / online** (optional): both slot in behind the action seam.
4. **Unity port**: translate `src/core` to C# per the checklist above.
