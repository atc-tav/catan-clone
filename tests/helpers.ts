import { GameManager } from "../src/core/game/GameManager.js";
import { GamePhase } from "../src/core/domain/enums.js";
import { isOpenForSettlement } from "../src/core/game/rules.js";

/**
 * Drives the snake-draft setup to completion by greedily choosing the first
 * legal settlement spot and an incident road for each placement. Returns when
 * the game reaches the Roll phase.
 */
export function completeSetup(mgr: GameManager): void {
  const s = mgr.state;
  let guard = 0;
  while (s.phase === GamePhase.Setup) {
    if (guard++ > 1000) throw new Error("Setup did not terminate.");
    const pid = s.setupQueue[s.setupQueuePos];

    if (s.setupSubStep === "settlement") {
      const vk = [...s.board.vertices.keys()].find((k) =>
        isOpenForSettlement(s.board, k),
      );
      if (!vk) throw new Error("No open settlement spot.");
      const res = mgr.dispatch({ type: "PlaceSetupSettlement", playerId: pid, vertex: vk });
      if (!res.ok) throw new Error(`Setup settlement failed: ${res.error}`);
    } else {
      const vk = s.lastSetupVertex!;
      const ek = s.board.edgesOfVertex(vk).find((e) => s.board.edges.get(e)!.road === null);
      if (!ek) throw new Error("No open road spot.");
      const res = mgr.dispatch({ type: "PlaceSetupRoad", playerId: pid, edge: ek });
      if (!res.ok) throw new Error(`Setup road failed: ${res.error}`);
    }
  }
}

/** Walks a simple (non-repeating) path of `length` edges for `playerId`. */
export function layRoadPath(
  board: import("../src/core/board/Board.js").Board,
  playerId: number,
  startVertex: string,
  length: number,
): string[] {
  const placed: string[] = [];
  let current = startVertex;
  const visited = new Set<string>([current]);
  for (let i = 0; i < length; i++) {
    const ek = board
      .edgesOfVertex(current)
      .find((e) => board.edges.get(e)!.road === null && !placed.includes(e) && hasUnvisitedEnd(board, e, current, visited));
    if (!ek) break;
    board.edges.get(ek)!.road = playerId;
    placed.push(ek);
    current = board.otherEndpoint(ek, current)!;
    visited.add(current);
  }
  return placed;
}

function hasUnvisitedEnd(
  board: import("../src/core/board/Board.js").Board,
  edge: string,
  from: string,
  visited: Set<string>,
): boolean {
  const other = board.otherEndpoint(edge, from);
  return other !== null && !visited.has(other);
}
