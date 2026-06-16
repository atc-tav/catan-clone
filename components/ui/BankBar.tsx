"use client";

import { DevCardType, GamePhase, GameState, RESOURCE_TYPES, ResourceBag } from "@core";
import { RESOURCE_COLOR } from "@/components/three/helpers";
import { RESOURCE_ICON } from "./icons";

export interface BankCallbacks {
  onRoll: () => void;
  onProposeTrade: () => void;
  onOpenDevCards: () => void;
  onEndTurn: () => void;
}

/** Bottom HUD: your resource bank and turn actions. */
export function BankBar({
  state,
  playerId,
  isMyTurn,
  rolling,
  gains,
  gainNonce,
  cb,
}: {
  state: GameState;
  version: number;
  playerId: number;
  isMyTurn: boolean;
  rolling: boolean;
  gains: ResourceBag | null;
  gainNonce: number;
  cb: BankCallbacks;
}) {
  const p = state.player(playerId);
  const phase = state.phase;
  const devCount =
    p.victoryPointCards +
    (Object.values(DevCardType) as DevCardType[]).reduce(
      (n, t) => (t === DevCardType.VictoryPoint ? n : n + p.devCards[t] + p.newDevCards[t]),
      0,
    );

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

        {isMyTurn && (
          <div className="bank-actions">
            {phase === GamePhase.Roll && !rolling && (
              <button className="primary big" onClick={cb.onRoll}>
                🎲 Roll
              </button>
            )}
            {phase === GamePhase.PlayTurn && !rolling && (
              <>
                <button onClick={cb.onProposeTrade}>🤝 Trade</button>
                <button disabled={devCount === 0} onClick={cb.onOpenDevCards}>
                  🃏 Dev cards ({devCount})
                </button>
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
        ? `You rolled ${state.lastRoll.sum} — build (left), trade, dev cards, or end your turn.`
        : "Build (left), trade, play a card, or end your turn.";
    // Robber / discard instructions live in the prominent top banner.
    case GamePhase.MoveRobber:
    case GamePhase.Discard:
      return "";
    case GamePhase.GameOver:
      return `🏆 ${state.currentPlayer.name} wins!`;
    default:
      return "";
  }
}
