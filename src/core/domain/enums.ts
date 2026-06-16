/**
 * Core game enumerations. String-valued for readable logs/serialization; each
 * maps directly onto a C# `enum` in the Unity port.
 */

export enum TerrainType {
  Forest = "Forest", // produces Wood
  Hills = "Hills", // produces Brick
  Pasture = "Pasture", // produces Sheep
  Fields = "Fields", // produces Wheat
  Mountains = "Mountains", // produces Ore
  Desert = "Desert", // produces nothing
}

export enum ResourceType {
  Wood = "Wood",
  Brick = "Brick",
  Sheep = "Sheep",
  Wheat = "Wheat",
  Ore = "Ore",
}

export const RESOURCE_TYPES: readonly ResourceType[] = [
  ResourceType.Wood,
  ResourceType.Brick,
  ResourceType.Sheep,
  ResourceType.Wheat,
  ResourceType.Ore,
];

/** The resource a terrain produces, or null for the desert. */
export function terrainResource(t: TerrainType): ResourceType | null {
  switch (t) {
    case TerrainType.Forest:
      return ResourceType.Wood;
    case TerrainType.Hills:
      return ResourceType.Brick;
    case TerrainType.Pasture:
      return ResourceType.Sheep;
    case TerrainType.Fields:
      return ResourceType.Wheat;
    case TerrainType.Mountains:
      return ResourceType.Ore;
    case TerrainType.Desert:
      return null;
  }
}

export enum DevCardType {
  Knight = "Knight",
  VictoryPoint = "VictoryPoint",
  RoadBuilding = "RoadBuilding",
  YearOfPlenty = "YearOfPlenty",
  Monopoly = "Monopoly",
}

export enum BuildingType {
  Settlement = "Settlement",
  City = "City",
}

export enum PlayerColor {
  Red = "Red",
  Blue = "Blue",
  White = "White",
  Orange = "Orange",
}

/** A trading port. Generic = 3:1 any resource; otherwise 2:1 for that resource. */
export enum PortType {
  Generic = "Generic",
  Wood = "Wood",
  Brick = "Brick",
  Sheep = "Sheep",
  Wheat = "Wheat",
  Ore = "Ore",
}

/** High-level state-machine phase. See GameManager for transitions. */
export enum GamePhase {
  /** Initial snake-draft placement of two settlements + two roads each. */
  Setup = "Setup",
  /** Current player must roll the dice. */
  Roll = "Roll",
  /** A 7 (or knight) was played; players over the hand limit must discard. */
  Discard = "Discard",
  /** Current player must move the robber and (optionally) steal. */
  MoveRobber = "MoveRobber",
  /** Current player may build/trade/play cards, then end the turn. */
  PlayTurn = "PlayTurn",
  /** Someone reached the victory-point target. */
  GameOver = "GameOver",
}
