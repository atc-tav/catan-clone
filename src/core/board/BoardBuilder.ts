/**
 * Deterministic construction of the standard base-game board from a seed.
 *
 * Given the same Rng, this produces an identical board every time — terrain
 * layout, number tokens, and port arrangement included. That reproducibility is
 * what lets tests assert against fixed boards and what will let the Unity port
 * render the exact same game from the same seed.
 */
import { Rng } from "../rng/Rng.js";
import { Hex, hex, hexDistance, hexKey } from "../coordinates/Hex.js";
import { hexSide } from "../coordinates/Intersections.js";
import {
  STANDARD_NUMBER_TOKENS,
  STANDARD_TERRAINS,
} from "../domain/constants.js";
import { PortType, TerrainType } from "../domain/enums.js";
import { Board, Tile } from "./Board.js";

export interface BoardOptions {
  /** Re-roll token placement until no two red (6/8) tokens are adjacent. */
  avoidAdjacentRedTokens?: boolean;
}

/** The 9 standard ports: four 3:1 generic and one 2:1 per resource. */
const STANDARD_PORTS: readonly PortType[] = [
  PortType.Generic,
  PortType.Generic,
  PortType.Generic,
  PortType.Generic,
  PortType.Wood,
  PortType.Brick,
  PortType.Sheep,
  PortType.Wheat,
  PortType.Ore,
];

/** All axial coordinates within distance 2 of the center — the 19-hex board. */
export function standardHexLayout(): Hex[] {
  const result: Hex[] = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (hexDistance(hex(0, 0), hex(q, r)) <= 2) result.push(hex(q, r));
    }
  }
  return result;
}

export function buildStandardBoard(rng: Rng, options: BoardOptions = {}): Board {
  const coords = standardHexLayout();
  const terrains = rng.shuffle([...STANDARD_TERRAINS]);

  const tiles: Tile[] = coords.map((coord, i) => ({
    coord,
    key: hexKey(coord),
    terrain: terrains[i],
    numberToken: 0,
  }));

  assignNumberTokens(rng, tiles, options.avoidAdjacentRedTokens ?? true);

  const desert = tiles.find((t) => t.terrain === TerrainType.Desert)!;
  const board = new Board(tiles, desert.key); // robber starts on the desert

  assignPorts(rng, board);
  return board;
}

function assignNumberTokens(rng: Rng, tiles: Tile[], avoidAdjacentRed: boolean): void {
  const nonDesert = tiles.filter((t) => t.terrain !== TerrainType.Desert);

  for (let attempt = 0; attempt < 100; attempt++) {
    const tokens = rng.shuffle([...STANDARD_NUMBER_TOKENS]);
    nonDesert.forEach((t, i) => (t.numberToken = tokens[i]));
    if (!avoidAdjacentRed || !hasAdjacentRedTokens(tiles)) return;
  }
  // Fall through: keep the last arrangement even if constraint unmet.
}

function isRed(n: number): boolean {
  return n === 6 || n === 8;
}

function hasAdjacentRedTokens(tiles: Tile[]): boolean {
  const byKey = new Map(tiles.map((t) => [t.key, t]));
  for (const t of tiles) {
    if (!isRed(t.numberToken)) continue;
    for (let dir = 0; dir < 6; dir++) {
      const e = hexSide(t.coord, dir);
      const neighborHex = e.hexes.find((h) => hexKey(h) !== t.key)!;
      const neighbor = byKey.get(hexKey(neighborHex));
      if (neighbor && isRed(neighbor.numberToken)) return true;
    }
  }
  return false;
}

/**
 * Places the 9 ports on perimeter edges, spread evenly around the ring, and
 * grants the port to both vertices of each chosen edge. Edge selection is by
 * angle around the board center so ports never bunch up.
 */
function assignPorts(rng: Rng, board: Board): void {
  const perimeter = Array.from(board.edges.values())
    .filter((e) => board.isPerimeterEdge(e.key))
    .map((e) => {
      const w = edgeWorld(board, e.key);
      return { key: e.key, angle: Math.atan2(w.z, w.x) };
    })
    .sort((a, b) => a.angle - b.angle);

  const portTypes = rng.shuffle([...STANDARD_PORTS]);
  const count = portTypes.length;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i * perimeter.length) / count);
    const edge = perimeter[idx];
    for (const vk of board.verticesOfEdge(edge.key)) {
      const vertex = board.vertices.get(vk)!;
      if (vertex.port === null) vertex.port = portTypes[i];
    }
  }
}

function edgeWorld(board: Board, ek: string): { x: number; z: number } {
  const verts = board.verticesOfEdge(ek);
  let x = 0;
  let z = 0;
  for (const vk of verts) {
    const w = board.vertexWorld(vk, 1);
    x += w.x;
    z += w.z;
  }
  return { x: x / verts.length, z: z / verts.length };
}
