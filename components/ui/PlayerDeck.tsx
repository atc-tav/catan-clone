"use client";

import { DevCardType, GameState, RESOURCE_TYPES, publicVictoryPoints } from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_COLOR } from "@/components/three/helpers";

/** The active player's "deck": resources, development cards, points, awards. */
export function PlayerDeck({
  state,
  rolling,
}: {
  state: GameState;
  version: number;
  rolling: boolean;
}) {
  const p = state.currentPlayer;
  const knights = p.devCards[DevCardType.Knight] + p.newDevCards[DevCardType.Knight];
  const otherDev =
    p.devCards[DevCardType.RoadBuilding] +
    p.devCards[DevCardType.YearOfPlenty] +
    p.devCards[DevCardType.Monopoly] +
    p.newDevCards[DevCardType.RoadBuilding] +
    p.newDevCards[DevCardType.YearOfPlenty] +
    p.newDevCards[DevCardType.Monopoly];

  return (
    <div className="deck">
      <div className="deck-head">
        <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
        <strong>{p.name}</strong>
        <span className="vp">{publicVictoryPoints(state, p.id)} VP</span>
      </div>

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

      <div className="deck-row">
        <span className="chip" title="Knight cards">🛡 {knights}</span>
        <span className="chip" title="Other dev cards">🃏 {otherDev}</span>
        <span className="chip" title="Victory-point cards">⭐ {p.victoryPointCards}</span>
        {state.longestRoadHolder === p.id && <span className="badge">Longest Road</span>}
        {state.largestArmyHolder === p.id && <span className="badge">Largest Army</span>}
      </div>
    </div>
  );
}
