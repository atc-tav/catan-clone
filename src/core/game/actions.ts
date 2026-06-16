/**
 * The command pattern: every player intent is a plain, serializable data object
 * with a discriminating `type`. The GameManager is the only thing that mutates
 * state, and it does so exclusively in response to these actions. This is the
 * single most important pattern for the project's goals:
 *
 *   - It keeps all rules in one place (the manager), so the Unity port reuses
 *     the exact same decision logic — only the input source changes.
 *   - Actions are trivially serializable, which is the seam for future online
 *     play, replays, and AI (an AI is just something that emits actions).
 *
 * In C# this maps to a sealed record hierarchy handled by a switch expression.
 */
import { ResourceBag } from "../domain/constants.js";
import { ResourceType } from "../domain/enums.js";

export interface PlaceSetupSettlementAction {
  type: "PlaceSetupSettlement";
  playerId: number;
  vertex: string;
}

export interface PlaceSetupRoadAction {
  type: "PlaceSetupRoad";
  playerId: number;
  edge: string;
}

export interface RollDiceAction {
  type: "RollDice";
  playerId: number;
}

export interface BuildSettlementAction {
  type: "BuildSettlement";
  playerId: number;
  vertex: string;
}

export interface BuildCityAction {
  type: "BuildCity";
  playerId: number;
  vertex: string;
}

export interface BuildRoadAction {
  type: "BuildRoad";
  playerId: number;
  edge: string;
}

export interface BuyDevCardAction {
  type: "BuyDevCard";
  playerId: number;
}

export interface PlayKnightAction {
  type: "PlayKnight";
  playerId: number;
}

export interface PlayRoadBuildingAction {
  type: "PlayRoadBuilding";
  playerId: number;
}

export interface PlayYearOfPlentyAction {
  type: "PlayYearOfPlenty";
  playerId: number;
  resources: [ResourceType, ResourceType];
}

export interface PlayMonopolyAction {
  type: "PlayMonopoly";
  playerId: number;
  resource: ResourceType;
}

export interface MoveRobberAction {
  type: "MoveRobber";
  playerId: number;
  hex: string;
  /** Player id to steal from, or null if no valid victim. */
  stealFrom: number | null;
}

export interface DiscardAction {
  type: "Discard";
  playerId: number;
  resources: ResourceBag;
}

export interface BankTradeAction {
  type: "BankTrade";
  playerId: number;
  give: ResourceType;
  receive: ResourceType;
}

/**
 * A direct, mutually-agreed swap between the active player and one other.
 * Negotiation (offer/accept) happens in the UI; this action executes the deal
 * both sides settled on. `give`/`receive` are from the proposer's perspective.
 */
export interface PlayerTradeAction {
  type: "PlayerTrade";
  playerId: number; // proposer (must be the current player)
  partnerId: number; // the player who accepted
  give: ResourceBag; // resources the proposer hands over
  receive: ResourceBag; // resources the proposer gets back
}

export interface EndTurnAction {
  type: "EndTurn";
  playerId: number;
}

export type GameAction =
  | PlaceSetupSettlementAction
  | PlaceSetupRoadAction
  | RollDiceAction
  | BuildSettlementAction
  | BuildCityAction
  | BuildRoadAction
  | BuyDevCardAction
  | PlayKnightAction
  | PlayRoadBuildingAction
  | PlayYearOfPlentyAction
  | PlayMonopolyAction
  | MoveRobberAction
  | DiscardAction
  | BankTradeAction
  | PlayerTradeAction
  | EndTurnAction;
