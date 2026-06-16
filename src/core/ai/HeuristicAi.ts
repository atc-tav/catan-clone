/**
 * A heuristic AI opponent. It is a pure function from game state to the next
 * action — `decideAction(state, playerId)` — so a bot plays through exactly the
 * same `GameManager.dispatch` path a human does. No rules live here; this only
 * *chooses* among legal moves.
 *
 * The caller drives a bot's turn by calling `decideAction` and dispatching the
 * result repeatedly until it yields `EndTurn` (or the phase hands off). Because
 * every branch returns a legal, progress-making action (builds/trades spend
 * resources; trades strictly reduce the total), a turn always terminates.
 *
 * Pure and framework-free — it ports to C# alongside the rest of the core.
 */
import { Player } from "../domain/Player.js";
import {
  COST_CITY,
  COST_DEV_CARD,
  COST_ROAD,
  COST_SETTLEMENT,
  LARGEST_ARMY_MIN,
  ResourceBag,
  emptyResourceBag,
  tokenPips,
} from "../domain/constants.js";
import {
  BuildingType,
  DevCardType,
  GamePhase,
  PortType,
  RESOURCE_TYPES,
  ResourceType,
} from "../domain/enums.js";
import { GameState } from "../game/GameState.js";
import { GameAction } from "../game/actions.js";
import {
  canBuildRoad,
  isOpenForSettlement,
  publicVictoryPoints,
  vertexConnectsToRoad,
} from "../game/rules.js";

/** Chooses the next action for `playerId` given the current game state. */
export function decideAction(state: GameState, playerId: number): GameAction {
  switch (state.phase) {
    case GamePhase.Setup:
      return decideSetup(state, playerId);
    case GamePhase.Roll:
      return { type: "RollDice", playerId };
    case GamePhase.Discard:
      return decideDiscard(state, playerId);
    case GamePhase.MoveRobber:
      return decideRobber(state, playerId);
    case GamePhase.PlayTurn:
      return decidePlayTurn(state, playerId);
    default:
      return { type: "EndTurn", playerId };
  }
}

// --- Setup -----------------------------------------------------------------

function decideSetup(state: GameState, playerId: number): GameAction {
  const board = state.board;
  if (state.setupSubStep === "settlement") {
    const spots = [...board.vertices.keys()].filter((k) => isOpenForSettlement(board, k));
    return {
      type: "PlaceSetupSettlement",
      playerId,
      vertex: bestBy(spots, (k) => vertexValue(state, k)),
    };
  }
  const vk = state.lastSetupVertex!;
  const edges = board.edgesOfVertex(vk).filter((e) => board.edges.get(e)!.road === null);
  return {
    type: "PlaceSetupRoad",
    playerId,
    edge: bestBy(edges, (e) => {
      const other = board.otherEndpoint(e, vk);
      return other ? vertexValue(state, other) : 0;
    }),
  };
}

// --- Discard (on a 7) ------------------------------------------------------

function decideDiscard(state: GameState, playerId: number): GameAction {
  const required = state.pendingDiscards.get(playerId) ?? 0;
  const have = state.player(playerId).resources;
  const chosen: ResourceBag = emptyResourceBag();
  // Drop from whatever we hold most of; ties favor cheaper resources (keep ore/wheat).
  const order = [
    ResourceType.Brick,
    ResourceType.Wood,
    ResourceType.Sheep,
    ResourceType.Wheat,
    ResourceType.Ore,
  ];
  for (let n = 0; n < required; n++) {
    let pick: ResourceType | null = null;
    let most = 0;
    for (const r of order) {
      const left = have[r] - chosen[r];
      if (left > most) {
        most = left;
        pick = r;
      }
    }
    if (!pick) break;
    chosen[pick]++;
  }
  return { type: "Discard", playerId, resources: chosen };
}

// --- Robber ----------------------------------------------------------------

function decideRobber(state: GameState, playerId: number): GameAction {
  const board = state.board;
  const candidates = [...board.tiles.keys()].filter((k) => k !== board.robberHex);
  let bestHex = candidates[0];
  let bestScore = -Infinity;
  for (const hk of candidates) {
    const pips = tokenPips(board.tiles.get(hk)!.numberToken);
    let score = 0;
    let touchesSelf = false;
    for (const vk of board.verticesOfHex(hk)) {
      const b = board.vertices.get(vk)?.building;
      if (!b) continue;
      if (b.owner === playerId) touchesSelf = true;
      else score += (b.type === BuildingType.City ? 2 : 1) * pips + publicVictoryPoints(state, b.owner);
    }
    if (touchesSelf) score -= 1000; // never rob ourselves
    if (score > bestScore) {
      bestScore = score;
      bestHex = hk;
    }
  }

  let stealFrom: number | null = null;
  let mostCards = 0;
  for (const vk of board.verticesOfHex(bestHex)) {
    const b = board.vertices.get(vk)?.building;
    if (!b || b.owner === playerId) continue;
    const cards = state.player(b.owner).resourceCount();
    if (cards > mostCards) {
      mostCards = cards;
      stealFrom = b.owner;
    }
  }
  return { type: "MoveRobber", playerId, hex: bestHex, stealFrom };
}

// --- Main turn -------------------------------------------------------------

function decidePlayTurn(state: GameState, playerId: number): GameAction {
  const board = state.board;
  const p = state.player(playerId);

  const ownSettlements = [...board.vertices.values()]
    .filter((v) => v.building?.owner === playerId && v.building.type === BuildingType.Settlement)
    .map((v) => v.key);

  // 1. Upgrade to a city (best income spot).
  if (p.citiesLeft > 0 && ownSettlements.length > 0 && p.hasResources(COST_CITY)) {
    return { type: "BuildCity", playerId, vertex: bestBy(ownSettlements, (k) => vertexValue(state, k)) };
  }

  // 2. Grab Largest Army if a knight would do it (worth 2 VP).
  if (p.devCards[DevCardType.Knight] > 0 && !p.hasPlayedDevCardThisTurn) {
    const mine = p.knightsPlayed + 1;
    const holder = state.largestArmyHolder;
    const holderKnights = holder === null ? 0 : state.player(holder).knightsPlayed;
    if (mine >= LARGEST_ARMY_MIN && holder !== playerId && mine > holderKnights) {
      return { type: "PlayKnight", playerId };
    }
  }

  // 3. Build a settlement on the best open, connected spot.
  const spots = [...board.vertices.keys()].filter(
    (k) => isOpenForSettlement(board, k) && vertexConnectsToRoad(board, playerId, k),
  );
  if (p.settlementsLeft > 0 && spots.length > 0 && p.hasResources(COST_SETTLEMENT)) {
    return { type: "BuildSettlement", playerId, vertex: bestBy(spots, (k) => vertexValue(state, k)) };
  }

  // 4. Extend toward a new settlement spot (only when none is currently open).
  if (p.roadsLeft > 0 && p.settlementsLeft > 0 && spots.length === 0 && p.hasResources(COST_ROAD)) {
    const road = bestExpansionRoad(state, playerId);
    if (road) return { type: "BuildRoad", playerId, edge: road };
  }

  // 5. Bank-trade toward a city (always spatially possible if we own a settlement).
  const towardCity = tradeToward(state, p, COST_CITY, p.citiesLeft > 0 && ownSettlements.length > 0);
  if (towardCity) return towardCity;

  // 6. Bank-trade toward a settlement when a spot exists.
  if (spots.length > 0) {
    const towardSettlement = tradeToward(state, p, COST_SETTLEMENT, p.settlementsLeft > 0);
    if (towardSettlement) return towardSettlement;
  }

  // 7. Otherwise buy a development card if we can spare it.
  if (state.devDeck.length > 0 && p.hasResources(COST_DEV_CARD)) {
    return { type: "BuyDevCard", playerId };
  }

  // 8. Nothing useful left.
  return { type: "EndTurn", playerId };
}

/** A road whose addition would open a new buildable settlement vertex. */
function bestExpansionRoad(state: GameState, playerId: number): string | null {
  const board = state.board;
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const ek of board.edges.keys()) {
    if (!canBuildRoad(board, playerId, ek)) continue;
    for (const vk of board.verticesOfEdge(ek)) {
      for (const nk of [vk, ...board.neighborsOfVertex(vk)]) {
        if (isOpenForSettlement(board, nk) && vertexValue(state, nk) > bestScore) {
          bestScore = vertexValue(state, nk);
          best = ek;
        }
      }
    }
  }
  return best;
}

/**
 * If `target` is affordable after one bank trade, return that trade. Trades a
 * resource we hold beyond the target's needs (by at least the trade rate) for a
 * resource we still lack — strictly reducing our total, so it can't loop.
 */
function tradeToward(
  state: GameState,
  p: Player,
  target: ResourceBag,
  enabled: boolean,
): GameAction | null {
  if (!enabled || p.hasResources(target)) return null;
  const need = RESOURCE_TYPES.find((r) => p.resources[r] < target[r]);
  if (!need) return null;
  for (const give of RESOURCE_TYPES) {
    if (give === need) continue;
    const rate = bankRate(p, give);
    if (p.resources[give] - target[give] >= rate && state.bank[need] > 0) {
      return { type: "BankTrade", playerId: p.id, give, receive: need };
    }
  }
  return null;
}

// --- helpers ---------------------------------------------------------------

/** Value of a building spot: total production pips of its tiles, plus a port nudge. */
function vertexValue(state: GameState, vk: string): number {
  let value = 0;
  for (const hk of state.board.hexesOfVertex(vk)) {
    value += tokenPips(state.board.tiles.get(hk)!.numberToken);
  }
  if (state.board.vertices.get(vk)?.port) value += 1.5;
  return value;
}

const PORT_FOR: Record<ResourceType, PortType> = {
  [ResourceType.Wood]: PortType.Wood,
  [ResourceType.Brick]: PortType.Brick,
  [ResourceType.Sheep]: PortType.Sheep,
  [ResourceType.Wheat]: PortType.Wheat,
  [ResourceType.Ore]: PortType.Ore,
};

function bankRate(p: Player, give: ResourceType): number {
  if (p.ports.has(PORT_FOR[give])) return 2;
  if (p.ports.has(PortType.Generic)) return 3;
  return 4;
}

function bestBy<T>(items: T[], score: (t: T) => number): T {
  let best = items[0];
  let bestScore = -Infinity;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}
