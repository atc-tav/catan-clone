"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { GameManager, GamePhase, GameState, TerrainType } from "@core";
import { PLAYER_COLOR, TERRAIN_COLOR, TERRAIN_LABEL } from "@/components/three/colors";

// Three.js touches browser-only APIs, so load the scene on the client only.
const BoardScene = dynamic(() => import("@/components/three/BoardScene"), {
  ssr: false,
  loading: () => <div style={{ padding: 20 }}>Loading board…</div>,
});

const NAMES = ["Red", "Blue", "White", "Orange"];

export default function GameClient() {
  const [seed, setSeed] = useState(2026);
  const [numPlayers, setNumPlayers] = useState(3);

  // The manager owns the only path to mutate state (dispatch). It mutates in
  // place, so we bump `version` to trigger React re-renders.
  const manager = useMemo(
    () => GameManager.createGame({ playerNames: NAMES.slice(0, numPlayers), seed }),
    [seed, numPlayers],
  );
  const [version, setVersion] = useState(0);
  useEffect(() => setVersion(0), [manager]);

  const state = manager.state;

  const place = (action: Parameters<GameManager["dispatch"]>[0]) => {
    const result = manager.dispatch(action);
    if (result.ok) setVersion((v) => v + 1);
    else console.warn("Illegal move:", result.error);
  };

  return (
    <main className="app">
      <header className="topbar">
        <h1>catan-clone</h1>
        <span className="tagline">seed #{seed}</span>
        <div className="spacer" />
        <span className="tagline">players:</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setNumPlayers(n)}
            style={n === numPlayers ? { background: "#274069", borderColor: "#3a5fa0" } : undefined}
          >
            {n}
          </button>
        ))}
        <button onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>
          New game
        </button>
      </header>

      <div className="canvas-wrap">
        <BoardScene
          state={state}
          version={version}
          onPlaceSettlement={(vertex) =>
            place({ type: "PlaceSetupSettlement", playerId: state.currentPlayerIndex, vertex })
          }
          onPlaceRoad={(edge) =>
            place({ type: "PlaceSetupRoad", playerId: state.currentPlayerIndex, edge })
          }
        />

        <div className="banner">
          <span
            className="dot"
            style={{ background: PLAYER_COLOR[state.currentPlayer.color] }}
          />
          {instruction(state)}
        </div>

        <Players state={state} version={version} />

        <div className="legend">
          {Object.values(TerrainType).map((t) => (
            <div className="row" key={t}>
              <span className="swatch" style={{ background: TERRAIN_COLOR[t] }} />
              {TERRAIN_LABEL[t]}
            </div>
          ))}
        </div>

        <div className="hint">drag to orbit · scroll to zoom</div>
      </div>
    </main>
  );
}

function instruction(state: GameState): string {
  const who = state.currentPlayer.name;
  switch (state.phase) {
    case GamePhase.Setup: {
      const round = state.setupQueuePos < state.players.length ? 1 : 2;
      const what =
        state.setupSubStep === "settlement"
          ? "click a glowing spot to place a settlement"
          : "click a glowing edge to place a road";
      return `Setup round ${round} — ${who}: ${what}`;
    }
    case GamePhase.Roll:
      return `Setup complete! ${who} to roll. (The main turn loop is the next milestone.)`;
    default:
      return `${who}'s turn`;
  }
}

function Players({ state }: { state: GameState; version: number }) {
  return (
    <div className="players">
      {state.players.map((p) => (
        <div className="prow" key={p.id}>
          <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
          <span className="pname">{p.name}</span>
          <span className="pstat">
            🏠 {5 - p.settlementsLeft} · 🛣 {15 - p.roadsLeft}
          </span>
        </div>
      ))}
    </div>
  );
}
