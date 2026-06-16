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
import { PlayerDeck } from "@/components/ui/PlayerDeck";
import { ActionBar } from "@/components/ui/ActionBar";
import {
  BankTradeDialog,
  DiscardDialog,
  OfferResolveDialog,
  ResourcePickDialog,
  StealDialog,
  TradeProposeDialog,
} from "@/components/ui/Dialogs";

const BoardScene = dynamic(() => import("@/components/three/BoardScene"), {
  ssr: false,
  loading: () => <div style={{ padding: 20 }}>Loading board…</div>,
});

// Three.js is client-only and heavy; keep the dice tray out of the page bundle.
const DiceTray = dynamic(
  () => import("@/components/three/DiceTray").then((m) => m.DiceTray),
  { ssr: false },
);

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
  const [rolling, setRolling] = useState(false);
  const [rollNonce, setRollNonce] = useState(0);
  const [highlightSum, setHighlightSum] = useState<number | null>(null);
  const [tradeView, setTradeView] = useState<null | "propose" | "resolve">(null);
  const [offer, setOffer] = useState<{ give: ResourceBag; receive: ResourceBag } | null>(null);
  const [bankOpen, setBankOpen] = useState(false);

  useEffect(() => {
    setVersion(0);
    setBuildMode(null);
    setPendingSteal(null);
    setDevPick(null);
    setRolling(false);
    setHighlightSum(null);
    setTradeView(null);
    setOffer(null);
    setBankOpen(false);
  }, [manager]);

  const state = manager.state;
  const phase = state.phase;
  const pid = state.currentPlayerIndex;

  const act = (action: Parameters<GameManager["dispatch"]>[0]): boolean => {
    const result = manager.dispatch(action);
    if (result.ok) setVersion((v) => v + 1);
    else console.warn("Illegal move:", result.error);
    return result.ok;
  };

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

  // Roll the dice, let them tumble in the tray (~1.3s), and flash the tiles
  // whose number came up while resource tokens float off them.
  const doRoll = () => {
    if (rolling) return;
    setRolling(true);
    if (act({ type: "RollDice", playerId: pid })) {
      setRollNonce((n) => n + 1);
      const sum = manager.state.lastRoll?.sum ?? null;
      window.setTimeout(() => setRolling(false), 900);
      if (sum !== null && sum !== 7) {
        setHighlightSum(sum);
        window.setTimeout(() => setHighlightSum(null), 3200);
      } else {
        setHighlightSum(null);
      }
    } else {
      setRolling(false);
    }
  };

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
          highlightSum={highlightSum}
          rollNonce={rollNonce}
          onVertex={onVertex}
          onEdge={onEdge}
          onHex={onHex}
        />

        <div className="banner">
          <span className="dot" style={{ background: PLAYER_COLOR[state.currentPlayer.color] }} />
          {instruction(state)}
        </div>

        <DiceTray
          values={state.lastRoll ? [state.lastRoll.die1, state.lastRoll.die2] : [1, 1]}
          nonce={rollNonce}
          rolling={rolling}
        />

        <Players state={state} version={version} />

        <PlayerDeck state={state} version={version} rolling={rolling} />

        {phase !== GamePhase.Setup && (
          <ActionBar
            state={state}
            version={version}
            mode={mode}
            freeRoads={state.freeRoadsRemaining}
            rolling={rolling}
            cb={{
              onRoll: doRoll,
              onSetBuild: (m) => setBuildMode((cur) => (cur === m ? null : m)),
              onBuyDev: () => act({ type: "BuyDevCard", playerId: pid }),
              onPlayKnight: () => act({ type: "PlayKnight", playerId: pid }),
              onPlayRoadBuilding: () => {
                if (act({ type: "PlayRoadBuilding", playerId: pid })) setBuildMode("build-road");
              },
              onOpenYearOfPlenty: () => setDevPick("yop"),
              onOpenMonopoly: () => setDevPick("mono"),
              onOpenBankTrade: () => setBankOpen(true),
              onProposeTrade: () => setTradeView("propose"),
              onEndTurn: () => {
                if (act({ type: "EndTurn", playerId: pid })) {
                  setBuildMode(null);
                  setTradeView(null);
                  setOffer(null);
                  setBankOpen(false);
                }
              },
            }}
          />
        )}

        {/* Reserved for incoming AI trade offers (see roadmap). */}
        <div className="offers">
          <div className="offers-label">Incoming offers</div>
          <div className="muted">none — AI players coming soon</div>
        </div>

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
              act({ type: "PlayYearOfPlenty", playerId: pid, resources: [res[0], res[1]] });
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

        {bankOpen && (
          <BankTradeDialog
            state={state}
            onCancel={() => setBankOpen(false)}
            onTrade={(give, receive) => {
              act({ type: "BankTrade", playerId: pid, give, receive });
              setBankOpen(false);
            }}
          />
        )}

        {phase === GamePhase.PlayTurn && tradeView === "propose" && (
          <TradeProposeDialog
            state={state}
            onCancel={() => setTradeView(null)}
            onSend={(give, receive) => {
              setOffer({ give, receive });
              setTradeView("resolve");
            }}
          />
        )}

        {phase === GamePhase.PlayTurn && tradeView === "resolve" && offer && (
          <OfferResolveDialog
            state={state}
            give={offer.give}
            receive={offer.receive}
            onCancel={() => {
              setTradeView(null);
              setOffer(null);
            }}
            onAccept={(partnerId) => {
              act({
                type: "PlayerTrade",
                playerId: pid,
                partnerId,
                give: offer.give,
                receive: offer.receive,
              });
              setTradeView(null);
              setOffer(null);
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
      return `${who}'s turn`;
    case GamePhase.PlayTurn:
      return `${who}'s turn`;
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
