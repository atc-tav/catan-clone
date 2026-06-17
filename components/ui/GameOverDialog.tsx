"use client";

import { useState } from "react";
import { BuildingType, GameState, RESOURCE_TYPES, ResourceType } from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_ICON } from "./icons";

type Tab = "summary" | "dice" | "resources" | "activity";

/** Derives per-player and global stats from the event log + final board. */
function computeStats(state: GameState) {
  const players = state.players;
  const received = players.map(() => Object.fromEntries(RESOURCE_TYPES.map((r) => [r, 0]))) as Record<
    ResourceType,
    number
  >[];
  const devBought = players.map(() => 0);
  const rolls: number[] = Array(13).fill(0);

  for (const e of state.log) {
    if (e.kind === "roll") rolls[e.sum]++;
    else if (e.kind === "receive") {
      for (const r of RESOURCE_TYPES) received[e.player][r] += e.resources[r];
    } else if (e.kind === "buy-dev") devBought[e.player]++;
  }

  const buildings = players.map(() => ({ settlements: 0, cities: 0 }));
  for (const v of state.board.vertices.values()) {
    if (!v.building) continue;
    if (v.building.type === BuildingType.City) buildings[v.building.owner].cities++;
    else buildings[v.building.owner].settlements++;
  }
  const roads = players.map(() => 0);
  for (const ed of state.board.edges.values()) if (ed.road !== null) roads[ed.road]++;

  const summary = players.map((p) => {
    const b = buildings[p.id];
    const vp =
      b.settlements * 1 +
      b.cities * 2 +
      p.victoryPointCards +
      (state.longestRoadHolder === p.id ? 2 : 0) +
      (state.largestArmyHolder === p.id ? 2 : 0);
    return {
      id: p.id,
      vp,
      settlements: b.settlements,
      cities: b.cities,
      roads: roads[p.id],
      knights: p.knightsPlayed,
      dev: devBought[p.id],
      longestRoad: state.longestRoadHolder === p.id,
      largestArmy: state.largestArmyHolder === p.id,
    };
  });

  const resourceTotals = players.map((_, i) =>
    RESOURCE_TYPES.reduce((n, r) => n + received[i][r], 0),
  );

  return { summary, received, resourceTotals, rolls };
}

export function GameOverDialog({
  state,
  onNewGame,
  onClose,
}: {
  state: GameState;
  onNewGame: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const winner = state.player(state.winner!);
  const { summary, received, resourceTotals, rolls } = computeStats(state);
  const maxRoll = Math.max(1, ...rolls);
  const turns = state.log.filter((e) => e.kind === "end-turn").length;

  return (
    <div className="overlay">
      <div className="endgame">
        <div className="endgame-head">
          <span className="trophy">🏆</span>
          <h2 style={{ color: PLAYER_COLOR[winner.color] }}>{winner.name} wins!</h2>
          <span className="endgame-sub">{turns} turns played</span>
        </div>

        <div className="endtabs">
          {(["summary", "dice", "resources", "activity"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : undefined} onClick={() => setTab(t)}>
              {t === "summary" ? "Summary" : t === "dice" ? "Dice" : t === "resources" ? "Resources" : "Activity"}
            </button>
          ))}
        </div>

        <div className="endbody">
          {tab === "summary" && (
            <table className="endtable">
              <thead>
                <tr>
                  <th></th>
                  <th>🏆 VP</th>
                  <th>🏠</th>
                  <th>🏙</th>
                  <th>🛣</th>
                  <th>⚔️</th>
                  <th>🃏</th>
                  <th>awards</th>
                </tr>
              </thead>
              <tbody>
                {summary
                  .slice()
                  .sort((a, b) => b.vp - a.vp)
                  .map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="dot" style={{ background: PLAYER_COLOR[state.player(s.id).color] }} />
                        {state.player(s.id).name}
                      </td>
                      <td className="big">{s.vp}</td>
                      <td>{s.settlements}</td>
                      <td>{s.cities}</td>
                      <td>{s.roads}</td>
                      <td>{s.knights}</td>
                      <td>{s.dev}</td>
                      <td>
                        {s.longestRoad && "🛣"} {s.largestArmy && "⚔️"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {tab === "dice" && (
            <div className="dicechart">
              {rolls.slice(2).map((c, i) => (
                <div className="dicebar" key={i + 2}>
                  <span className="dicecount">{c}</span>
                  <div className="dicebarfill" style={{ height: `${(c / maxRoll) * 130}px` }} />
                  <span className="dicenum">{i + 2}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "resources" && (
            <table className="endtable">
              <thead>
                <tr>
                  <th></th>
                  <th>total</th>
                  {RESOURCE_TYPES.map((r) => (
                    <th key={r}>{RESOURCE_ICON[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
                      {p.name}
                    </td>
                    <td className="big">{resourceTotals[p.id]}</td>
                    {RESOURCE_TYPES.map((r) => (
                      <td key={r}>{received[p.id][r]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <caption>Resources gained from dice rolls</caption>
            </table>
          )}

          {tab === "activity" && (
            <div className="endactivity muted">
              {state.log.length} logged events — see the game log on the right.
            </div>
          )}
        </div>

        <div className="endgame-actions">
          <button onClick={onClose}>Review board</button>
          <button className="primary" onClick={onNewGame}>
            New game
          </button>
        </div>
      </div>
    </div>
  );
}
