"use client";

import {
  COST_CITY,
  COST_DEV_CARD,
  COST_ROAD,
  COST_SETTLEMENT,
  DevCardType,
  GamePhase,
  GameState,
  RESOURCE_TYPES,
  ResourceType,
  publicVictoryPoints,
} from "@core";
import { BoardMode } from "@/components/three/BoardScene";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_COLOR, bankTradeRate } from "@/components/three/helpers";
import { useState } from "react";

export interface HudCallbacks {
  onRoll: () => void;
  onSetBuild: (m: "build-road" | "build-settlement" | "build-city" | null) => void;
  onBuyDev: () => void;
  onPlayKnight: () => void;
  onPlayRoadBuilding: () => void;
  onOpenYearOfPlenty: () => void;
  onOpenMonopoly: () => void;
  onBankTrade: (give: ResourceType, receive: ResourceType) => void;
  onProposeTrade: () => void;
  onEndTurn: () => void;
}

export function Hud({
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
  cb: HudCallbacks;
}) {
  const p = state.currentPlayer;
  const phase = state.phase;
  const canRoll = phase === GamePhase.Roll;
  const inTurn = phase === GamePhase.PlayTurn;
  const devUsed = p.hasPlayedDevCardThisTurn;

  return (
    <div className="hud">
      <div className="hud-head">
        <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
        <strong>{p.name}</strong>
        <span className="vp">{publicVictoryPoints(state, p.id)} VP</span>
      </div>

      <div className="stephint">{stepHint(state, rolling)}</div>

      <div className="hand">
        {rolling ? (
          <span className="muted">collecting…</span>
        ) : (
          RESOURCE_TYPES.map((r) => (
            <span className="chip" key={r} title={r}>
              <span className="cdot" style={{ background: RESOURCE_COLOR[r] }} />
              {p.resources[r]}
            </span>
          ))
        )}
      </div>

      {state.lastRoll && !rolling && (
        <div className="roll">
          🎲 {state.lastRoll.die1} + {state.lastRoll.die2} = <b>{state.lastRoll.sum}</b>
        </div>
      )}

      {phase === GamePhase.GameOver ? (
        <div className="gameover">🏆 {state.player(state.winner!).name} wins!</div>
      ) : phase === GamePhase.MoveRobber ? (
        <p className="prompt">Click a hex to move the robber.</p>
      ) : phase === GamePhase.Discard ? (
        <p className="prompt">Over-limit players must discard (see dialog).</p>
      ) : (
        <>
          {canRoll && (
            <button className="primary" onClick={cb.onRoll}>
              Roll dice
            </button>
          )}

          {inTurn && !rolling && (
            <>
              {freeRoads > 0 && <p className="prompt">{freeRoads} free road(s) to place.</p>}

              <div className="group">
                <div className="group-label">Build</div>
                <BuildBtn
                  label="Road"
                  mode={mode}
                  target="build-road"
                  cost="🌲🧱"
                  enabled={p.roadsLeft > 0 && (freeRoads > 0 || p.hasResources(COST_ROAD))}
                  onSetBuild={cb.onSetBuild}
                />
                <BuildBtn
                  label="Settlement"
                  mode={mode}
                  target="build-settlement"
                  cost="🌲🧱🐑🌾"
                  enabled={p.settlementsLeft > 0 && p.hasResources(COST_SETTLEMENT)}
                  onSetBuild={cb.onSetBuild}
                />
                <BuildBtn
                  label="City"
                  mode={mode}
                  target="build-city"
                  cost="🌾🌾⛰⛰⛰"
                  enabled={p.citiesLeft > 0 && p.hasResources(COST_CITY)}
                  onSetBuild={cb.onSetBuild}
                />
              </div>

              <div className="group">
                <div className="group-label">Development</div>
                <button
                  disabled={!p.hasResources(COST_DEV_CARD) || state.devDeck.length === 0}
                  onClick={cb.onBuyDev}
                >
                  Buy dev card ({state.devDeck.length})
                </button>
                {p.devCards[DevCardType.Knight] > 0 && (
                  <button disabled={devUsed} onClick={cb.onPlayKnight}>
                    Knight ({p.devCards[DevCardType.Knight]})
                  </button>
                )}
                {p.devCards[DevCardType.RoadBuilding] > 0 && (
                  <button disabled={devUsed} onClick={cb.onPlayRoadBuilding}>
                    Road Building ({p.devCards[DevCardType.RoadBuilding]})
                  </button>
                )}
                {p.devCards[DevCardType.YearOfPlenty] > 0 && (
                  <button disabled={devUsed} onClick={cb.onOpenYearOfPlenty}>
                    Year of Plenty ({p.devCards[DevCardType.YearOfPlenty]})
                  </button>
                )}
                {p.devCards[DevCardType.Monopoly] > 0 && (
                  <button disabled={devUsed} onClick={cb.onOpenMonopoly}>
                    Monopoly ({p.devCards[DevCardType.Monopoly]})
                  </button>
                )}
              </div>

              <TradePanel state={state} onBankTrade={cb.onBankTrade} />

              <div className="group">
                <div className="group-label">Player trade</div>
                <button onClick={cb.onProposeTrade}>Propose trade to a player</button>
              </div>

              <button className="primary" onClick={cb.onEndTurn}>
                End turn
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function stepHint(state: GameState, rolling: boolean): string {
  if (rolling) return "🎲 Rolling…";
  switch (state.phase) {
    case GamePhase.Roll:
      return "Roll the dice to begin your turn.";
    case GamePhase.PlayTurn:
      return state.lastRoll?.sum === 7
        ? "Build, trade, or end your turn."
        : `You rolled ${state.lastRoll?.sum ?? ""}. Build, trade, play a card, or end your turn.`;
    case GamePhase.MoveRobber:
      return "Click a highlighted hex to move the robber.";
    case GamePhase.Discard:
      return "Discard down to the hand limit (see dialog).";
    case GamePhase.GameOver:
      return "Game over.";
    default:
      return "";
  }
}

function BuildBtn({
  label,
  cost,
  mode,
  target,
  enabled,
  onSetBuild,
}: {
  label: string;
  cost: string;
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
      title={cost}
    >
      {active ? `▶ ${label}` : label} <span className="cost">{cost}</span>
    </button>
  );
}

function TradePanel({
  state,
  onBankTrade,
}: {
  state: GameState;
  onBankTrade: (give: ResourceType, receive: ResourceType) => void;
}) {
  const [give, setGive] = useState<ResourceType>(ResourceType.Wood);
  const [receive, setReceive] = useState<ResourceType>(ResourceType.Brick);
  const rate = bankTradeRate(state.currentPlayer, give);
  const have = state.currentPlayer.resources[give];
  const canTrade = give !== receive && have >= rate;
  const reason =
    give === receive
      ? "pick two different resources"
      : have < rate
        ? `need ${rate} ${give} (have ${have})`
        : null;

  return (
    <div className="group">
      <div className="group-label">Bank trade ({rate}:1)</div>
      <div className="trade">
        <select value={give} onChange={(e) => setGive(e.target.value as ResourceType)}>
          {RESOURCE_TYPES.map((r) => (
            <option key={r} value={r}>
              give {r}
            </option>
          ))}
        </select>
        <select value={receive} onChange={(e) => setReceive(e.target.value as ResourceType)}>
          {RESOURCE_TYPES.map((r) => (
            <option key={r} value={r}>
              get {r}
            </option>
          ))}
        </select>
        <button disabled={!canTrade} onClick={() => onBankTrade(give, receive)}>
          Trade
        </button>
      </div>
      {reason && <div className="muted">{reason}</div>}
    </div>
  );
}
