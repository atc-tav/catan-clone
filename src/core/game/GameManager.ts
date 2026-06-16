/**
 * GameManager — the rules engine and state machine.
 *
 * This is THE game-design-pattern layer the project asked for. It owns the only
 * legal path to mutate a GameState: `dispatch(action)`. Every rule, phase
 * transition, and scoring update lives here, expressed against the portable
 * domain model. The renderer (and, later, the Unity client) is a thin shell
 * that turns user input into actions and draws the resulting state — it knows
 * no rules. That separation is what makes the C#/Unity port a near-mechanical
 * translation rather than a rewrite.
 */
import { buildStandardBoard, BoardOptions } from "../board/BoardBuilder.js";
import { Player } from "../domain/Player.js";
import { Rng } from "../rng/Rng.js";
import {
  COST_CITY,
  COST_DEV_CARD,
  COST_ROAD,
  COST_SETTLEMENT,
  DEV_CARD_DECK,
  DISCARD_LIMIT,
  LARGEST_ARMY_MIN,
  LONGEST_ROAD_MIN,
  ResourceBag,
  VICTORY_POINTS_TO_WIN,
  bagTotal,
} from "../domain/constants.js";
import {
  BuildingType,
  DevCardType,
  GamePhase,
  PlayerColor,
  PortType,
  ResourceType,
  terrainResource,
} from "../domain/enums.js";
import { GameState } from "./GameState.js";
import { GameAction } from "./actions.js";
import { Result, err, ok } from "./Result.js";
import {
  canBuildRoad,
  isOpenForSettlement,
  longestRoadLength,
  vertexConnectsToRoad,
  victoryPoints,
} from "./rules.js";

const PLAYER_COLORS: readonly PlayerColor[] = [
  PlayerColor.Red,
  PlayerColor.Blue,
  PlayerColor.White,
  PlayerColor.Orange,
];

export interface GameOptions {
  playerNames: string[]; // 2..4 players
  seed: number;
  boardOptions?: BoardOptions;
}

export class GameManager {
  readonly state: GameState;

  private constructor(state: GameState) {
    this.state = state;
  }

  /** Builds a fresh game: board, players, shuffled dev deck, snake-draft setup. */
  static createGame(options: GameOptions): GameManager {
    const { playerNames, seed } = options;
    if (playerNames.length < 2 || playerNames.length > 4) {
      throw new Error("Catan supports 2 to 4 players.");
    }

    const rng = new Rng(seed);
    const board = buildStandardBoard(rng, options.boardOptions);
    const players = playerNames.map(
      (name, i) => new Player(i, PLAYER_COLORS[i], name),
    );

    const state = new GameState(board, players, rng);
    state.devDeck = buildDevDeck(rng);

    const ids = players.map((p) => p.id);
    state.setupQueue = [...ids, ...[...ids].reverse()];
    state.setupQueuePos = 0;
    state.setupSubStep = "settlement";
    state.currentPlayerIndex = state.setupQueue[0];
    state.phase = GamePhase.Setup;

    return new GameManager(state);
  }

  // -------------------------------------------------------------------------
  // Action dispatch
  // -------------------------------------------------------------------------

  dispatch(action: GameAction): Result {
    const s = this.state;
    if (s.phase === GamePhase.GameOver) return err("The game is over.");
    if (action.playerId < 0 || action.playerId >= s.players.length) {
      return err(`Unknown player ${action.playerId}.`);
    }

    switch (action.type) {
      case "PlaceSetupSettlement":
        return this.placeSetupSettlement(action.playerId, action.vertex);
      case "PlaceSetupRoad":
        return this.placeSetupRoad(action.playerId, action.edge);
      case "RollDice":
        return this.rollDice(action.playerId);
      case "Discard":
        return this.discard(action.playerId, action.resources);
      case "MoveRobber":
        return this.moveRobber(action.playerId, action.hex, action.stealFrom);
      case "BuildRoad":
        return this.buildRoad(action.playerId, action.edge);
      case "BuildSettlement":
        return this.buildSettlement(action.playerId, action.vertex);
      case "BuildCity":
        return this.buildCity(action.playerId, action.vertex);
      case "BuyDevCard":
        return this.buyDevCard(action.playerId);
      case "PlayKnight":
        return this.playKnight(action.playerId);
      case "PlayRoadBuilding":
        return this.playRoadBuilding(action.playerId);
      case "PlayYearOfPlenty":
        return this.playYearOfPlenty(action.playerId, action.resources);
      case "PlayMonopoly":
        return this.playMonopoly(action.playerId, action.resource);
      case "BankTrade":
        return this.bankTrade(action.playerId, action.give, action.receive);
      case "PlayerTrade":
        return this.playerTrade(action.playerId, action.partnerId, action.give, action.receive);
      case "EndTurn":
        return this.endTurn(action.playerId);
      default:
        return err(`Unhandled action: ${(action as GameAction).type}`);
    }
  }

  // -------------------------------------------------------------------------
  // Setup phase
  // -------------------------------------------------------------------------

  private placeSetupSettlement(playerId: number, vertex: string): Result {
    const s = this.state;
    if (s.phase !== GamePhase.Setup || s.setupSubStep !== "settlement") {
      return err("Not awaiting a setup settlement.");
    }
    if (playerId !== s.setupQueue[s.setupQueuePos]) return err("Not your placement.");
    if (!isOpenForSettlement(s.board, vertex)) return err("Illegal settlement location.");

    const v = s.board.vertices.get(vertex)!;
    const player = s.player(playerId);
    v.building = { owner: playerId, type: BuildingType.Settlement };
    player.settlementsLeft--;
    if (v.port) player.ports.add(v.port);

    // The SECOND settlement (second half of the snake) yields starting resources.
    const isSecondRound = s.setupQueuePos >= s.players.length;
    if (isSecondRound) {
      for (const hk of s.board.hexesOfVertex(vertex)) {
        const res = terrainResource(s.board.tiles.get(hk)!.terrain);
        if (res) this.giveFromBank(player, res, 1);
      }
    }

    s.lastSetupVertex = vertex;
    s.setupSubStep = "road";
    return ok;
  }

  private placeSetupRoad(playerId: number, edge: string): Result {
    const s = this.state;
    if (s.phase !== GamePhase.Setup || s.setupSubStep !== "road") {
      return err("Not awaiting a setup road.");
    }
    if (playerId !== s.setupQueue[s.setupQueuePos]) return err("Not your placement.");
    const e = s.board.edges.get(edge);
    if (!e || e.road !== null) return err("Illegal road location.");
    if (!s.board.edgeTouchesVertex(edge, s.lastSetupVertex ?? "")) {
      return err("Setup road must connect to the settlement just placed.");
    }

    e.road = playerId;
    s.player(playerId).roadsLeft--;

    // Advance the snake draft.
    s.setupQueuePos++;
    s.lastSetupVertex = null;
    if (s.setupQueuePos >= s.setupQueue.length) {
      // Setup complete — first player begins the main game.
      this.updateLongestRoad();
      s.phase = GamePhase.Roll;
      s.currentPlayerIndex = s.setupQueue[0];
      s.turnNumber = 1;
      s.hasRolled = false;
    } else {
      s.setupSubStep = "settlement";
      s.currentPlayerIndex = s.setupQueue[s.setupQueuePos];
    }
    return ok;
  }

  // -------------------------------------------------------------------------
  // Turn: roll, discard, robber
  // -------------------------------------------------------------------------

  private rollDice(playerId: number): Result {
    const s = this.state;
    if (s.phase !== GamePhase.Roll) return err("Not the roll phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");

    const die1 = s.rng.rollDie();
    const die2 = s.rng.rollDie();
    const sum = die1 + die2;
    s.lastRoll = { die1, die2, sum };
    s.hasRolled = true;

    if (sum === 7) {
      this.beginRobberSequence();
    } else {
      this.produceResources(sum);
      s.phase = GamePhase.PlayTurn;
    }
    return ok;
  }

  /** Sets up discards (if any) then the robber move. Shared by 7-rolls. */
  private beginRobberSequence(): void {
    const s = this.state;
    s.pendingDiscards.clear();
    for (const p of s.players) {
      if (p.resourceCount() > DISCARD_LIMIT) {
        s.pendingDiscards.set(p.id, Math.floor(p.resourceCount() / 2));
      }
    }
    s.phase = s.pendingDiscards.size > 0 ? GamePhase.Discard : GamePhase.MoveRobber;
  }

  private discard(playerId: number, resources: ResourceBag): Result {
    const s = this.state;
    if (s.phase !== GamePhase.Discard) return err("Not the discard phase.");
    const required = s.pendingDiscards.get(playerId);
    if (required === undefined) return err("You do not need to discard.");
    if (bagTotal(resources) !== required) {
      return err(`You must discard exactly ${required} cards.`);
    }
    const player = s.player(playerId);
    if (!player.hasResources(resources)) return err("You do not hold those cards.");

    player.pay(resources);
    this.returnToBank(resources);
    s.pendingDiscards.delete(playerId);
    if (s.pendingDiscards.size === 0) s.phase = GamePhase.MoveRobber;
    return ok;
  }

  private moveRobber(playerId: number, hex: string, stealFrom: number | null): Result {
    const s = this.state;
    if (s.phase !== GamePhase.MoveRobber) return err("Not the robber phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    if (!s.board.tiles.has(hex)) return err("Unknown hex.");
    if (hex === s.board.robberHex) return err("Robber must move to a new hex.");

    s.board.robberHex = hex;

    const victims = this.robberVictims(hex, playerId);
    if (stealFrom === null) {
      if (victims.length > 0) return err("You must steal from an adjacent player.");
    } else {
      if (!victims.includes(stealFrom)) return err("Invalid steal target.");
      this.stealRandomResource(playerId, stealFrom);
    }

    s.phase = s.hasRolled ? GamePhase.PlayTurn : GamePhase.Roll;
    this.checkWin(playerId);
    return ok;
  }

  /** Players (other than the mover) with a building on the robber's hex and cards. */
  private robberVictims(hex: string, moverId: number): number[] {
    const s = this.state;
    const set = new Set<number>();
    for (const vk of s.board.verticesOfHex(hex)) {
      const b = s.board.vertices.get(vk)?.building;
      if (b && b.owner !== moverId && s.player(b.owner).resourceCount() > 0) {
        set.add(b.owner);
      }
    }
    return Array.from(set);
  }

  private stealRandomResource(thiefId: number, victimId: number): void {
    const s = this.state;
    const victim = s.player(victimId);
    const pool: ResourceType[] = [];
    for (const res of Object.values(ResourceType)) {
      for (let i = 0; i < victim.resources[res]; i++) pool.push(res);
    }
    if (pool.length === 0) return;
    const stolen = pool[s.rng.nextInt(0, pool.length - 1)];
    victim.addResource(stolen, -1);
    s.player(thiefId).addResource(stolen, 1);
  }

  // -------------------------------------------------------------------------
  // Building
  // -------------------------------------------------------------------------

  private buildRoad(playerId: number, edge: string): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Not the build phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    const player = s.player(playerId);
    if (player.roadsLeft <= 0) return err("No roads left in supply.");
    if (!canBuildRoad(s.board, playerId, edge)) return err("Illegal road location.");

    const free = s.freeRoadsRemaining > 0;
    if (!free && !player.hasResources(COST_ROAD)) return err("Insufficient resources.");

    if (free) {
      s.freeRoadsRemaining--;
    } else {
      player.pay(COST_ROAD);
      this.returnToBank(COST_ROAD);
    }
    s.board.edges.get(edge)!.road = playerId;
    player.roadsLeft--;
    this.updateLongestRoad();
    this.checkWin(playerId);
    return ok;
  }

  private buildSettlement(playerId: number, vertex: string): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Not the build phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    const player = s.player(playerId);
    if (player.settlementsLeft <= 0) return err("No settlements left in supply.");
    if (!isOpenForSettlement(s.board, vertex)) return err("Illegal settlement location.");
    if (!vertexConnectsToRoad(s.board, playerId, vertex)) {
      return err("Settlement must connect to one of your roads.");
    }
    if (!player.hasResources(COST_SETTLEMENT)) return err("Insufficient resources.");

    player.pay(COST_SETTLEMENT);
    this.returnToBank(COST_SETTLEMENT);
    const v = s.board.vertices.get(vertex)!;
    v.building = { owner: playerId, type: BuildingType.Settlement };
    player.settlementsLeft--;
    if (v.port) player.ports.add(v.port);

    // A new settlement can sever an opponent's longest road.
    this.updateLongestRoad();
    this.checkWin(playerId);
    return ok;
  }

  private buildCity(playerId: number, vertex: string): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Not the build phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    const player = s.player(playerId);
    const v = s.board.vertices.get(vertex);
    if (!v || v.building?.owner !== playerId || v.building.type !== BuildingType.Settlement) {
      return err("You must upgrade your own settlement.");
    }
    if (player.citiesLeft <= 0) return err("No cities left in supply.");
    if (!player.hasResources(COST_CITY)) return err("Insufficient resources.");

    player.pay(COST_CITY);
    this.returnToBank(COST_CITY);
    v.building.type = BuildingType.City;
    player.citiesLeft--;
    player.settlementsLeft++; // the settlement returns to supply
    this.checkWin(playerId);
    return ok;
  }

  // -------------------------------------------------------------------------
  // Development cards
  // -------------------------------------------------------------------------

  private buyDevCard(playerId: number): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Not the build phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    if (s.devDeck.length === 0) return err("The development deck is empty.");
    const player = s.player(playerId);
    if (!player.hasResources(COST_DEV_CARD)) return err("Insufficient resources.");

    player.pay(COST_DEV_CARD);
    this.returnToBank(COST_DEV_CARD);
    const card = s.devDeck.pop()!;
    if (card === DevCardType.VictoryPoint) {
      player.victoryPointCards++;
    } else {
      // Bought this turn — not playable until next turn.
      player.newDevCards[card]++;
    }
    this.checkWin(playerId);
    return ok;
  }

  private requireDevCardPlay(playerId: number, type: DevCardType): Result {
    const s = this.state;
    // Knights may be played before rolling; others only during the main phase.
    const phaseOk =
      type === DevCardType.Knight
        ? s.phase === GamePhase.Roll || s.phase === GamePhase.PlayTurn
        : s.phase === GamePhase.PlayTurn;
    if (!phaseOk) return err("Cannot play that card now.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    const player = s.player(playerId);
    if (player.hasPlayedDevCardThisTurn) return err("Only one development card per turn.");
    if (player.playableDevCards(type) <= 0) return err(`No ${type} card to play.`);
    return ok;
  }

  private playKnight(playerId: number): Result {
    const check = this.requireDevCardPlay(playerId, DevCardType.Knight);
    if (!check.ok) return check;
    const s = this.state;
    const player = s.player(playerId);
    player.devCards[DevCardType.Knight]--;
    player.hasPlayedDevCardThisTurn = true;
    player.knightsPlayed++;
    this.updateLargestArmy(playerId);
    s.phase = GamePhase.MoveRobber; // player must now move the robber
    this.checkWin(playerId);
    return ok;
  }

  private playRoadBuilding(playerId: number): Result {
    const check = this.requireDevCardPlay(playerId, DevCardType.RoadBuilding);
    if (!check.ok) return check;
    const player = this.state.player(playerId);
    player.devCards[DevCardType.RoadBuilding]--;
    player.hasPlayedDevCardThisTurn = true;
    this.state.freeRoadsRemaining = 2;
    return ok;
  }

  private playYearOfPlenty(
    playerId: number,
    resources: [ResourceType, ResourceType],
  ): Result {
    const check = this.requireDevCardPlay(playerId, DevCardType.YearOfPlenty);
    if (!check.ok) return check;
    const s = this.state;
    for (const res of resources) {
      if (s.bank[res] <= 0) return err("The bank lacks that resource.");
    }
    const player = s.player(playerId);
    player.devCards[DevCardType.YearOfPlenty]--;
    player.hasPlayedDevCardThisTurn = true;
    for (const res of resources) this.giveFromBank(player, res, 1);
    return ok;
  }

  private playMonopoly(playerId: number, resource: ResourceType): Result {
    const check = this.requireDevCardPlay(playerId, DevCardType.Monopoly);
    if (!check.ok) return check;
    const s = this.state;
    const player = s.player(playerId);
    player.devCards[DevCardType.Monopoly]--;
    player.hasPlayedDevCardThisTurn = true;
    for (const other of s.players) {
      if (other.id === playerId) continue;
      const amount = other.resources[resource];
      if (amount > 0) {
        other.addResource(resource, -amount);
        player.addResource(resource, amount);
      }
    }
    return ok;
  }

  // -------------------------------------------------------------------------
  // Trading & turn end
  // -------------------------------------------------------------------------

  private bankTrade(playerId: number, give: ResourceType, receive: ResourceType): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Not the trade phase.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    if (give === receive) return err("Trade must be for a different resource.");
    const player = s.player(playerId);
    const rate = this.tradeRate(player, give);
    if (player.resources[give] < rate) return err(`You need ${rate} ${give} to trade.`);
    if (s.bank[receive] <= 0) return err("The bank is out of that resource.");

    player.addResource(give, -rate);
    s.bank[give] += rate;
    this.giveFromBank(player, receive, 1);
    return ok;
  }

  /** Executes a mutually-agreed swap between the active player and a partner. */
  private playerTrade(
    playerId: number,
    partnerId: number,
    give: ResourceBag,
    receive: ResourceBag,
  ): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("You can only trade on your turn.");
    if (playerId !== s.currentPlayerIndex) return err("Only the active player may trade.");
    if (partnerId === playerId) return err("Choose another player to trade with.");
    if (partnerId < 0 || partnerId >= s.players.length) return err("Unknown trade partner.");
    if (bagTotal(give) === 0 || bagTotal(receive) === 0) {
      return err("A trade needs resources on both sides.");
    }
    const proposer = s.player(playerId);
    const partner = s.player(partnerId);
    if (!proposer.hasResources(give)) return err("You don't have the resources you offered.");
    if (!partner.hasResources(receive)) return err(`${partner.name} can't cover that trade.`);

    for (const res of Object.values(ResourceType)) {
      proposer.resources[res] += receive[res] - give[res];
      partner.resources[res] += give[res] - receive[res];
    }
    return ok;
  }

  /** Best available trade rate for a resource: 2 (matching port), 3 (generic), or 4. */
  private tradeRate(player: Player, give: ResourceType): number {
    if (player.ports.has(resourceToPort(give))) return 2;
    if (player.ports.has(PortType.Generic)) return 3;
    return 4;
  }

  private endTurn(playerId: number): Result {
    const s = this.state;
    if (s.phase !== GamePhase.PlayTurn) return err("Cannot end the turn now.");
    if (playerId !== s.currentPlayerIndex) return err("Not your turn.");
    if (!s.hasRolled) return err("You must roll before ending your turn.");

    const player = s.player(playerId);
    // Cards bought this turn become playable next turn.
    for (const type of Object.values(DevCardType)) {
      player.devCards[type] += player.newDevCards[type];
      player.newDevCards[type] = 0;
    }
    player.hasPlayedDevCardThisTurn = false;
    s.freeRoadsRemaining = 0;
    s.hasRolled = false;
    s.lastRoll = null;

    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.turnNumber++;
    s.phase = GamePhase.Roll;
    return ok;
  }

  // -------------------------------------------------------------------------
  // Resource / bank helpers
  // -------------------------------------------------------------------------

  /** Distributes resources for a (non-7) dice roll, respecting bank scarcity. */
  private produceResources(sum: number): void {
    const s = this.state;
    // Collect demand: who is owed how much of each resource.
    const demand: Array<{ pid: number; res: ResourceType; amt: number }> = [];
    for (const tile of s.board.tiles.values()) {
      if (tile.numberToken !== sum || tile.key === s.board.robberHex) continue;
      const res = terrainResource(tile.terrain);
      if (!res) continue;
      for (const vk of s.board.verticesOfHex(tile.key)) {
        const b = s.board.vertices.get(vk)?.building;
        if (!b) continue;
        demand.push({ pid: b.owner, res, amt: b.type === BuildingType.City ? 2 : 1 });
      }
    }

    // Apply per-resource, honoring the official scarcity rule: if the bank
    // cannot satisfy total demand for a resource, only a single recipient is
    // paid (the rest get nothing).
    for (const res of Object.values(ResourceType)) {
      const entries = demand.filter((d) => d.res === res);
      if (entries.length === 0) continue;
      const total = entries.reduce((n, e) => n + e.amt, 0);
      const recipients = new Set(entries.map((e) => e.pid));
      if (total <= s.bank[res]) {
        for (const e of entries) this.giveFromBank(s.player(e.pid), res, e.amt);
      } else if (recipients.size === 1) {
        const pid = entries[0].pid;
        this.giveFromBank(s.player(pid), res, s.bank[res]);
      }
      // else: insufficient for multiple players -> no one receives this resource.
    }
  }

  private giveFromBank(player: Player, res: ResourceType, amount: number): void {
    const give = Math.min(amount, this.state.bank[res]);
    if (give <= 0) return;
    this.state.bank[res] -= give;
    player.addResource(res, give);
  }

  private returnToBank(bag: ResourceBag): void {
    for (const res of Object.values(ResourceType)) this.state.bank[res] += bag[res];
  }

  // -------------------------------------------------------------------------
  // Awards & win
  // -------------------------------------------------------------------------

  /** Recomputes the Longest Road holder across all players. */
  private updateLongestRoad(): void {
    const s = this.state;
    const lengths = s.players.map((p) => longestRoadLength(s.board, p.id));

    let holder = s.longestRoadHolder;
    if (holder !== null && lengths[holder] < LONGEST_ROAD_MIN) holder = null;

    const best = Math.max(0, ...lengths);
    if (best >= LONGEST_ROAD_MIN) {
      const leaders = lengths.flatMap((len, pid) => (len === best ? [pid] : []));
      if (holder === null) {
        if (leaders.length === 1) holder = leaders[0];
      } else if (best > lengths[holder] && leaders.length === 1) {
        holder = leaders[0];
      }
    }

    s.longestRoadHolder = holder;
    s.longestRoadLength = holder !== null ? lengths[holder] : 0;
  }

  /** Awards Largest Army to the player who just exceeded the current holder. */
  private updateLargestArmy(playerId: number): void {
    const s = this.state;
    const k = s.player(playerId).knightsPlayed;
    if (k < LARGEST_ARMY_MIN) return;
    const holder = s.largestArmyHolder;
    if (holder === null || k > s.player(holder).knightsPlayed) {
      s.largestArmyHolder = playerId;
      s.largestArmySize = k;
    }
  }

  private checkWin(playerId: number): void {
    const s = this.state;
    if (victoryPoints(s, playerId) >= VICTORY_POINTS_TO_WIN) {
      s.winner = playerId;
      s.phase = GamePhase.GameOver;
    }
  }
}

// --- module-private helpers --------------------------------------------------

function buildDevDeck(rng: Rng): DevCardType[] {
  const deck: DevCardType[] = [];
  for (const type of Object.keys(DEV_CARD_DECK) as DevCardType[]) {
    for (let i = 0; i < DEV_CARD_DECK[type]; i++) deck.push(type);
  }
  return rng.shuffle(deck);
}

function resourceToPort(res: ResourceType): PortType {
  switch (res) {
    case ResourceType.Wood:
      return PortType.Wood;
    case ResourceType.Brick:
      return PortType.Brick;
    case ResourceType.Sheep:
      return PortType.Sheep;
    case ResourceType.Wheat:
      return PortType.Wheat;
    case ResourceType.Ore:
      return PortType.Ore;
  }
}
