import { describe, expect, it } from "vitest";
import { GameManager } from "../src/core/game/GameManager.js";
import { aiCounterOffer, decideAction, evaluateTrade } from "../src/core/ai/HeuristicAi.js";
import { GamePhase, ResourceType } from "../src/core/domain/enums.js";
import { bagFrom, bagTotal } from "../src/core/domain/constants.js";

/**
 * Drives a full all-AI game to completion. This is both a legality check (every
 * action the AI emits must be accepted by the rules engine) and a termination /
 * competence check (the heuristics must actually finish a game).
 */
function playOut(seed: number, maxActions = 30000): GameManager {
  const mgr = GameManager.createGame({ playerNames: ["A", "B", "C", "D"], seed });
  let count = 0;
  while (mgr.state.phase !== GamePhase.GameOver) {
    if (count++ > maxActions) throw new Error(`Game did not finish in ${maxActions} actions`);
    const s = mgr.state;
    const actor =
      s.phase === GamePhase.Discard
        ? (s.pendingDiscards.keys().next().value as number)
        : s.currentPlayerIndex;
    const action = decideAction(s, actor);
    const result = mgr.dispatch(action);
    if (!result.ok) {
      throw new Error(`AI made an illegal move: ${result.error} — ${JSON.stringify(action)}`);
    }
  }
  return mgr;
}

describe("Heuristic AI", () => {
  it("plays only legal moves and finishes a game with a winner", () => {
    for (const seed of [1, 2026, 77, 9001]) {
      const mgr = playOut(seed);
      expect(mgr.state.phase).toBe(GamePhase.GameOver);
      expect(mgr.state.winner).not.toBeNull();
      // The event log captured the game, ending with a win.
      expect(mgr.state.log.length).toBeGreaterThan(10);
      expect(mgr.state.log.at(-1)?.kind).toBe("win");
    }
  });

  it("evaluates trades: accepts a clear gain, rejects what it can't afford", () => {
    const mgr = GameManager.createGame({ playerNames: ["A", "B"], seed: 5 });
    const p = mgr.state.player(1);
    p.resources[ResourceType.Sheep] = 2;
    p.resources[ResourceType.Ore] = 0;
    // Gain 1 ore (value 4) for 1 sheep (value 2): a clear win, and affordable.
    expect(
      evaluateTrade(mgr.state, 1, bagFrom({ [ResourceType.Ore]: 1 }), bagFrom({ [ResourceType.Sheep]: 1 })),
    ).toBe(true);
    // Can't pay 1 ore it doesn't have.
    expect(
      evaluateTrade(mgr.state, 1, bagFrom({ [ResourceType.Sheep]: 1 }), bagFrom({ [ResourceType.Ore]: 1 })),
    ).toBe(false);
  });

  it("makes a counter-offer to a half-open trade", () => {
    const mgr = GameManager.createGame({ playerNames: ["A", "B"], seed: 5 });
    const human = mgr.state.player(0);
    const ai = mgr.state.player(1);
    // Human wants 1 ore; AI has ore and the human holds resources to pay with.
    human.resources[ResourceType.Wood] = 4;
    ai.resources[ResourceType.Ore] = 2;
    const counter = aiCounterOffer(
      mgr.state,
      1,
      0,
      bagFrom({ [ResourceType.Ore]: 1 }),
      bagFrom({}),
    );
    expect(counter).not.toBeNull();
    expect(counter!.receive[ResourceType.Ore]).toBe(1); // human still gets the ore
    expect(bagTotal(counter!.give)).toBeGreaterThan(0); // and pays something
  });

  it("reaches the victory-point target for the winner", () => {
    const mgr = playOut(2026);
    const vp = (id: number) => {
      let v = 0;
      for (const vtx of mgr.state.board.vertices.values()) {
        if (vtx.building?.owner === id) v += vtx.building.type === "City" ? 2 : 1;
      }
      return v + mgr.state.player(id).victoryPointCards;
    };
    expect(vp(mgr.state.winner!) + 4).toBeGreaterThanOrEqual(10); // + possible awards
  });
});
