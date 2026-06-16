/**
 * Public surface of the portable game core. Everything exported here is pure
 * TypeScript with zero framework/runtime dependencies — this is the island that
 * ports to C#/Unity. The renderer imports from here and nowhere deeper.
 */
export { Rng } from "./rng/Rng.js";

export * from "./coordinates/Hex.js";
export * from "./coordinates/Intersections.js";

export * from "./domain/enums.js";
export * from "./domain/constants.js";
export { Player } from "./domain/Player.js";

export { Board } from "./board/Board.js";
export type { Tile, VertexState, EdgeState, Building } from "./board/Board.js";
export {
  buildStandardBoard,
  standardHexLayout,
  type BoardOptions,
} from "./board/BoardBuilder.js";

export { GameState, type DiceRoll } from "./game/GameState.js";
export { GameManager, type GameOptions } from "./game/GameManager.js";
export { decideAction, decideTradeOffer, evaluateTrade } from "./ai/HeuristicAi.js";
export type { GameAction } from "./game/actions.js";
export { type Result, ok, err } from "./game/Result.js";
export * from "./game/rules.js";
