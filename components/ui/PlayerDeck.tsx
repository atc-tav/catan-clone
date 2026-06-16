"use client";

import { DevCardType, GameState, RESOURCE_TYPES, ResourceType, publicVictoryPoints } from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_COLOR } from "@/components/three/helpers";

const RESOURCE_ICON: Record<ResourceType, string> = {
  [ResourceType.Wood]: "🌲",
  [ResourceType.Brick]: "🧱",
  [ResourceType.Sheep]: "🐑",
  [ResourceType.Wheat]: "🌾",
  [ResourceType.Ore]: "⛰",
};

export interface DevCallbacks {
  onPlayKnight: () => void;
  onPlayRoadBuilding: () => void;
  onYearOfPlenty: () => void;
  onMonopoly: () => void;
}

/** The human player's hand: resource cards, development cards, points, awards. */
export function PlayerDeck({
  state,
  playerId,
  canPlayDev,
  rolling,
  dev,
}: {
  state: GameState;
  version: number;
  playerId: number;
  canPlayDev: boolean;
  rolling: boolean;
  dev: DevCallbacks;
}) {
  const p = state.player(playerId);
  const held = (t: DevCardType) => p.devCards[t] + p.newDevCards[t];

  const devCards: { type: DevCardType; icon: string; label: string; onPlay?: () => void }[] = [
    { type: DevCardType.Knight, icon: "🛡", label: "Knight", onPlay: dev.onPlayKnight },
    { type: DevCardType.RoadBuilding, icon: "🛣", label: "Road Building", onPlay: dev.onPlayRoadBuilding },
    { type: DevCardType.YearOfPlenty, icon: "🌾", label: "Year of Plenty", onPlay: dev.onYearOfPlenty },
    { type: DevCardType.Monopoly, icon: "💰", label: "Monopoly", onPlay: dev.onMonopoly },
  ];

  return (
    <div className="deck">
      <div className="deck-head">
        <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
        <strong>{p.name}</strong>
        <span className="vp">{publicVictoryPoints(state, p.id)} VP</span>
      </div>

      <div className="cardrow">
        {RESOURCE_TYPES.map((r) => (
          <div className="rescard" key={r} style={{ borderTopColor: RESOURCE_COLOR[r] }} title={r}>
            <span className="resicon">{RESOURCE_ICON[r]}</span>
            <span className="rescount">{rolling ? "…" : p.resources[r]}</span>
          </div>
        ))}
      </div>

      <div className="cardrow devrow">
        {devCards.map((d) =>
          held(d.type) > 0 ? (
            <button
              key={d.type}
              className="devcard"
              disabled={!canPlayDev || p.devCards[d.type] === 0}
              onClick={d.onPlay}
              title={p.devCards[d.type] === 0 ? `${d.label} (bought this turn)` : d.label}
            >
              <span className="devicon">{d.icon}</span>
              <span className="devcount">{held(d.type)}</span>
            </button>
          ) : null,
        )}
        {p.victoryPointCards > 0 && (
          <div className="devcard vp-card" title="Victory Point">
            <span className="devicon">⭐</span>
            <span className="devcount">{p.victoryPointCards}</span>
          </div>
        )}
        {held(DevCardType.Knight) +
          held(DevCardType.RoadBuilding) +
          held(DevCardType.YearOfPlenty) +
          held(DevCardType.Monopoly) +
          p.victoryPointCards ===
          0 && <span className="muted">no dev cards</span>}
      </div>

      <div className="deck-row">
        {state.longestRoadHolder === p.id && <span className="badge">Longest Road</span>}
        {state.largestArmyHolder === p.id && <span className="badge">Largest Army</span>}
        <span className="muted">knights played: {p.knightsPlayed}</span>
      </div>
    </div>
  );
}
