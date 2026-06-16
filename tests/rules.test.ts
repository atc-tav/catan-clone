import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng/Rng.js";
import { buildStandardBoard } from "../src/core/board/BoardBuilder.js";
import { BuildingType } from "../src/core/domain/enums.js";
import {
  canBuildRoad,
  isOpenForSettlement,
  longestRoadLength,
} from "../src/core/game/rules.js";
import { layRoadPath } from "./helpers.js";

describe("Placement rules", () => {
  it("enforces the distance rule for settlements", () => {
    const board = buildStandardBoard(new Rng(1));
    const vk = [...board.vertices.keys()][0];
    expect(isOpenForSettlement(board, vk)).toBe(true);

    board.vertices.get(vk)!.building = { owner: 0, type: BuildingType.Settlement };
    // Every neighbor is now blocked by the distance rule.
    for (const nk of board.neighborsOfVertex(vk)) {
      expect(isOpenForSettlement(board, nk)).toBe(false);
    }
  });

  it("only allows roads connected to the player's network", () => {
    const board = buildStandardBoard(new Rng(1));
    const vk = [...board.vertices.keys()][0];
    board.vertices.get(vk)!.building = { owner: 0, type: BuildingType.Settlement };

    const incident = board.edgesOfVertex(vk);
    expect(canBuildRoad(board, 0, incident[0])).toBe(true); // touches own settlement
    // A far-away edge with no connection is illegal.
    const farEdge = [...board.edges.keys()].find((e) => !board.edgeTouchesVertex(e, vk))!;
    expect(canBuildRoad(board, 0, farEdge)).toBe(false);
  });
});

describe("Longest road", () => {
  it("measures a simple path", () => {
    const board = buildStandardBoard(new Rng(1));
    const start = [...board.vertices.keys()][0];
    const placed = layRoadPath(board, 0, start, 5);
    expect(placed.length).toBe(5);
    expect(longestRoadLength(board, 0)).toBe(5);
  });

  it("is broken by an opponent's settlement in the middle", () => {
    const board = buildStandardBoard(new Rng(1));
    const start = [...board.vertices.keys()][0];
    const placed = layRoadPath(board, 0, start, 4);
    expect(longestRoadLength(board, 0)).toBe(4);

    // Drop an opponent settlement on the interior vertex between road 2 and 3.
    const midVertex = board
      .verticesOfEdge(placed[2])
      .find((v) => board.verticesOfEdge(placed[1]).includes(v))!;
    board.vertices.get(midVertex)!.building = { owner: 1, type: BuildingType.Settlement };

    expect(longestRoadLength(board, 0)).toBeLessThan(4);
  });
});
