"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  GameManager,
  GamePhase,
  GameState,
  ResourceBag,
  ResourceType,
  publicVictoryPoints,
} from "@core";
import type { BoardMode } from "@/components/three/BoardScene";
import { PLAYER_COLOR } from "@/components/three/colors";
import { robberVictims } from "@/components/three/helpers";
import { Hud } from "@/components/ui/Hud";
import { DiscardDialog, ResourcePickDialog, StealDialog } from "@/components/ui/Dialogs";

const BoardScene = dynamic(() => import("@/components/three/BoardScene"), {
  ssr: false,
  loading: () => <div style={{ padding: 20 }}>Loading board…</div>,
});

const NAMES = ["Red", "Blue", "White", "Orange"];
type BuildMode = "build-road" | "build-settlement" | "build-city" | null;

export default function GameClient() {
  const [seed, setSeed] = useState(2026);
  const [numPlayers, setNumPlayers] = useState(3);

  const manager = useMemo(
    () => GameManager.createGame({ playerNames: NAMES.slice(0, numPlayers), seed }),
    [seed, numPlayers],
  );
  const [version, setVersion] = useState(0);
  const [buildMode, setBuildMode] = useState<BuildMode>(null);
  const [pendingSteal, setPendingSteal] = useState<{ hex: string; victims: number[] } | null>(null);
  const [devPick, setDevPick] = useState<null | "yop" | "mono">(null);

  // Reset transient UI whenever a new game is created.
  useEffect(() => {
    setVersion(0);
    setBuildMode(null);
    setPendingSteal(null);
    setDevPick(null);
  }, [manager]);

  const state = manager.state;
  const phase = state.phase;

  const act = (action: Parameters<GameManager["dispatch"]>[0]): boolean => {
    const result = manager.dispatch(action);
    if (result.ok) setVersion((v) => v + 1);
    else console.warn("Illegal move:", result.error);
    return result.ok;
  };

  const pid = state.currentPlayerIndex;

  const mode: BoardMode =
    phase === GamePhase.Setup
      ? state.setupSubStep === "settlement"
        ? "setup-settlement"
        : "setup-road"
      : phase === GamePhase.MoveRobber
        ? "move-robber"
        : phase === GamePhase.PlayTurn && buildMode
          ? buildMode
          : "none";

  // --- Board interactions --------------------------------------------------

  const onVertex = (vertex: string) => {
    if (phase === GamePhase.Setup) {
      act({ type: "PlaceSetupSettlement", playerId: pid, vertex });
    } else if (buildMode === "build-settlement") {
      if (act({ type: "BuildSettlement", playerId: pid, vertex })) setBuildMode(null);
    } else if (buildMode === "build-city") {
      if (act({ type: "BuildCity", playerId: pid, vertex })) setBuildMode(null);
    }
  };

  const onEdge = (edge: string) => {
    if (phase === GamePhase.Setup) {
      act({ type: "PlaceSetupRoad", playerId: pid, edge });
    } else if (buildMode === "build-road") {
      if (act({ type: "BuildRoad", playerId: pid, edge }) && state.freeRoadsRemaining === 0) {
        setBuildMode(null);
      }
    }
  };

  const onHex = (hex: string) => {
    if (phase !== GamePhase.MoveRobber) return;
    const victims = robberVictims(state, hex, pid);
    if (victims.length === 0) act({ type: "MoveRobber", playerId: pid, hex, stealFrom: null });
    else setPendingSteal({ hex, victims });
  };

  // --- Discard bookkeeping -------------------------------------------------

  const discardPid =
    phase === GamePhase.Discard ? (state.pendingDiscards.keys().next().value ?? null) : null;

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
        <button onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>New game</button>
      </header>

      <div className="canvas-wrap">
        <BoardScene
          state={state}
          version={version}
          mode={mode}
          onVertex={onVertex}
          onEdge={onEdge}
          onHex={onHex}
        />

        <div className="banner">
          <span className="dot" style={{ background: PLAYER_COLOR[state.currentPlayer.color] }} />
          {instruction(state)}
        </div>

        <Players state={state} version={version} />

        {phase !== GamePhase.Setup && (
          <Hud
            state={state}
            version={version}
            mode={mode}
            freeRoads={state.freeRoadsRemaining}
            cb={{
              onRoll: () => act({ type: "RollDice", playerId: pid }),
              onSetBuild: (m) => setBuildMode((cur) => (cur === m ? null : m)),
              onBuyDev: () => act({ type: "BuyDevCard", playerId: pid }),
              onPlayKnight: () => act({ type: "PlayKnight", playerId: pid }),
              onPlayRoadBuilding: () => {
                if (act({ type: "PlayRoadBuilding", playerId: pid })) setBuildMode("build-road");
              },
              onOpenYearOfPlenty: () => setDevPick("yop"),
              onOpenMonopoly: () => setDevPick("mono"),
              onBankTrade: (give, receive) =>
                act({ type: "BankTrade", playerId: pid, give, receive }),
              onEndTurn: () => {
                if (act({ type: "EndTurn", playerId: pid })) setBuildMode(null);
              },
            }}
          />
        )}

        <div className="hint">drag to orbit · scroll to zoom</div>

        {/* Modal flows */}
        {discardPid !== null && (
          <DiscardDialog
            state={state}
            playerId={discardPid}
            required={state.pendingDiscards.get(discardPid)!}
            onSubmit={(bag: ResourceBag) =>
              act({ type: "Discard", playerId: discardPid, resources: bag })
            }
          />
        )}

        {pendingSteal && (
          <StealDialog
            state={state}
            victims={pendingSteal.victims}
            onPick={(id) => {
              act({ type: "MoveRobber", playerId: pid, hex: pendingSteal.hex, stealFrom: id });
              setPendingSteal(null);
            }}
          />
        )}

        {devPick === "yop" && (
          <ResourcePickDialog
            title="Year of Plenty"
            count={2}
            onCancel={() => setDevPick(null)}
            onSubmit={(res: ResourceType[]) => {
              act({
                type: "PlayYearOfPlenty",
                playerId: pid,
                resources: [res[0], res[1]],
              });
              setDevPick(null);
            }}
          />
        )}

        {devPick === "mono" && (
          <ResourcePickDialog
            title="Monopoly"
            count={1}
            onCancel={() => setDevPick(null)}
            onSubmit={(res: ResourceType[]) => {
              act({ type: "PlayMonopoly", playerId: pid, resource: res[0] });
              setDevPick(null);
            }}
          />
        )}
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
      return `${who}: roll the dice`;
    case GamePhase.PlayTurn:
      return `${who}: build, trade, play cards, or end your turn`;
    case GamePhase.MoveRobber:
      return `${who}: move the robber`;
    case GamePhase.Discard:
      return "Discard down to the hand limit";
    case GamePhase.GameOver:
      return `🏆 ${who} wins!`;
    default:
      return "";
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
            {publicVictoryPoints(state, p.id)}vp · 🏠 {5 - p.settlementsLeft} · 🏙 {4 - p.citiesLeft}
          </span>
        </div>
      ))}
    </div>
  );
}
