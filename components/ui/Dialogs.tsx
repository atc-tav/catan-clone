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
export function TradeDialog({
  state,
  humanId,
  onTrade,
  onCancel,
}: {
  state: GameState;
  humanId: number;
  onTrade: (partnerId: number, give: ResourceBag, want: ResourceBag) => void;
  onCancel: () => void;
}) {
  const human = state.player(humanId);
  const [give, setGive] = useState<ResourceBag>(emptyResourceBag());
  const [want, setWant] = useState<ResourceBag>(emptyResourceBag());
  const giveTotal = RESOURCE_TYPES.reduce((n, r) => n + give[r], 0);
  const wantTotal = RESOURCE_TYPES.reduce((n, r) => n + want[r], 0);
  const ready = giveTotal > 0 && wantTotal > 0;
  const others = state.players.filter((p) => p.id !== humanId);

  return (
    <Overlay>
      <h3>🤝 Propose a trade</h3>

      <div className="group-label">You want</div>
      <TokenRow bag={want} max={() => 19} onChange={setWant} />

      <div className="trade-swap">⇅</div>

      <div className="group-label">You give (from your hand)</div>
      <TokenRow bag={give} max={(r) => human.resources[r]} showHave onChange={setGive} />

      <div className="group-label">Offer to</div>
      <div className="steal">
        {others.map((p) => {
          // The partner receives our `give` and pays our `want`.
          const accepts = ready && evaluateTrade(state, p.id, give, want);
          return (
            <button key={p.id} disabled={!accepts} onClick={() => onTrade(p.id, give, want)}>
              <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
              {p.name}{" "}
              {!ready ? "" : accepts ? "accepts ✓" : "declines ✕"}
            </button>
          );
        })}
      </div>

      <div className="row-gap">
        <button onClick={onCancel}>Close</button>
      </div>
    </Overlay>
  );
}

/** A horizontal row of resource tokens with steppers, used to build a trade side. */
function TokenRow({
  bag,
  max,
  showHave = false,
  onChange,
}: {
  bag: ResourceBag;
  max: (r: ResourceType) => number;
  showHave?: boolean;
  onChange: (bag: ResourceBag) => void;
}) {
  const bump = (r: ResourceType, d: number) => {
    const next = bag[r] + d;
    if (next < 0 || next > max(r)) return;
    onChange({ ...bag, [r]: next });
  };
  return (
    <div className="tokenrow">
      {RESOURCE_TYPES.map((r) => {
        const cap = max(r);
        return (
          <div className="tokencol" key={r}>
            <div className="resemoji big" style={{ background: RESOURCE_COLOR[r] }}>
              {RESOURCE_ICON[r]}
            </div>
            {showHave && <span className="have">{cap} held</span>}
            <div className="stepper">
              <button disabled={bag[r] === 0} onClick={() => bump(r, -1)}>
                −
              </button>
              <span className="num">{bag[r]}</span>
              <button disabled={bag[r] >= cap} onClick={() => bump(r, 1)}>
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
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
