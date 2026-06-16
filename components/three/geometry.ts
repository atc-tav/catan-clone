import { Board } from "@core";
import { TILE_HEIGHT } from "./HexTile";

/** Hex center-to-corner size; must match the HexTile geometry/layout. */
export const SIZE = 1;

/** Y of the tile top surface, where pieces sit. */
export const TOP_Y = TILE_HEIGHT / 2;

/** World position of a vertex, on the tile surface. */
export function vertexPos(board: Board, vk: string): [number, number, number] {
  const { x, z } = board.vertexWorld(vk, SIZE);
  return [x, TOP_Y, z];
}

export interface EdgeTransform {
  position: [number, number, number];
  rotationY: number;
  length: number;
}

/** Midpoint, orientation, and length of an edge (for laying a road box). */
export function edgeTransform(board: Board, ek: string): EdgeTransform {
  const [a, b] = board.verticesOfEdge(ek);
  const pa = board.vertexWorld(a, SIZE);
  const pb = board.vertexWorld(b, SIZE);
  const dx = pb.x - pa.x;
  const dz = pb.z - pa.z;
  return {
    position: [(pa.x + pb.x) / 2, TOP_Y, (pa.z + pb.z) / 2],
    // Rotate the box's local +x axis onto the edge direction (see note in README).
    rotationY: -Math.atan2(dz, dx),
    length: Math.hypot(dx, dz),
  };
}
