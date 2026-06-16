/**
 * A structured, append-only log of everything that happens in a game. The
 * GameManager emits these as it applies actions; the UI renders them (with
 * player colors and resource emojis) as the game log. Pure data — ports to C#
 * as a record/struct hierarchy.
 */
import { ResourceBag } from "../domain/constants.js";
import { DevCardType, ResourceType } from "../domain/enums.js";

export type GameEvent =
  | { kind: "setup-build"; player: number; building: "settlement" | "road" }
  | { kind: "roll"; player: number; die1: number; die2: number; sum: number }
  | { kind: "receive"; player: number; resources: ResourceBag }
  | { kind: "build"; player: number; building: "road" | "settlement" | "city" }
  | { kind: "buy-dev"; player: number }
  | { kind: "play-dev"; player: number; card: DevCardType }
  | { kind: "robber"; player: number }
  | { kind: "steal"; player: number; from: number }
  | { kind: "discard"; player: number; count: number }
  | { kind: "bank-trade"; player: number; give: ResourceType; receive: ResourceType; rate: number }
  | {
      kind: "player-trade";
      player: number;
      partner: number;
      give: ResourceBag;
      receive: ResourceBag;
    }
  | { kind: "award"; player: number; award: "longest-road" | "largest-army" }
  | { kind: "end-turn"; player: number }
  | { kind: "win"; player: number };
