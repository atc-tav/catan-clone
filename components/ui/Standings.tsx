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
      <div className="standings-title">🏆 Standings</div>
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
          </div>
        );
      })}
      <div className="awards">
        <AwardPill label="Longest Road" icon="🛣" holder={state.longestRoadHolder} state={state} />
        <AwardPill label="Largest Army" icon="⚔" holder={state.largestArmyHolder} state={state} />
      </div>
    </div>
  );
}

function AwardPill({
  label,
  icon,
  holder,
  state,
}: {
  label: string;
  icon: string;
  holder: number | null;
  state: GameState;
}) {
  const held = holder !== null;
  return (
    <div className={`awardpill${held ? " held" : ""}`}>
      <span>{icon} {label} (+2)</span>
      {held ? (
        <span className="awardholder">
          <span className="dot" style={{ background: PLAYER_COLOR[state.player(holder).color] }} />
          {state.player(holder).name}
        </span>
      ) : (
        <span className="muted">unclaimed</span>
      )}
    </div>
  );
}
