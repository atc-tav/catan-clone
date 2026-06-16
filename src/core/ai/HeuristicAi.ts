/**
 * A heuristic AI opponent. Pure functions from game state to decisions, so a bot
 * plays through the same `GameManager.dispatch` path a human does. No rules live
 * here — this only *chooses* among legal moves. Ports to C# with the core.
 *
 *   decideAction(state, id)     -> the bot's next action (drives its whole turn)
 *   decideTradeOffer(state, id) -> an optional offer the bot wants to make
 *   evaluateTrade(state, id, …) -> whether the bot would accept a given swap
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
    if (touchesSelf) score -= 1000;
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

  // Spend free roads from a Road Building card first.
  if (state.freeRoadsRemaining > 0 && p.roadsLeft > 0) {
    const road = bestExpansionRoad(state, playerId) ?? anyBuildableRoad(state, playerId);
    if (road) return { type: "BuildRoad", playerId, edge: road };
  }

  const ownSettlements = [...board.vertices.values()]
    .filter((v) => v.building?.owner === playerId && v.building.type === BuildingType.Settlement)
    .map((v) => v.key);

  // One development card per turn, when it clearly helps.
  if (!p.hasPlayedDevCardThisTurn) {
    const dev = decideDevCard(state, playerId, ownSettlements);
    if (dev) return dev;
  }

  // 1. Upgrade to a city.
  if (p.citiesLeft > 0 && ownSettlements.length > 0 && p.hasResources(COST_CITY)) {
    return { type: "BuildCity", playerId, vertex: bestBy(ownSettlements, (k) => vertexValue(state, k)) };
  }

  // 2. Settle the best open, connected spot.
  const spots = [...board.vertices.keys()].filter(
    (k) => isOpenForSettlement(board, k) && vertexConnectsToRoad(board, playerId, k),
  );
  if (p.settlementsLeft > 0 && spots.length > 0 && p.hasResources(COST_SETTLEMENT)) {
    return { type: "BuildSettlement", playerId, vertex: bestBy(spots, (k) => vertexValue(state, k)) };
  }

  // 3. Extend toward a new spot when none is currently open.
  if (p.roadsLeft > 0 && p.settlementsLeft > 0 && spots.length === 0 && p.hasResources(COST_ROAD)) {
    const road = bestExpansionRoad(state, playerId);
    if (road) return { type: "BuildRoad", playerId, edge: road };
  }

  // 4. Bank-trade toward a city, then a settlement.
  const towardCity = tradeToward(state, p, COST_CITY, p.citiesLeft > 0 && ownSettlements.length > 0);
  if (towardCity) return towardCity;
  if (spots.length > 0) {
    const towardSettlement = tradeToward(state, p, COST_SETTLEMENT, p.settlementsLeft > 0);
    if (towardSettlement) return towardSettlement;
  }

  // 5. Buy a development card if we can spare it.
  if (state.devDeck.length > 0 && p.hasResources(COST_DEV_CARD)) {
    return { type: "BuyDevCard", playerId };
  }

  return { type: "EndTurn", playerId };
}

/** Picks the single most valuable development card to play this turn, if any. */
function decideDevCard(
  state: GameState,
  playerId: number,
  ownSettlements: string[],
): GameAction | null {
  const p = state.player(playerId);

  // Knight -> Largest Army (2 VP).
  if (p.devCards[DevCardType.Knight] > 0) {
    const mine = p.knightsPlayed + 1;
    const holder = state.largestArmyHolder;
    const holderKnights = holder === null ? 0 : state.player(holder).knightsPlayed;
    if (mine >= LARGEST_ARMY_MIN && holder !== playerId && mine > holderKnights) {
      return { type: "PlayKnight", playerId };
    }
  }

  // Year of Plenty -> finish a city this turn.
  if (
    p.devCards[DevCardType.YearOfPlenty] > 0 &&
    p.citiesLeft > 0 &&
    ownSettlements.length > 0 &&
    !p.hasResources(COST_CITY)
  ) {
    const picks = neededForCity(state, p);
    if (picks) return { type: "PlayYearOfPlenty", playerId, resources: picks };
  }

  // Monopoly -> grab a resource lots of opponents hold.
  if (p.devCards[DevCardType.Monopoly] > 0) {
    const res = bestMonopoly(state, playerId);
    if (res) return { type: "PlayMonopoly", playerId, resource: res };
  }

  // Road Building -> two free expansion roads.
  if (
    p.devCards[DevCardType.RoadBuilding] > 0 &&
    p.roadsLeft > 0 &&
    bestExpansionRoad(state, playerId)
  ) {
    return { type: "PlayRoadBuilding", playerId };
  }

  return null;
}

/** Two resources (Year of Plenty) that complete a city, or null if not close. */
function neededForCity(state: GameState, p: Player): [ResourceType, ResourceType] | null {
  const deficits: ResourceType[] = [];
  for (let i = 0; i < Math.max(0, COST_CITY[ResourceType.Ore] - p.resources[ResourceType.Ore]); i++) {
    deficits.push(ResourceType.Ore);
  }
  for (let i = 0; i < Math.max(0, COST_CITY[ResourceType.Wheat] - p.resources[ResourceType.Wheat]); i++) {
    deficits.push(ResourceType.Wheat);
  }
  if (deficits.length === 0 || deficits.length > 2) return null;
  const picks = deficits.slice(0, 2);
  while (picks.length < 2) picks.push(ResourceType.Ore);
  // The bank must actually hold the picks.
  const need = emptyResourceBag();
  for (const r of picks) need[r]++;
  for (const r of RESOURCE_TYPES) if (need[r] > state.bank[r]) return null;
  return [picks[0], picks[1]];
}

/** The resource a Monopoly would net the most of (>= 3), or null. */
function bestMonopoly(state: GameState, playerId: number): ResourceType | null {
  let best: ResourceType | null = null;
  let bestTotal = 2; // require at least 3 to bother
  for (const r of RESOURCE_TYPES) {
    let total = 0;
    for (const other of state.players) if (other.id !== playerId) total += other.resources[r];
    if (total > bestTotal) {
      bestTotal = total;
      best = r;
    }
  }
  return best;
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

/** Any legal road (used to spend leftover free roads). */
function anyBuildableRoad(state: GameState, playerId: number): string | null {
  for (const ek of state.board.edges.keys()) {
    if (canBuildRoad(state.board, playerId, ek)) return ek;
  }
  return null;
}

/**
 * If `target` is affordable after one bank trade, return that trade. Trades a
 * resource held beyond the target's needs (by at least the trade rate) for one
 * we still lack — strictly reducing our total, so it can't loop.
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

// --- Trading with other players --------------------------------------------

const VALUE: Record<ResourceType, number> = {
  [ResourceType.Wood]: 3,
  [ResourceType.Brick]: 3,
  [ResourceType.Sheep]: 2,
  [ResourceType.Wheat]: 4,
  [ResourceType.Ore]: 4,
};

function bagValue(bag: ResourceBag): number {
  let v = 0;
  for (const r of RESOURCE_TYPES) v += VALUE[r] * bag[r];
  return v;
}

/**
 * Would `playerId` accept receiving `gain` in exchange for paying `cost`?
 * Accepts only if affordable and a clear net gain in resource value.
 */
export function evaluateTrade(
  state: GameState,
  playerId: number,
  gain: ResourceBag,
  cost: ResourceBag,
): boolean {
  const p = state.player(playerId);
  if (!p.hasResources(cost)) return false;
  return bagValue(gain) > bagValue(cost);
}

/**
 * An offer the bot would like to make to another player: give a surplus, get a
 * resource it needs for its next build. From the bot's perspective. Null if it
 * has nothing worth offering.
 */
export function decideTradeOffer(
  state: GameState,
  playerId: number,
): { give: ResourceBag; receive: ResourceBag } | null {
  const p = state.player(playerId);
  const hasSettlement = [...state.board.vertices.values()].some(
    (v) => v.building?.owner === playerId && v.building.type === BuildingType.Settlement,
  );
  const target = p.citiesLeft > 0 && hasSettlement ? COST_CITY : COST_SETTLEMENT;
  if (p.hasResources(target)) return null;

  const need = RESOURCE_TYPES.find((r) => p.resources[r] < target[r]);
  if (!need) return null;
  // Offer a resource we hold plenty of and don't need for the target.
  const give = RESOURCE_TYPES.find(
    (r) => r !== need && p.resources[r] >= 3 && p.resources[r] > target[r],
  );
  if (!give) return null;

  return { give: single(give), receive: single(need) };
}

function single(r: ResourceType, n = 1): ResourceBag {
  const bag = emptyResourceBag();
  bag[r] = n;
  return bag;
}

/**
 * Given a partner's half-open trade (exactly one side filled), the bot fills in
 * the other side. Result is from the PARTNER's perspective ({ give, receive }).
 *
 *   - partner stated what they WANT (give empty): the bot offers to provide it
 *     and names a price (what the partner must give).
 *   - partner stated what they GIVE (want empty): the bot names what it would
 *     hand over in return.
 *
 * Returns null if the bot isn't interested or can't cover the deal.
 */
export function aiCounterOffer(
  state: GameState,
  aiId: number,
  partnerId: number,
  want: ResourceBag,
  give: ResourceBag,
): { give: ResourceBag; receive: ResourceBag } | null {
  const ai = state.player(aiId);
  const partner = state.player(partnerId);
  const wantTotal = RESOURCE_TYPES.reduce((n, r) => n + want[r], 0);
  const giveTotal = RESOURCE_TYPES.reduce((n, r) => n + give[r], 0);

  // Partner wants `want`; bot must own it and names a price worth >= its value.
  if (wantTotal > 0 && giveTotal === 0) {
    if (!ai.hasResources(want)) return null;
    const value = bagValue(want);
    const byNeed = [...RESOURCE_TYPES].sort((a, b) => ai.resources[a] - ai.resources[b]);
    for (const r of byNeed) {
      if (want[r] > 0) continue;
      const count = Math.max(1, Math.ceil(value / VALUE[r]));
      if (partner.resources[r] >= count) return { give: single(r, count), receive: want };
    }
    return null;
  }

  // Partner offers `give`; bot returns a surplus resource worth less than it.
  if (giveTotal > 0 && wantTotal === 0) {
    const value = bagValue(give);
    const bySurplus = [...RESOURCE_TYPES].sort((a, b) => ai.resources[b] - ai.resources[a]);
    for (const r of bySurplus) {
      if (give[r] > 0) continue;
      if (ai.resources[r] >= 1 && VALUE[r] < value) return { give, receive: single(r, 1) };
    }
    return null;
  }

  return null;
}

// --- helpers ---------------------------------------------------------------

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
