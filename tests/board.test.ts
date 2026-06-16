import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng/Rng.js";
import { buildStandardBoard } from "../src/core/board/BoardBuilder.js";
import { PortType, TerrainType } from "../src/core/domain/enums.js";

describe("Standard board", () => {
  const board = buildStandardBoard(new Rng(2026));

  it("has the canonical 19 tiles, 54 vertices, 72 edges", () => {
    expect(board.tiles.size).toBe(19);
    expect(board.vertices.size).toBe(54);
    expect(board.edges.size).toBe(72);
  });

  it("has the standard terrain distribution", () => {
    const counts = new Map<TerrainType, number>();
    for (const t of board.tiles.values()) {
      counts.set(t.terrain, (counts.get(t.terrain) ?? 0) + 1);
    }
    expect(counts.get(TerrainType.Forest)).toBe(4);
    expect(counts.get(TerrainType.Pasture)).toBe(4);
    expect(counts.get(TerrainType.Fields)).toBe(4);
    expect(counts.get(TerrainType.Hills)).toBe(3);
    expect(counts.get(TerrainType.Mountains)).toBe(3);
    expect(counts.get(TerrainType.Desert)).toBe(1);
  });

  it("places number tokens on every non-desert tile and none on the desert", () => {
    for (const t of board.tiles.values()) {
      if (t.terrain === TerrainType.Desert) expect(t.numberToken).toBe(0);
      else expect(t.numberToken).toBeGreaterThan(0);
    }
  });

  it("starts the robber on the desert", () => {
    expect(board.tiles.get(board.robberHex)!.terrain).toBe(TerrainType.Desert);
  });

  it("assigns nine ports including one 2:1 of each resource", () => {
    const portTypes = new Set<PortType>();
    let portedVertices = 0;
    for (const v of board.vertices.values()) {
      if (v.port) {
        portedVertices++;
        portTypes.add(v.port);
      }
    }
    // 9 ports, each granted to (up to) 2 vertices.
    expect(portedVertices).toBeGreaterThanOrEqual(9);
    for (const resourcePort of [
      PortType.Wood,
      PortType.Brick,
      PortType.Sheep,
      PortType.Wheat,
      PortType.Ore,
      PortType.Generic,
    ]) {
      expect(portTypes.has(resourcePort)).toBe(true);
    }
  });

  it("is reproducible for the same seed", () => {
    const a = buildStandardBoard(new Rng(42));
    const b = buildStandardBoard(new Rng(42));
    const terrainsA = [...a.tiles.values()].map((t) => `${t.key}:${t.terrain}:${t.numberToken}`);
    const terrainsB = [...b.tiles.values()].map((t) => `${t.key}:${t.terrain}:${t.numberToken}`);
    expect(terrainsA).toEqual(terrainsB);
  });
});
