# CLAUDE.md

Project guidance for Claude Code working in this repo.

## Documentation conventions

- **The `README.md` must contain ONLY the project haiku** (under the
  `# catan-clone` title) — nothing else, ever. No status, badges, install steps,
  or links. The haiku is verbatim, each line its own paragraph (a blank line
  between lines), no blockquote or other formatting:

  ```
  it's a catan clone

  i'll trade you two sheep for stone

  sent from my iphone
  ```

  Never remove, reword, or relocate it. Do not add sections to the README.

- **All other documentation lives in dedicated docs**, not the README:
  `OVERVIEW.md` (status/layout/develop/deploy), `ARCHITECTURE.md` (design + Unity
  port), `THREEJS-HOWTO.md` (the 3D approach), and `DEVLOG.md` (build history).
  When you add a doc, link it from `OVERVIEW.md`'s docs map.

## Project shape

A Settlers of Catan clone. See `ARCHITECTURE.md` for the full design.

- `src/core/` is **pure, framework-free game logic** that must port ~1:1 to
  C#/Unity. Keep it free of React/Next.js/Three.js/DOM/Node imports.
- The renderer (Next.js + Three.js) sits on top and depends on the core, never
  the reverse.
- All state mutation flows through `GameManager.dispatch(action)` (command
  pattern). Add rules there, not in the view.

## Commands

```bash
npm test          # Vitest suite
npm run typecheck # tsc --noEmit
```
