/**
 * Static game configuration: costs, supply limits, and the standard board
 * recipe. Centralized so the rules engine and the future Unity port read from
 * one source of truth (and so house-rule variants are a one-file change).
 */
import { DevCardType, ResourceType, TerrainType } from "./enums.js";

/** A bag of resources, keyed by resource type. */
export type ResourceBag = Record<ResourceType, number>;

export function emptyResourceBag(): ResourceBag {
  return {
    [ResourceType.Wood]: 0,
    [ResourceType.Brick]: 0,
    [ResourceType.Sheep]: 0,
    [ResourceType.Wheat]: 0,
    [ResourceType.Ore]: 0,
  };
}

export function bagFrom(partial: Partial<ResourceBag>): ResourceBag {
  return { ...emptyResourceBag(), ...partial };
}

export function bagTotal(bag: ResourceBag): number {
  return (
    bag[ResourceType.Wood] +
    bag[ResourceType.Brick] +
    bag[ResourceType.Sheep] +
    bag[ResourceType.Wheat] +
    bag[ResourceType.Ore]
  );
}

// --- Build costs -----------------------------------------------------------

export const COST_ROAD: ResourceBag = bagFrom({
  [ResourceType.Wood]: 1,
  [ResourceType.Brick]: 1,
});

export const COST_SETTLEMENT: ResourceBag = bagFrom({
  [ResourceType.Wood]: 1,
  [ResourceType.Brick]: 1,
  [ResourceType.Sheep]: 1,
  [ResourceType.Wheat]: 1,
});

export const COST_CITY: ResourceBag = bagFrom({
  [ResourceType.Wheat]: 2,
  [ResourceType.Ore]: 3,
});

export const COST_DEV_CARD: ResourceBag = bagFrom({
  [ResourceType.Sheep]: 1,
  [ResourceType.Wheat]: 1,
  [ResourceType.Ore]: 1,
});

// --- Per-player piece supply ----------------------------------------------

export const MAX_ROADS = 15;
export const MAX_SETTLEMENTS = 5;
export const MAX_CITIES = 4;

// --- Bank / deck supply ----------------------------------------------------

/** The bank holds 19 of each resource in the base game. */
export const BANK_RESOURCE_COUNT = 19;

/** Development-card deck composition (25 cards total). */
export const DEV_CARD_DECK: Record<DevCardType, number> = {
  [DevCardType.Knight]: 14,
  [DevCardType.VictoryPoint]: 5,
  [DevCardType.RoadBuilding]: 2,
  [DevCardType.YearOfPlenty]: 2,
  [DevCardType.Monopoly]: 2,
};

// --- Win / scoring ---------------------------------------------------------

export const VICTORY_POINTS_TO_WIN = 10;
export const LONGEST_ROAD_MIN = 5;
export const LARGEST_ARMY_MIN = 3;
export const LONGEST_ROAD_VP = 2;
export const LARGEST_ARMY_VP = 2;

/** Hand size above which a 7 forces a discard of half (rounded down). */
export const DISCARD_LIMIT = 7;

// --- Standard board recipe (base game, 19 hexes) ---------------------------

/** Terrain tiles to place: 4 forest, 4 pasture, 4 fields, 3 hills, 3 mountains, 1 desert. */
export const STANDARD_TERRAINS: readonly TerrainType[] = [
  ...Array<TerrainType>(4).fill(TerrainType.Forest),
  ...Array<TerrainType>(4).fill(TerrainType.Pasture),
  ...Array<TerrainType>(4).fill(TerrainType.Fields),
  ...Array<TerrainType>(3).fill(TerrainType.Hills),
  ...Array<TerrainType>(3).fill(TerrainType.Mountains),
  TerrainType.Desert,
];

/** The 18 number tokens dealt to the 18 non-desert tiles. */
export const STANDARD_NUMBER_TOKENS: readonly number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/** Probability "pips" on a number token (how many dice combos roll it). */
export function tokenPips(n: number): number {
  return n === 0 ? 0 : 6 - Math.abs(7 - n);
}
