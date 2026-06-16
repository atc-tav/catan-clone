/**
 * A player's private/aggregate state. Pieces actually placed on the board live
 * on the Board (a vertex knows its owner); the Player tracks the hand, the
 * development cards, and the remaining piece supply.
 */
import { DevCardType, PlayerColor, PortType, ResourceType } from "./enums.js";
import {
  emptyResourceBag,
  MAX_CITIES,
  MAX_ROADS,
  MAX_SETTLEMENTS,
  ResourceBag,
} from "./constants.js";

export class Player {
  readonly id: number;
  readonly color: PlayerColor;
  readonly name: string;

  resources: ResourceBag = emptyResourceBag();

  /** Dev cards available to play (bought on a previous turn). */
  devCards: Record<DevCardType, number> = emptyDevCards();
  /** Dev cards bought THIS turn — cannot be played until next turn. */
  newDevCards: Record<DevCardType, number> = emptyDevCards();

  /** Knights played (drives Largest Army). */
  knightsPlayed = 0;
  /** Hidden victory-point dev cards held. */
  victoryPointCards = 0;
  /** Whether a development card has already been played this turn. */
  hasPlayedDevCardThisTurn = false;

  /** Remaining unplaced pieces in this player's supply. */
  roadsLeft = MAX_ROADS;
  settlementsLeft = MAX_SETTLEMENTS;
  citiesLeft = MAX_CITIES;

  /** Trading ports this player has reached with a settlement/city. */
  ports: Set<PortType> = new Set();

  constructor(id: number, color: PlayerColor, name: string) {
    this.id = id;
    this.color = color;
    this.name = name;
  }

  resourceCount(): number {
    return (
      this.resources[ResourceType.Wood] +
      this.resources[ResourceType.Brick] +
      this.resources[ResourceType.Sheep] +
      this.resources[ResourceType.Wheat] +
      this.resources[ResourceType.Ore]
    );
  }

  hasResources(cost: ResourceBag): boolean {
    return (
      this.resources[ResourceType.Wood] >= cost[ResourceType.Wood] &&
      this.resources[ResourceType.Brick] >= cost[ResourceType.Brick] &&
      this.resources[ResourceType.Sheep] >= cost[ResourceType.Sheep] &&
      this.resources[ResourceType.Wheat] >= cost[ResourceType.Wheat] &&
      this.resources[ResourceType.Ore] >= cost[ResourceType.Ore]
    );
  }

  addResource(type: ResourceType, amount: number): void {
    this.resources[type] += amount;
  }

  /** Pays a cost. Caller must check {@link hasResources} first. */
  pay(cost: ResourceBag): void {
    for (const type of Object.keys(cost) as ResourceType[]) {
      this.resources[type] -= cost[type];
    }
  }

  totalDevCards(): number {
    return totalCards(this.devCards) + totalCards(this.newDevCards);
  }

  /** Total number of dev cards usable to play right now (not bought this turn). */
  playableDevCards(type: DevCardType): number {
    return this.devCards[type];
  }
}

function emptyDevCards(): Record<DevCardType, number> {
  return {
    [DevCardType.Knight]: 0,
    [DevCardType.VictoryPoint]: 0,
    [DevCardType.RoadBuilding]: 0,
    [DevCardType.YearOfPlenty]: 0,
    [DevCardType.Monopoly]: 0,
  };
}

function totalCards(cards: Record<DevCardType, number>): number {
  return (
    cards[DevCardType.Knight] +
    cards[DevCardType.VictoryPoint] +
    cards[DevCardType.RoadBuilding] +
    cards[DevCardType.YearOfPlenty] +
    cards[DevCardType.Monopoly]
  );
}
