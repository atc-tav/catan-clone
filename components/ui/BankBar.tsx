"use client";

import { DevCardType, GamePhase, GameState, RESOURCE_TYPES, ResourceBag, ResourceType } from "@core";
import { RESOURCE_COLOR } from "@/components/three/helpers";
import { RESOURCE_ICON } from "./icons";

export interface BankCallbacks {
  onRoll: () => void;
  onProposeTrade: () => void;
  onOpenDevCards: () => void;
  onEndTurn: () => void;
}

const RES_LABEL: Record<ResourceType, string> = {
  [ResourceType.Wood]: "wood",
  [ResourceType.Brick]: "brick",
  [ResourceType.Sheep]: "sheep",
  [ResourceType.Wheat]: "grain",
  [ResourceType.Ore]: "ore",
};

/** Bottom HUD: your resource + dev-card bank (left) and turn actions (right). */
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
  const myPlayTurn = isMyTurn && phase === GamePhase.PlayTurn && !rolling;
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
        <div className="bank-cards">
          {RESOURCE_TYPES.map((r) => {
            const g = gains && gains[r] > 0 ? gains[r] : 0;
            return (
              <div className="bslot" key={r}>
                <div
                  className={`btile${g ? " flash" : ""}`}
                  key={g ? `${r}-${gainNonce}` : r}
                  style={{ background: RESOURCE_COLOR[r] }}
                >
                  {g > 0 && <span className="gain">+{g}</span>}
                  <span className="bicon">{RESOURCE_ICON[r]}</span>
                  <span className="bnum">{rolling ? "…" : p.resources[r]}</span>
                </div>
                <span className="blabel">{RES_LABEL[r]}</span>
              </div>
            );
          })}

          <div className="bslot">
            <button
              className="btile card"
              disabled={devCount === 0}
              onClick={cb.onOpenDevCards}
              title="Review your development cards"
            >
              <span className="bicon">🃏</span>
              <span className="bnum">{devCount}</span>
            </button>
            <span className="blabel">cards</span>
          </div>
        </div>

        <span className="bank-sep" />

        <div className="bank-actions">
          <ActionTile
            icon="🎲"
            label="roll"
            enabled={isMyTurn && phase === GamePhase.Roll && !rolling}
            onClick={cb.onRoll}
          />
          <ActionTile icon="🪙" label="trade" enabled={myPlayTurn} onClick={cb.onProposeTrade} />
          <ActionTile
            icon="🔁"
            label={isMyTurn ? "end turn" : "waiting…"}
            enabled={myPlayTurn}
            primary
            onClick={cb.onEndTurn}
          />
        </div>
      </div>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  enabled,
  primary,
  onClick,
}: {
  icon: string;
  label: string;
  enabled: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="bslot">
      <button className={`btile act${primary ? " primary" : ""}`} disabled={!enabled} onClick={onClick}>
        <span className="bicon">{icon}</span>
      </button>
      <span className="blabel">{label}</span>
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
    // Robber / discard / game-over messaging lives in the prominent top banner
    // (and, for game over, the stats modal).
    case GamePhase.MoveRobber:
    case GamePhase.Discard:
    case GamePhase.GameOver:
      return "";
    default:
      return "";
  }
}
