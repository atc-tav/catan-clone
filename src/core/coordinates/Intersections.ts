/**
 * Canonical identity for board vertices (corners) and edges (sides).
 *
 * The trick that makes the board portable and bug-free: instead of giving every
 * corner an ad-hoc index, we identify a corner by the *set of hexes that meet
 * there*. A vertex is where up to three hexes touch, so it is identified by an
 * (unordered) triple of hex coordinates; an edge is shared by two hexes, so it
 * is an (unordered) pair. We canonicalize by sorting the coordinates, giving a
 * single stable key no matter which hex you approached the corner from.
 *
 * Border corners/edges include "phantom" off-board hex coordinates in their
 * key. That is intentional: the coordinates are used purely for identity, never
 * looked up as tiles, and they guarantee that two real tiles agree on the
 * identity of the corner/edge they share.
 *
 * Everything here is pure integer math derived from {@link Hex}, so it ports to
 * C# unchanged (a `VertexCoord` becomes a small immutable struct/record).
 */
import {
  Hex,
  hexEquals,
  hexKey,
  hexNeighbor,
  hexNeighbors,
} from "./Hex.js";

function compareHex(a: Hex, b: Hex): number {
  return a.q !== b.q ? a.q - b.q : a.r - b.r;
}

/** A board corner, identified by the (up to three) hexes meeting at it. */
export interface VertexCoord {
  readonly hexes: readonly [Hex, Hex, Hex];
}

/** A board edge/side, identified by the two hexes sharing it. */
export interface EdgeCoord {
  readonly hexes: readonly [Hex, Hex];
}

export function makeVertex(a: Hex, b: Hex, c: Hex): VertexCoord {
  const sorted = [a, b, c].sort(compareHex);
  return { hexes: [sorted[0], sorted[1], sorted[2]] };
}

export function makeEdge(a: Hex, b: Hex): EdgeCoord {
  const sorted = [a, b].sort(compareHex);
  return { hexes: [sorted[0], sorted[1]] };
}

export function vertexKey(v: VertexCoord): string {
  return v.hexes.map(hexKey).join("|");
}

export function edgeKey(e: EdgeCoord): string {
  return e.hexes.map(hexKey).join("|");
}

/**
 * The vertex at corner `i` (0..5) of a hex: the meeting point of the hex and
 * its two neighbors in directions `i` and `i+1`.
 */
export function hexCorner(h: Hex, corner: number): VertexCoord {
  const i = ((corner % 6) + 6) % 6;
  return makeVertex(h, hexNeighbor(h, i), hexNeighbor(h, (i + 1) % 6));
}

/** The edge on side `i` (0..5) of a hex: shared with its neighbor in direction `i`. */
export function hexSide(h: Hex, side: number): EdgeCoord {
  const i = ((side % 6) + 6) % 6;
  return makeEdge(h, hexNeighbor(h, i));
}

/** The two hexes that are neighbors of BOTH endpoints of an edge (exactly two). */
function commonNeighbors(a: Hex, b: Hex): Hex[] {
  const bn = hexNeighbors(b);
  return hexNeighbors(a).filter((n) => bn.some((m) => hexEquals(n, m)));
}

/** The three edges incident to a vertex (the pairs among its three hexes). */
export function vertexEdges(v: VertexCoord): EdgeCoord[] {
  const [a, b, c] = v.hexes;
  return [makeEdge(a, b), makeEdge(b, c), makeEdge(a, c)];
}

/** The two vertices at the ends of an edge. */
export function edgeVertices(e: EdgeCoord): VertexCoord[] {
  const [a, b] = e.hexes;
  return commonNeighbors(a, b).map((c) => makeVertex(a, b, c));
}

/** The (up to three) vertices adjacent to a vertex via a shared edge. */
export function adjacentVertices(v: VertexCoord): VertexCoord[] {
  const self = vertexKey(v);
  const result: VertexCoord[] = [];
  for (const e of vertexEdges(v)) {
    for (const w of edgeVertices(e)) {
      if (vertexKey(w) !== self) result.push(w);
    }
  }
  return result;
}
