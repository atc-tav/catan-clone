import { describe, expect, it } from "vitest";
import { hex, hexDistance, hexNeighbors } from "../src/core/coordinates/Hex.js";
import {
  adjacentVertices,
  edgeVertices,
  hexCorner,
  vertexEdges,
  vertexKey,
} from "../src/core/coordinates/Intersections.js";

describe("Hex coordinates", () => {
  it("has six distinct neighbors at distance 1", () => {
    const center = hex(0, 0);
    const neighbors = hexNeighbors(center);
    expect(neighbors).toHaveLength(6);
    for (const n of neighbors) expect(hexDistance(center, n)).toBe(1);
  });
});

describe("Vertex/edge canonicalization", () => {
  it("identifies the same corner identically from adjacent hexes", () => {
    // Corner 0 of (0,0) is shared by (0,0), its E neighbor and its NE neighbor.
    const fromCenter = hexCorner(hex(0, 0), 0);
    // The same physical corner approached from the E neighbor (1,0).
    // (1,0)'s corner that includes (0,0) and (1,-1) must match.
    const fromEast = hexCorner(hex(1, 0), 2);
    expect(vertexKey(fromCenter)).toBe(vertexKey(fromEast));
  });

  it("a vertex has three incident edges and (interior) three neighbors", () => {
    const v = hexCorner(hex(0, 0), 0);
    expect(vertexEdges(v)).toHaveLength(3);
    expect(adjacentVertices(v)).toHaveLength(3);
  });

  it("an interior edge connects exactly two vertices", () => {
    const v = hexCorner(hex(0, 0), 0);
    const e = vertexEdges(v)[0];
    expect(edgeVertices(e)).toHaveLength(2);
  });
});
