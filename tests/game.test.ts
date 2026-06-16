import { describe, expect, it } from "vitest";
import { GameManager } from "../src/core/game/GameManager.js";
import {
  BuildingType,
  DevCardType,
  GamePhase,
  PortType,
  ResourceType,
} from "../src/core/domain/enums.js";
import { COST_CITY, COST_ROAD } from "../src/core/domain/constants.js";
import { victoryPoints } from "../src/core/game/rules.js";
import { completeSetup } from "./helpers.js";

function newGame(seed = 2026): GameManager {
  return GameManager.createGame({ playerNames: ["A", "B", "C"], seed });
}

/** Puts the game into the current player's main phase as if they had rolled. */
function enterPlayTurn(mgr: GameManager): void {
  mgr.state.phase = GamePhase.PlayTurn;
  mgr.state.hasRolled = true;
}

describe("Game setup", () => {
  it("uses a snake draft and gives each player two settlements and two roads", () => {
    const mgr = newGame();
    completeSetup(mgr);
    const s = mgr.state;

    expect(s.phase).toBe(GamePhase.Roll);
    expect(s.currentPlayerIndex).toBe(0);
    expect(s.turnNumber).toBe(1);

    for (const p of s.players) {
      expect(p.settlementsLeft).toBe(3); // started 5, placed 2
      expect(p.roadsLeft).toBe(13); // started 15, placed 2
    }

    // 6 settlements + 6 roads on the board for 3 players.
    const buildings = [...s.board.vertices.values()].filter((v) => v.building).length;
    const roads = [...s.board.edges.values()].filter((e) => e.road !== null).length;
    expect(buildings).toBe(6);
    expect(roads).toBe(6);
  });

  it("grants starting resources from the second settlement", () => {
    const mgr = newGame();
    completeSetup(mgr);
    const totalResources = mgr.state.players.reduce((n, p) => n + p.resourceCount(), 0);
    expect(totalResources).toBeGreaterThan(0);
  });
});

describe("Turn flow", () => {
  it("requires a roll before ending the turn", () => {
    const mgr = newGame();
    completeSetup(mgr);
    const blocked = mgr.dispatch({ type: "EndTurn", playerId: 0 });
    expect(blocked.ok).toBe(false);
  });

  it("rejects actions from the wrong player", () => {
    const mgr = newGame();
    completeSetup(mgr);
    const res = mgr.dispatch({ type: "RollDice", playerId: 1 });
    expect(res.ok).toBe(false);
  });

  it("advances to the next player on end turn", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const res = mgr.dispatch({ type: "EndTurn", playerId: 0 });
    expect(res.ok).toBe(true);
    expect(mgr.state.currentPlayerIndex).toBe(1);
    expect(mgr.state.phase).toBe(GamePhase.Roll);
  });
});

describe("Building", () => {
  it("upgrades a settlement to a city", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.resources[ResourceType.Wheat] = COST_CITY[ResourceType.Wheat];
    player.resources[ResourceType.Ore] = COST_CITY[ResourceType.Ore];

    const vk = [...mgr.state.board.vertices.keys()].find(
      (k) => mgr.state.board.vertices.get(k)!.building?.owner === 0,
    )!;
    const res = mgr.dispatch({ type: "BuildCity", playerId: 0, vertex: vk });
    expect(res.ok).toBe(true);
    expect(mgr.state.board.vertices.get(vk)!.building!.type).toBe(BuildingType.City);
    expect(player.citiesLeft).toBe(3);
  });

  it("builds a road that extends the player's network", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const board = mgr.state.board;
    const player = mgr.state.player(0);
    player.resources[ResourceType.Wood] = COST_ROAD[ResourceType.Wood];
    player.resources[ResourceType.Brick] = COST_ROAD[ResourceType.Brick];

    const ownRoad = [...board.edges.keys()].find((e) => board.edges.get(e)!.road === 0)!;
    const endpoint = board.verticesOfEdge(ownRoad)[0];
    const extension = board
      .edgesOfVertex(endpoint)
      .find((e) => board.edges.get(e)!.road === null);
    if (!extension) return; // endpoint fully built out; rare, skip
    const before = player.roadsLeft;
    const res = mgr.dispatch({ type: "BuildRoad", playerId: 0, edge: extension });
    expect(res.ok).toBe(true);
    expect(player.roadsLeft).toBe(before - 1);
  });
});

describe("Trading", () => {
  it("trades with the bank at 4:1 by default", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.resources[ResourceType.Wood] = 4;
    const beforeBrick = player.resources[ResourceType.Brick];

    const res = mgr.dispatch({
      type: "BankTrade",
      playerId: 0,
      give: ResourceType.Wood,
      receive: ResourceType.Brick,
    });
    expect(res.ok).toBe(true);
    expect(player.resources[ResourceType.Wood]).toBe(0);
    expect(player.resources[ResourceType.Brick]).toBe(beforeBrick + 1);
  });

  it("uses a 2:1 port rate when the player owns the matching port", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.ports.add(PortType.Wood);
    player.resources[ResourceType.Wood] = 2;

    const res = mgr.dispatch({
      type: "BankTrade",
      playerId: 0,
      give: ResourceType.Wood,
      receive: ResourceType.Ore,
    });
    expect(res.ok).toBe(true);
    expect(player.resources[ResourceType.Wood]).toBe(0);
    expect(player.resources[ResourceType.Ore]).toBe(1);
  });
});

describe("Development cards", () => {
  it("monopoly collects a resource from every other player", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.devCards[DevCardType.Monopoly] = 1;
    mgr.state.player(1).resources[ResourceType.Sheep] = 3;
    mgr.state.player(2).resources[ResourceType.Sheep] = 2;
    const own = player.resources[ResourceType.Sheep];

    const res = mgr.dispatch({
      type: "PlayMonopoly",
      playerId: 0,
      resource: ResourceType.Sheep,
    });
    expect(res.ok).toBe(true);
    expect(player.resources[ResourceType.Sheep]).toBe(own + 5);
    expect(mgr.state.player(1).resources[ResourceType.Sheep]).toBe(0);
    expect(mgr.state.player(2).resources[ResourceType.Sheep]).toBe(0);
  });

  it("allows only one development card per turn", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.devCards[DevCardType.Monopoly] = 1;
    player.devCards[DevCardType.YearOfPlenty] = 1;

    expect(
      mgr.dispatch({ type: "PlayMonopoly", playerId: 0, resource: ResourceType.Ore }).ok,
    ).toBe(true);
    const second = mgr.dispatch({
      type: "PlayYearOfPlenty",
      playerId: 0,
      resources: [ResourceType.Wood, ResourceType.Brick],
    });
    expect(second.ok).toBe(false);
  });
});

describe("Winning", () => {
  it("declares a winner at 10 victory points", () => {
    const mgr = newGame();
    completeSetup(mgr);
    enterPlayTurn(mgr);
    const player = mgr.state.player(0);
    player.victoryPointCards = 7; // 2 settlements + 7 = 9 so far
    player.resources[ResourceType.Wheat] = COST_CITY[ResourceType.Wheat];
    player.resources[ResourceType.Ore] = COST_CITY[ResourceType.Ore];

    const vk = [...mgr.state.board.vertices.keys()].find(
      (k) => mgr.state.board.vertices.get(k)!.building?.owner === 0,
    )!;
    mgr.dispatch({ type: "BuildCity", playerId: 0, vertex: vk });

    expect(victoryPoints(mgr.state, 0)).toBeGreaterThanOrEqual(10);
    expect(mgr.state.phase).toBe(GamePhase.GameOver);
    expect(mgr.state.winner).toBe(0);
  });
});
