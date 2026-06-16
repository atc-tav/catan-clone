"use client";

import { GameState, publicVictoryPoints } from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";

/** Player standings: VP, public card counts, knights, and awards. */
export function Standings({
  state,
  aiIds,
  current,
}: {
  state: GameState;
  version: number;
  aiIds: Set<number>;
  current: number;
}) {
  return (
    <div className="standings">
      {state.players.map((p) => {
        const dev = p.devCards
          ? Object.values(p.devCards).reduce((a, b) => a + b, 0) +
            Object.values(p.newDevCards).reduce((a, b) => a + b, 0)
          : 0;
        return (
          <div className={`standrow${p.id === current ? " active" : ""}`} key={p.id}>
            <span className="vpchip">{publicVictoryPoints(state, p.id)}</span>
            <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
            <span className="sname">
              {p.name}
              {aiIds.has(p.id) ? " 🤖" : ""}
            </span>
            <span className="stat" title="resource cards">🂠 {p.resourceCount()}</span>
            <span className="stat" title="dev cards">🃏 {dev}</span>
            <span className="stat" title="knights">🛡 {p.knightsPlayed}</span>
            {state.longestRoadHolder === p.id && <span className="mini" title="Longest Road">🛣</span>}
            {state.largestArmyHolder === p.id && <span className="mini" title="Largest Army">⚔</span>}
          </div>
        );
      })}
    </div>
  );
}
