/**
 * Axial hex coordinates for a pointy-top hex grid.
 *
 * We use the well-known axial (q, r) system (see redblobgames hexagons). All
 * board identity is built on integer coordinates — there is no floating-point
 * geometry in the logic layer, so vertices/edges hash identically everywhere
 * (TS today, C# tomorrow). Pixel positions are derived only at render time.
 */
export interface Hex {
  readonly q: number;
  readonly r: number;
}

export function hex(q: number, r: number): Hex {
  return { q, r };
}

/** Stable string key for use as a Map/Set key. */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * The six axial neighbor directions for a pointy-top grid, ordered
 * counter-clockwise starting from East. Index = "direction".
 *   0:E  1:NE  2:NW  3:W  4:SW  5:SE
 */
export const HEX_DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexAdd(a: Hex, b: Hex): Hex {
  return { q: a.q + b.q, r: a.r + b.r };
}

/** Neighbor of `h` in the given direction (0..5). */
export function hexNeighbor(h: Hex, direction: number): Hex {
  const d = HEX_DIRECTIONS[((direction % 6) + 6) % 6];
  return hexAdd(h, d);
}

/** All six neighbors, ordered by direction. */
export function hexNeighbors(h: Hex): Hex[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

/** Cube-coordinate distance between two hexes. */
export function hexDistance(a: Hex, b: Hex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Converts an axial coordinate to a 2D world position (pointy-top), given a
 * hex "size" (center-to-corner distance). This is the ONLY place coordinates
 * touch floating point, and it is render-only — kept here so the renderer and a
 * future Unity layout share one formula. The logic layer never calls it.
 */
export function hexToWorld(h: Hex, size: number): { x: number; z: number } {
  const x = size * (Math.sqrt(3) * h.q + (Math.sqrt(3) / 2) * h.r);
  const z = size * (1.5 * h.r);
  return { x, z };
}
