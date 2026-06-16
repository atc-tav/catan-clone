/**
 * Pure rule predicates and graph algorithms. Nothing here mutates state — these
 * are the questions the GameManager asks before it acts ("is this a legal
 * settlement spot?", "how long is this player's road?"). Keeping them pure and
 * side-effect free makes them directly testable and trivially portable.
 */
import { Board } from "../board/Board.js";
import {
  LARGEST_ARMY_VP,
  LONGEST_ROAD_VP,
} from "../domain/constants.js";
import { BuildingType } from "../domain/enums.js";
import { GameState } from "./GameState.js";

/** A vertex is a legal settlement spot if it is empty and the distance rule holds. */
export function isOpenForSettlement(board: Board, vk: string): boolean {
  const v = board.vertices.get(vk);
  if (!v || v.building) return false;
  // Distance rule: no adjacent vertex may carry a building.
  for (const nk of board.neighborsOfVertex(vk)) {
    if (board.vertices.get(nk)?.building) return false;
  }
  return true;
}

/** Does the player have one of their own roads touching this vertex? */
export function vertexConnectsToRoad(board: Board, playerId: number, vk: string): boolean {
  return board.edgesOfVertex(vk).some((ek) => board.edges.get(ek)?.road === playerId);
}

/**
 * A road is buildable on `ek` for `playerId` if the edge is empty and connects
 * to that player's network: an adjacent road, or one of their own buildings.
 * A connection through a vertex occupied by an OPPONENT does not count.
 */
export function canBuildRoad(board: Board, playerId: number, ek: string): boolean {
  const edge = board.edges.get(ek);
  if (!edge || edge.road !== null) return false;

  for (const vk of board.verticesOfEdge(ek)) {
    const building = board.vertices.get(vk)?.building;
    if (building && building.owner === playerId) return true; // own building
    if (building && building.owner !== playerId) continue; // blocked by opponent
    // Empty vertex: extend if one of its other edges is our road.
    for (const otherEk of board.edgesOfVertex(vk)) {
      if (otherEk !== ek && board.edges.get(otherEk)?.road === playerId) return true;
    }
  }
  return false;
}

/**
 * Longest unbroken road for a player: the longest trail (no repeated edges) in
 * their road subgraph, blocked from passing through vertices occupied by an
 * opponent. The board is tiny (<=15 roads) so an exhaustive DFS is fine.
 */
export function longestRoadLength(board: Board, playerId: number): number {
  const roadEdges = Array.from(board.edges.values()).filter((e) => e.road === playerId);
  if (roadEdges.length === 0) return 0;

  const blocked = (vk: string): boolean => {
    const b = board.vertices.get(vk)?.building;
    return !!b && b.owner !== playerId;
  };

  const dfs = (vertex: string, used: Set<string>): number => {
    if (blocked(vertex)) return 0; // cannot pass through an opponent's settlement
    let best = 0;
    for (const ek of board.edgesOfVertex(vertex)) {
      if (board.edges.get(ek)?.road !== playerId || used.has(ek)) continue;
      const next = board.otherEndpoint(ek, vertex);
      if (next === null) continue;
      used.add(ek);
      best = Math.max(best, 1 + dfs(next, used));
      used.delete(ek);
    }
    return best;
  };

  let longest = 0;
  // Start from both endpoints of every road segment.
  for (const e of roadEdges) {
    for (const vk of board.verticesOfEdge(e.key)) {
      longest = Math.max(longest, dfs(vk, new Set()));
    }
  }
  return longest;
}

/** Victory points for a player, including hidden VP cards and award bonuses. */
export function victoryPoints(state: GameState, playerId: number): number {
  let vp = 0;
  for (const v of state.board.vertices.values()) {
    if (v.building?.owner === playerId) {
      vp += v.building.type === BuildingType.City ? 2 : 1;
    }
  }
  vp += state.player(playerId).victoryPointCards;
  if (state.longestRoadHolder === playerId) vp += LONGEST_ROAD_VP;
  if (state.largestArmyHolder === playerId) vp += LARGEST_ARMY_VP;
  return vp;
}

/** Public-facing victory points (everything except hidden VP cards). */
export function publicVictoryPoints(state: GameState, playerId: number): number {
  return victoryPoints(state, playerId) - state.player(playerId).victoryPointCards;
}
