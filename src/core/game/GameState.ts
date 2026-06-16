/**
 * The complete, serializable snapshot of a game in progress. This is the
 * "model" — pure data, no behavior beyond trivial helpers. The GameManager
 * reads and mutates it; the renderer reads it. Keeping behavior out of the
 * state object is what makes it cheap to serialize and to mirror in C#.
 */
import { Board } from "../board/Board.js";
import { Player } from "../domain/Player.js";
import { Rng } from "../rng/Rng.js";
import {
  BANK_RESOURCE_COUNT,
  ResourceBag,
  bagFrom,
} from "../domain/constants.js";
import { DevCardType, GamePhase, ResourceType } from "../domain/enums.js";

export interface DiceRoll {
  die1: number;
  die2: number;
  sum: number;
}

export class GameState {
  readonly board: Board;
  readonly players: Player[];
  readonly rng: Rng;

  phase: GamePhase = GamePhase.Setup;
  currentPlayerIndex = 0;
  turnNumber = 0;

  /** The most recent dice roll, or null before the first roll of a turn. */
  lastRoll: DiceRoll | null = null;
  /** Whether the current player has rolled yet this turn. */
  hasRolled = false;

  /** Bank resource supply. */
  bank: ResourceBag = bagFrom({
    [ResourceType.Wood]: BANK_RESOURCE_COUNT,
    [ResourceType.Brick]: BANK_RESOURCE_COUNT,
    [ResourceType.Sheep]: BANK_RESOURCE_COUNT,
    [ResourceType.Wheat]: BANK_RESOURCE_COUNT,
    [ResourceType.Ore]: BANK_RESOURCE_COUNT,
  });

  /** Development-card draw pile (top = end of array). */
  devDeck: DevCardType[] = [];

  // Awards.
  longestRoadHolder: number | null = null;
  longestRoadLength = 0;
  largestArmyHolder: number | null = null;
  largestArmySize = 0;

  winner: number | null = null;

  // --- Setup-phase bookkeeping ---------------------------------------------
  /** Snake-draft order of player ids, e.g. [0,1,2,3,3,2,1,0]. */
  setupQueue: number[] = [];
  setupQueuePos = 0;
  setupSubStep: "settlement" | "road" = "settlement";
  /** The settlement just placed in setup, that the next road must connect to. */
  lastSetupVertex: string | null = null;

  // --- Mid-action bookkeeping ----------------------------------------------
  /** Player id -> number of cards they still must discard (7 rolled). */
  pendingDiscards = new Map<number, number>();
  /** Free roads remaining from a Road Building card. */
  freeRoadsRemaining = 0;

  constructor(board: Board, players: Player[], rng: Rng) {
    this.board = board;
    this.players = players;
    this.rng = rng;
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  player(id: number): Player {
    return this.players[id];
  }
}
