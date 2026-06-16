import { TerrainType } from "@core";

/** Display colors for each terrain. Render-only; lives outside the core. */
export const TERRAIN_COLOR: Record<TerrainType, string> = {
  [TerrainType.Forest]: "#2e7d32",
  [TerrainType.Pasture]: "#7cb342",
  [TerrainType.Fields]: "#f4c542",
  [TerrainType.Hills]: "#c75b27",
  [TerrainType.Mountains]: "#8d99a6",
  [TerrainType.Desert]: "#e6d9a8",
};

export const TERRAIN_LABEL: Record<TerrainType, string> = {
  [TerrainType.Forest]: "Forest (wood)",
  [TerrainType.Pasture]: "Pasture (sheep)",
  [TerrainType.Fields]: "Fields (wheat)",
  [TerrainType.Hills]: "Hills (brick)",
  [TerrainType.Mountains]: "Mountains (ore)",
  [TerrainType.Desert]: "Desert",
};

/** Number tokens with the highest probability (6, 8) are drawn in red. */
export function tokenColor(n: number): string {
  return n === 6 || n === 8 ? "#c0392b" : "#2b2b2b";
}
