"use client";

import { useState } from "react";
import {
  GameState,
  RESOURCE_TYPES,
  ResourceBag,
  ResourceType,
  emptyResourceBag,
  evaluateTrade,
} from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_COLOR, bankTradeRate } from "@/components/three/helpers";
import { RESOURCE_ICON } from "./icons";

/** Forces an over-the-limit player to discard exactly `required` cards. */
export function DiscardDialog({
  state,
  playerId,
  required,
  onSubmit,
}: {
  state: GameState;
  playerId: number;
  required: number;
  onSubmit: (bag: ResourceBag) => void;
}) {
  const player = state.player(playerId);
  const [sel, setSel] = useState<ResourceBag>(emptyResourceBag());
  const total = RESOURCE_TYPES.reduce((n, r) => n + sel[r], 0);

  const bump = (r: ResourceType, d: number) => {
    const next = sel[r] + d;
    if (next < 0 || next > player.resources[r]) return;
    setSel({ ...sel, [r]: next });
  };

  return (
    <Overlay>
      <h3>
        <span className="dot" style={{ background: PLAYER_COLOR[player.color] }} /> {player.name}:
        discard {required}
      </h3>
      <p className="muted">Pass the device to {player.name}. Selected {total}/{required}.</p>
      <div className="picker">
        {RESOURCE_TYPES.map((r) => (
          <div className="prow" key={r}>
            <span className="cdot" style={{ background: RESOURCE_COLOR[r] }} />
            <span className="rname">{r}</span>
            <span className="have">have {player.resources[r]}</span>
            <button onClick={() => bump(r, -1)}>−</button>
            <span className="num">{sel[r]}</span>
            <button onClick={() => bump(r, 1)}>+</button>
          </div>
        ))}
      </div>
      <button className="primary" disabled={total !== required} onClick={() => onSubmit(sel)}>
        Discard
      </button>
    </Overlay>
  );
}

/** Choose which adjacent player to steal from after moving the robber. */
export function StealDialog({
  state,
  victims,
  onPick,
}: {
  state: GameState;
  victims: number[];
  onPick: (id: number) => void;
}) {
  return (
    <Overlay>
      <h3>Steal from…</h3>
      <div className="steal">
        {victims.map((id) => (
          <button key={id} onClick={() => onPick(id)}>
            <span className="dot" style={{ background: PLAYER_COLOR[state.player(id).color] }} />
            {state.player(id).name} ({state.player(id).resourceCount()} cards)
          </button>
        ))}
      </div>
    </Overlay>
  );
}

/** Pick `count` resources from the bank (Year of Plenty = 2, Monopoly = 1). */
export function ResourcePickDialog({
  title,
  count,
  onSubmit,
  onCancel,
}: {
  title: string;
  count: number;
  onSubmit: (resources: ResourceType[]) => void;
  onCancel: () => void;
}) {
  const [picks, setPicks] = useState<ResourceType[]>([]);
  const toggle = (r: ResourceType) => {
    if (count === 1) {
      setPicks([r]);
      return;
    }
    setPicks((cur) => (cur.length < count ? [...cur, r] : [r]));
  };

  return (
    <Overlay>
      <h3>{title}</h3>
      <p className="muted">Choose {count}.</p>
      <div className="steal">
        {RESOURCE_TYPES.map((r) => (
          <button
            key={r}
            className={picks.includes(r) ? "active" : undefined}
            onClick={() => toggle(r)}
          >
            <span className="cdot" style={{ background: RESOURCE_COLOR[r] }} />
            {r}
          </button>
        ))}
      </div>
      <div className="row-gap">
        <button onClick={onCancel}>Cancel</button>
        <button className="primary" disabled={picks.length !== count} onClick={() => onSubmit(picks)}>
          Confirm
        </button>
      </div>
    </Overlay>
  );
}

/** The active player builds an offer: what they give and what they want back. */
/**
 * One-screen player trade. Build "you want" (top) and "you give" (bottom) from
 * resource tokens, see live which opponents would accept, and click one to make
 * the deal. "You give" is capped to what you actually hold.
 */
/**
 * TwoSheep-style trade widget. A 5-column grid of resources with four rows:
 * headers, "you want" (⬇), "you give" (⬆), and "available" (your remaining
 * hand). Click a cell to add, right-click to remove. Give is moved up from the
 * available row. Controls: ✅ submit to players, ❌ cancel, 🏦 bank trade.
 */
export function TradeDialog({
  state,
  humanId,
  onPlayerTrade,
  onBankTrade,
  onCancel,
}: {
  state: GameState;
  humanId: number;
  onPlayerTrade: (partnerId: number, give: ResourceBag, want: ResourceBag) => void;
  onBankTrade: (give: ResourceType, receive: ResourceType) => void;
  onCancel: () => void;
}) {
  const human = state.player(humanId);
  const [give, setGive] = useState<ResourceBag>(emptyResourceBag());
  const [want, setWant] = useState<ResourceBag>(emptyResourceBag());
  const [submitted, setSubmitted] = useState(false);

  const avail = (r: ResourceType) => human.resources[r] - give[r];
  const giveTotal = RESOURCE_TYPES.reduce((n, r) => n + give[r], 0);
  const wantTotal = RESOURCE_TYPES.reduce((n, r) => n + want[r], 0);
  const ready = giveTotal > 0 && wantTotal > 0;

  const setW = (r: ResourceType, d: number) =>
    setWant((b) => ({ ...b, [r]: Math.max(0, b[r] + d) }));
  const setG = (r: ResourceType, d: number) => {
    setSubmitted(false);
    setGive((b) => {
      const next = b[r] + d;
      if (next < 0 || next > human.resources[r]) return b;
      return { ...b, [r]: next };
    });
  };

  // Bank trade is valid for a single give (= its rate) ↔ a single want (= 1).
  const giveTypes = RESOURCE_TYPES.filter((r) => give[r] > 0);
  const wantTypes = RESOURCE_TYPES.filter((r) => want[r] > 0);
  let bank: { give: ResourceType; receive: ResourceType } | null = null;
  if (giveTypes.length === 1 && wantTypes.length === 1 && giveTypes[0] !== wantTypes[0]) {
    const g = giveTypes[0];
    const w = wantTypes[0];
    if (give[g] === bankTradeRate(human, g) && want[w] === 1) bank = { give: g, receive: w };
  }

  const others = state.players.filter((p) => p.id !== humanId);
  const accepters = ready ? others.filter((p) => evaluateTrade(state, p.id, give, want)) : [];

  const cell = (
    r: ResourceType,
    count: number,
    dim: boolean,
    onClick: () => void,
    onRemove: () => void,
  ) => (
    <button
      className={`tcell${dim ? " dim" : ""}`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <span className="resemoji" style={{ background: RESOURCE_COLOR[r] }}>
        {RESOURCE_ICON[r]}
      </span>
      <span className="tcount">{count}</span>
    </button>
  );

  return (
    <Overlay>
      <div className="tradewidget">
        <div className="tradegrid">
          {RESOURCE_TYPES.map((r) => (
            <div className="thead resemoji" key={r} style={{ background: RESOURCE_COLOR[r] }}>
              {RESOURCE_ICON[r]}
            </div>
          ))}
          <div className="tarrow" />

          {/* You want */}
          {RESOURCE_TYPES.map((r) =>
            cell(r, want[r], want[r] === 0, () => setW(r, 1), () => setW(r, -1)),
          )}
          <div className="tarrow get">⬇</div>

          {/* You give (moved up from available) */}
          {RESOURCE_TYPES.map((r) =>
            cell(r, give[r], give[r] === 0, () => setG(r, -1), () => setG(r, 1)),
          )}
          <div className="tarrow give">⬆</div>

          {/* Available = your remaining hand */}
          {RESOURCE_TYPES.map((r) =>
            cell(r, avail(r), avail(r) === 0, () => setG(r, 1), () => setG(r, -1)),
          )}
          <div className="tarrow" />
        </div>

        <div className="tradebtns">
          <button
            className="tbtn ok"
            title="Submit to players"
            disabled={!ready}
            onClick={() => setSubmitted(true)}
          >
            ✅
          </button>
          <button className="tbtn cancel" title="Cancel" onClick={onCancel}>
            ❌
          </button>
          <button
            className="tbtn bank"
            title={bank ? "Trade with the bank" : "Build a valid bank trade (e.g. 4:1)"}
            disabled={!bank}
            onClick={() => bank && onBankTrade(bank.give, bank.receive)}
          >
            🏦
          </button>
        </div>
      </div>

      {submitted && (
        <div className="trade-responses">
          <div className="group-label">Responses</div>
          {others.map((p) => {
            const accepts = accepters.includes(p);
            return (
              <button
                key={p.id}
                disabled={!accepts}
                onClick={() => onPlayerTrade(p.id, give, want)}
              >
                <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
                {p.name} {accepts ? "accepts ✓ — click to confirm" : "declines ✕"}
              </button>
            );
          })}
        </div>
      )}

      <p className="muted">Click a resource to add · right-click to remove · ⬇ you get · ⬆ you give</p>
    </Overlay>
  );
}

/** Trade with the bank/ports at the player's best rate (4:1 / 3:1 / 2:1). */
export function BankTradeDialog({
  state,
  onTrade,
  onCancel,
}: {
  state: GameState;
  onTrade: (give: ResourceType, receive: ResourceType) => void;
  onCancel: () => void;
}) {
  const [give, setGive] = useState<ResourceType>(ResourceType.Wood);
  const [receive, setReceive] = useState<ResourceType>(ResourceType.Brick);
  const rate = bankTradeRate(state.currentPlayer, give);
  const have = state.currentPlayer.resources[give];
  const canTrade = give !== receive && have >= rate;
  const reason =
    give === receive
      ? "Pick two different resources."
      : have < rate
        ? `You need ${rate} ${give} (have ${have}).`
        : `Trade ${rate} ${give} → 1 ${receive}.`;

  return (
    <Overlay>
      <h3>Bank trade ({rate}:1)</h3>
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
      </div>
      <p className="muted">{reason}</p>
      <div className="row-gap">
        <button onClick={onCancel}>Cancel</button>
        <button className="primary" disabled={!canTrade} onClick={() => onTrade(give, receive)}>
          Trade
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay">
      <div className="dialog">{children}</div>
    </div>
  );
}
