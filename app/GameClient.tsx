"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  GameManager,
  GamePhase,
  GameState,
  RESOURCE_TYPES,
  ResourceBag,
  ResourceType,
  decideAction,
  decideTradeOffer,
} from "@core";
import type { BoardMode } from "@/components/three/BoardScene";
import { PLAYER_COLOR } from "@/components/three/colors";
import { robberVictims } from "@/components/three/helpers";
import { BuildPanel } from "@/components/ui/BuildPanel";
import { BankBar } from "@/components/ui/BankBar";
import { LogPanel } from "@/components/ui/LogPanel";
import { Standings } from "@/components/ui/Standings";
import { ResourceChips } from "@/components/ui/ResourceChips";
import {
  DevCardDialog,
  DiscardDialog,
  ResourcePickDialog,
  StealDialog,
  TradeDialog,
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

const BOT_DELAY = 550; // ms between a bot's actions, so you can watch

const HUMAN = 0; // you are always the first seat (Red); everyone else is AI

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
  const [tradeOpen, setTradeOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  // An offer a bot is making to you, awaiting your accept/decline.
  const [aiOffer, setAiOffer] = useState<{ proposer: number; give: ResourceBag; receive: ResourceBag } | null>(null);
  const [gain, setGain] = useState<{ bag: ResourceBag; nonce: number } | null>(null);
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const offeredTurn = useRef<string>("");

  useEffect(() => {
    setVersion(0);
    setBuildMode(null);
    setPendingSteal(null);
    setDevPick(null);
    setRolling(false);
    setHighlightSum(null);
    setTradeOpen(false);
    setDevOpen(false);
    setAiOffer(null);
    setGain(null);
    offeredTurn.current = "";
  }, [manager]);

  // One human (player 0); every other seat is an AI opponent.
  const aiIds = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 1; i < numPlayers; i++) ids.add(i);
    return ids;
  }, [numPlayers]);
  const isBot = (id: number) => aiIds.has(id);

  const state = manager.state;
  const phase = state.phase;
  const pid = state.currentPlayerIndex;

  const act = (action: Parameters<GameManager["dispatch"]>[0]): boolean => {
    const result = manager.dispatch(action);
    if (result.ok) setVersion((v) => v + 1);
    else console.warn("Illegal move:", result.error);
    return result.ok;
  };

  // While a bot is acting, the human can't interact with the board.
  const mode: BoardMode = isBot(pid)
    ? "none"
    : phase === GamePhase.Setup
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

  // Roll the dice, let them tumble in the tray (~0.9s), and flash the tiles
  // whose number came up while resource tokens float off them. Shared by the
  // human's Roll button and the bot driver.
  const performRoll = (playerId: number) => {
    setRolling(true);
    const before = { ...manager.state.player(HUMAN).resources };
    if (act({ type: "RollDice", playerId })) {
      setRollNonce((n) => n + 1);
      const sum = manager.state.lastRoll?.sum ?? null;
      window.setTimeout(() => setRolling(false), 900);
      if (sum !== null && sum !== 7) {
        setHighlightSum(sum);
        window.setTimeout(() => setHighlightSum(null), 3200);
        // Flash the human's gained resource cards for the same window.
        const after = manager.state.player(HUMAN).resources;
        const delta = Object.fromEntries(
          RESOURCE_TYPES.map((r) => [r, Math.max(0, after[r] - before[r])]),
        ) as ResourceBag;
        if (RESOURCE_TYPES.some((r) => delta[r] > 0)) {
          setGain({ bag: delta, nonce: Date.now() });
          window.setTimeout(() => setGain(null), 3200);
        }
      } else {
        setHighlightSum(null);
      }
    } else {
      setRolling(false);
    }
  };
  const doRoll = () => {
    if (!rolling) performRoll(pid);
  };

  // Bot driver: when it's a bot's turn (or a bot must discard), pick and play
  // its next action after a short, watchable delay. Re-runs after every action.
  useEffect(() => {
    if (rolling || aiOffer || phase === GamePhase.GameOver) return;
    let actor: number | null = null;
    if (phase === GamePhase.Discard) {
      for (const id of state.pendingDiscards.keys()) {
        if (isBot(id)) {
          actor = id;
          break;
        }
      }
    } else if (isBot(state.currentPlayerIndex)) {
      actor = state.currentPlayerIndex;
    }
    if (actor === null) return;

    const id = actor;
    const timer = window.setTimeout(() => {
      // Once per turn, a bot may offer you a trade (pauses until you respond).
      const turnKey = `${state.turnNumber}-${id}`;
      if (phase === GamePhase.PlayTurn && id === state.currentPlayerIndex && offeredTurn.current !== turnKey) {
        offeredTurn.current = turnKey;
        const made = decideTradeOffer(manager.state, id);
        if (made && manager.state.player(HUMAN).hasResources(made.receive)) {
          setAiOffer({ proposer: id, give: made.give, receive: made.receive });
          return;
        }
      }
      const action = decideAction(manager.state, id);
      if (action.type === "RollDice") {
        performRoll(id);
      } else if (!act(action) && manager.state.phase === GamePhase.PlayTurn) {
        act({ type: "EndTurn", playerId: id }); // safety net against a stuck bot
      }
    }, BOT_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, manager, rolling, phase, aiIds, aiOffer]);

  // Human discards via dialog; bot discards are handled by the driver above.
  const discardPid =
    phase === GamePhase.Discard
      ? (() => {
          for (const id of state.pendingDiscards.keys()) if (!isBot(id)) return id;
          return null;
        })()
      : null;

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
        <span className="tagline">you + {numPlayers - 1} AI</span>
        <span className="tagline">difficulty:</span>
        <select className="difficulty" defaultValue="normal" title="More levels coming soon">
          <option value="normal">Normal</option>
          <option value="easy" disabled>
            Easy (soon)
          </option>
          <option value="hard" disabled>
            Hard (soon)
          </option>
        </select>
        <button
          onClick={() => setProjection((p) => (p === "perspective" ? "orthographic" : "perspective"))}
          title="Toggle camera projection"
        >
          {projection === "perspective" ? "🎥 Perspective" : "🗺 Orthographic"}
        </button>
        <button onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>New game</button>
      </header>

      <div className="canvas-wrap">
        <BoardScene
          state={state}
          version={version}
          mode={mode}
          highlightSum={highlightSum}
          rollNonce={rollNonce}
          projection={projection}
          onVertex={onVertex}
          onEdge={onEdge}
          onHex={onHex}
        />

        <div
          className={`banner${
            !isBot(pid) && (phase === GamePhase.MoveRobber || phase === GamePhase.Discard)
              ? " alert"
              : ""
          }`}
        >
          <span className="dot" style={{ background: PLAYER_COLOR[state.currentPlayer.color] }} />
          {aiOffer
            ? `${state.player(aiOffer.proposer).name} (AI) is offering you a trade →`
            : isBot(pid) && phase !== GamePhase.GameOver
              ? `${state.currentPlayer.name} (AI) is thinking…`
              : instruction(state)}
        </div>

        {/* LEFT: what you can build (always present so the layout never janks) */}
        <BuildPanel
          state={state}
          version={version}
          mode={mode}
          freeRoads={state.freeRoadsRemaining}
          canAct={pid === HUMAN && phase === GamePhase.PlayTurn && !rolling}
          onSetBuild={(m) => setBuildMode((cur) => (cur === m ? null : m))}
          onBuyDev={() => act({ type: "BuyDevCard", playerId: HUMAN })}
        />

        {/* RIGHT: dice, game log, standings */}
        <div className="right-rail">
          <DiceTray
            values={state.lastRoll ? [state.lastRoll.die1, state.lastRoll.die2] : [1, 1]}
            nonce={rollNonce}
            rolling={rolling}
          />
          <LogPanel state={state} version={version} />
          <Standings state={state} version={version} aiIds={aiIds} current={pid} />
        </div>

        {/* BOTTOM: your bank + actions */}
        <BankBar
          state={state}
          version={version}
          playerId={HUMAN}
          isMyTurn={pid === HUMAN}
          rolling={rolling}
          gains={gain?.bag ?? null}
          gainNonce={gain?.nonce ?? 0}
          cb={{
            onRoll: doRoll,
            onProposeTrade: () => setTradeOpen(true),
            onOpenDevCards: () => setDevOpen(true),
            onEndTurn: () => {
              if (act({ type: "EndTurn", playerId: HUMAN })) {
                setBuildMode(null);
                setTradeOpen(false);
                setDevOpen(false);
              }
            },
          }}
        />

        {/* Incoming AI trade offer (floats above the bank when present). */}
        {aiOffer && (
          <div className="offers alert">
            <div className="offers-label">Incoming offer</div>
            <div className="aioffer">
              <div className="offer-line">
                <span className="dot" style={{ background: PLAYER_COLOR[state.player(aiOffer.proposer).color] }} />
                <ResourceChips bag={aiOffer.give} />
                <span className="arrow">▶▶ you</span>
              </div>
              <div className="offer-line">
                <span className="dot" style={{ background: PLAYER_COLOR[state.player(HUMAN).color] }} />
                <ResourceChips bag={aiOffer.receive} />
                <span className="arrow">▶▶ {state.player(aiOffer.proposer).name}</span>
              </div>
              <div className="row-gap">
                <button onClick={() => setAiOffer(null)}>Decline</button>
                <button
                  className="primary"
                  onClick={() => {
                    act({
                      type: "PlayerTrade",
                      playerId: aiOffer.proposer,
                      partnerId: HUMAN,
                      give: aiOffer.give,
                      receive: aiOffer.receive,
                    });
                    setAiOffer(null);
                  }}
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        )}

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

        {devOpen && (
          <DevCardDialog
            player={state.player(HUMAN)}
            canPlay={
              pid === HUMAN &&
              phase === GamePhase.PlayTurn &&
              !state.player(HUMAN).hasPlayedDevCardThisTurn
            }
            onClose={() => setDevOpen(false)}
            cb={{
              onPlayKnight: () => {
                act({ type: "PlayKnight", playerId: HUMAN });
                setDevOpen(false);
              },
              onPlayRoadBuilding: () => {
                if (act({ type: "PlayRoadBuilding", playerId: HUMAN })) setBuildMode("build-road");
                setDevOpen(false);
              },
              onYearOfPlenty: () => {
                setDevPick("yop");
                setDevOpen(false);
              },
              onMonopoly: () => {
                setDevPick("mono");
                setDevOpen(false);
              },
            }}
          />
        )}

        {tradeOpen && phase === GamePhase.PlayTurn && pid === HUMAN && (
          <TradeDialog
            state={state}
            humanId={HUMAN}
            onCancel={() => setTradeOpen(false)}
            onPlayerTrade={(partnerId, give, want) => {
              act({ type: "PlayerTrade", playerId: HUMAN, partnerId, give, receive: want });
              setTradeOpen(false);
            }}
            onBankTrade={(give, receive) => {
              act({ type: "BankTrade", playerId: HUMAN, give, receive });
              setTradeOpen(false);
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
      return "🥷 A 7 was rolled — move the robber: click a highlighted hex, then steal";
    case GamePhase.Discard:
      return "🥷 A 7 was rolled — discard down to the hand limit (see dialog)";
    case GamePhase.GameOver:
      return `🏆 ${who} wins!`;
    default:
      return "";
  }
}

