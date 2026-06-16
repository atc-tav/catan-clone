# CLAUDE.md

Project guidance for Claude Code working in this repo.

## Documentation conventions

- **The `README.md` must always open with the project haiku**, immediately under
  the `# catan-clone` title, as a blockquote, verbatim:

  > it's a catan clone
  > i'll trade you two sheep for stone
  > sent from my iphone

  Never remove, reword, or relocate it when editing the README.

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
