"use client";

import { DevCardType, GamePhase, GameState, RESOURCE_TYPES, ResourceBag } from "@core";
import { RESOURCE_COLOR } from "@/components/three/helpers";
import { DEV_ICON, DEV_LABEL, RESOURCE_ICON } from "./icons";

export interface BankCallbacks {
  onRoll: () => void;
  onOpenBankTrade: () => void;
  onProposeTrade: () => void;
  onEndTurn: () => void;
  onPlayKnight: () => void;
  onPlayRoadBuilding: () => void;
  onYearOfPlenty: () => void;
  onMonopoly: () => void;
}

const PLAYABLE: { type: DevCardType; onKey: keyof BankCallbacks }[] = [
  { type: DevCardType.Knight, onKey: "onPlayKnight" },
  { type: DevCardType.RoadBuilding, onKey: "onPlayRoadBuilding" },
  { type: DevCardType.YearOfPlenty, onKey: "onYearOfPlenty" },
  { type: DevCardType.Monopoly, onKey: "onMonopoly" },
];

/** Bottom HUD: your resource bank, development cards, and turn actions. */
export function BankBar({
  state,
  playerId,
  isMyTurn,
  rolling,
  gains,
  gainNonce,
  canPlayDev,
  cb,
}: {
  state: GameState;
  version: number;
  playerId: number;
  isMyTurn: boolean;
  rolling: boolean;
  gains: ResourceBag | null;
  gainNonce: number;
  canPlayDev: boolean;
  cb: BankCallbacks;
}) {
  const p = state.player(playerId);
  const phase = state.phase;
  const held = (t: DevCardType) => p.devCards[t] + p.newDevCards[t];

  return (
    <div className="bankbar">
      <div className="stephint">{stepHint(state, isMyTurn, rolling)}</div>

      <div className="bank-main">
        <div className="tokens">
          {RESOURCE_TYPES.map((r) => {
            const g = gains && gains[r] > 0 ? gains[r] : 0;
            return (
              <div
                className={`restoken${g ? " flash" : ""}`}
                key={g ? `${r}-${gainNonce}` : r}
                style={{ background: RESOURCE_COLOR[r] }}
                title={r}
              >
                {g > 0 && <span className="gain">+{g}</span>}
                <span className="tokicon">{RESOURCE_ICON[r]}</span>
                <span className="tokcount">{rolling ? "…" : p.resources[r]}</span>
              </div>
            );
          })}
        </div>

        <div className="devcards">
          {PLAYABLE.map(({ type, onKey }) =>
            held(type) > 0 ? (
              <button
                key={type}
                className="devcard"
                disabled={!canPlayDev || p.devCards[type] === 0}
                onClick={cb[onKey]}
                title={p.devCards[type] === 0 ? `${DEV_LABEL[type]} (bought this turn)` : `Play ${DEV_LABEL[type]}`}
              >
                <span className="devicon">{DEV_ICON[type]}</span>
                <span className="devcount">{held(type)}</span>
              </button>
            ) : null,
          )}
          {p.victoryPointCards > 0 && (
            <div className="devcard vp-card" title="Victory Point">
              <span className="devicon">⭐</span>
              <span className="devcount">{p.victoryPointCards}</span>
            </div>
          )}
        </div>

        {isMyTurn && (
          <div className="bank-actions">
            {phase === GamePhase.Roll && !rolling && (
              <button className="primary big" onClick={cb.onRoll}>
                🎲 Roll
              </button>
            )}
            {phase === GamePhase.PlayTurn && !rolling && (
              <>
                <button onClick={cb.onOpenBankTrade}>🏦 Bank</button>
                <button onClick={cb.onProposeTrade}>🤝 Trade</button>
                <button className="primary" onClick={cb.onEndTurn}>
                  End turn ▶
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function stepHint(state: GameState, isMyTurn: boolean, rolling: boolean): string {
  if (rolling) return "🎲 Rolling…";
  if (!isMyTurn && state.phase !== GamePhase.GameOver) return `${state.currentPlayer.name} is playing…`;
  switch (state.phase) {
    case GamePhase.Roll:
      return "Roll the dice to begin your turn.";
    case GamePhase.PlayTurn:
      return state.lastRoll && state.lastRoll.sum !== 7
        ? `You rolled ${state.lastRoll.sum} — build (left), trade, or end your turn.`
        : "Build (left), trade, play a card, or end your turn.";
    case GamePhase.MoveRobber:
      return "Click a highlighted hex to move the robber.";
    case GamePhase.Discard:
      return "Discard down to the hand limit (see dialog).";
    case GamePhase.GameOver:
      return `🏆 ${state.currentPlayer.name} wins!`;
    default:
      return "";
  }
}
