"use client";

import { COST_CITY, COST_DEV_CARD, COST_ROAD, COST_SETTLEMENT, GamePhase, GameState } from "@core";
import { BoardMode } from "@/components/three/BoardScene";

export interface ActionCallbacks {
  onRoll: () => void;
  onSetBuild: (m: "build-road" | "build-settlement" | "build-city" | null) => void;
  onBuyDev: () => void;
  onOpenBankTrade: () => void;
  onProposeTrade: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  state,
  mode,
  freeRoads,
  rolling,
  cb,
}: {
  state: GameState;
  version: number;
  mode: BoardMode;
  freeRoads: number;
  rolling: boolean;
  cb: ActionCallbacks;
}) {
  const p = state.currentPlayer;
  const phase = state.phase;

  return (
    <div className="actionbar">
      <div className="stephint">{stepHint(state, rolling)}</div>

      {phase === GamePhase.Roll && !rolling && (
        <div className="actions">
          <button className="primary big" onClick={cb.onRoll}>
            🎲 Roll dice
          </button>
        </div>
      )}

      {phase === GamePhase.PlayTurn && !rolling && (
        <div className="actions">
          {freeRoads > 0 && <span className="prompt">{freeRoads} free road(s)</span>}

          <BuildBtn
            label="🛣 Road"
            mode={mode}
            target="build-road"
            enabled={p.roadsLeft > 0 && (freeRoads > 0 || p.hasResources(COST_ROAD))}
            onSetBuild={cb.onSetBuild}
          />
          <BuildBtn
            label="🏠 Settlement"
            mode={mode}
            target="build-settlement"
            enabled={p.settlementsLeft > 0 && p.hasResources(COST_SETTLEMENT)}
            onSetBuild={cb.onSetBuild}
          />
          <BuildBtn
            label="🏙 City"
            mode={mode}
            target="build-city"
            enabled={p.citiesLeft > 0 && p.hasResources(COST_CITY)}
            onSetBuild={cb.onSetBuild}
          />

          <span className="sep" />

          <button disabled={!p.hasResources(COST_DEV_CARD) || state.devDeck.length === 0} onClick={cb.onBuyDev}>
            🃏 Buy dev
          </button>
          <button onClick={cb.onOpenBankTrade}>🏦 Bank</button>
          <button onClick={cb.onProposeTrade}>🤝 Trade</button>

          <span className="sep" />

          <button className="primary" onClick={cb.onEndTurn}>
            End turn ▶
          </button>
        </div>
      )}
    </div>
  );
}

function BuildBtn({
  label,
  mode,
  target,
  enabled,
  onSetBuild,
}: {
  label: string;
  mode: BoardMode;
  target: "build-road" | "build-settlement" | "build-city";
  enabled: boolean;
  onSetBuild: (m: "build-road" | "build-settlement" | "build-city" | null) => void;
}) {
  const active = mode === target;
  return (
    <button
      className={active ? "active" : undefined}
      disabled={!enabled && !active}
      onClick={() => onSetBuild(active ? null : target)}
    >
      {active ? `▶ ${label}` : label}
    </button>
  );
}

function stepHint(state: GameState, rolling: boolean): string {
  if (rolling) return "🎲 Rolling…";
  switch (state.phase) {
    case GamePhase.Roll:
      return "Roll the dice to begin your turn.";
    case GamePhase.PlayTurn:
      return state.lastRoll && state.lastRoll.sum !== 7
        ? `You rolled ${state.lastRoll.sum} — build, trade, play a card, or end your turn.`
        : "Build, trade, play a card, or end your turn.";
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
