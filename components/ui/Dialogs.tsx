"use client";

import { useState } from "react";
import {
  GameState,
  RESOURCE_TYPES,
  ResourceBag,
  ResourceType,
  emptyResourceBag,
} from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { RESOURCE_COLOR } from "@/components/three/helpers";

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
export function TradeProposeDialog({
  state,
  onSend,
  onCancel,
}: {
  state: GameState;
  onSend: (give: ResourceBag, receive: ResourceBag) => void;
  onCancel: () => void;
}) {
  const proposer = state.currentPlayer;
  const [give, setGive] = useState<ResourceBag>(emptyResourceBag());
  const [receive, setReceive] = useState<ResourceBag>(emptyResourceBag());
  const giveTotal = RESOURCE_TYPES.reduce((n, r) => n + give[r], 0);
  const recvTotal = RESOURCE_TYPES.reduce((n, r) => n + receive[r], 0);

  return (
    <Overlay>
      <h3>Propose a trade</h3>
      <BagEditor
        label="You give"
        bag={give}
        max={(r) => proposer.resources[r]}
        onChange={setGive}
      />
      <BagEditor label="You want" bag={receive} max={() => 9} onChange={setReceive} />
      <div className="row-gap">
        <button onClick={onCancel}>Cancel</button>
        <button
          className="primary"
          disabled={giveTotal === 0 || recvTotal === 0}
          onClick={() => onSend(give, receive)}
        >
          Offer to players
        </button>
      </div>
    </Overlay>
  );
}

/** Other players see the offer and may accept it (if they can cover it). */
export function OfferResolveDialog({
  state,
  give,
  receive,
  onAccept,
  onCancel,
}: {
  state: GameState;
  give: ResourceBag;
  receive: ResourceBag;
  onAccept: (partnerId: number) => void;
  onCancel: () => void;
}) {
  const proposer = state.currentPlayer;
  const others = state.players.filter((p) => p.id !== proposer.id);
  return (
    <Overlay>
      <h3>
        <span className="dot" style={{ background: PLAYER_COLOR[proposer.color] }} /> {proposer.name}
        offers
      </h3>
      <div className="offer">
        <BagSummary label="gives" bag={give} />
        <BagSummary label="for" bag={receive} />
      </div>
      <p className="muted">Any player who can cover it may accept:</p>
      <div className="steal">
        {others.map((p) => (
          <button key={p.id} disabled={!p.hasResources(receive)} onClick={() => onAccept(p.id)}>
            <span className="dot" style={{ background: PLAYER_COLOR[p.color] }} />
            {p.name} accepts
          </button>
        ))}
      </div>
      <div className="row-gap">
        <button onClick={onCancel}>Cancel offer</button>
      </div>
    </Overlay>
  );
}

function BagEditor({
  label,
  bag,
  max,
  onChange,
}: {
  label: string;
  bag: ResourceBag;
  max: (r: ResourceType) => number;
  onChange: (bag: ResourceBag) => void;
}) {
  const bump = (r: ResourceType, d: number) => {
    const next = bag[r] + d;
    if (next < 0 || next > max(r)) return;
    onChange({ ...bag, [r]: next });
  };
  return (
    <div className="picker">
      <div className="group-label">{label}</div>
      {RESOURCE_TYPES.map((r) => (
        <div className="prow" key={r}>
          <span className="cdot" style={{ background: RESOURCE_COLOR[r] }} />
          <span className="rname">{r}</span>
          <button onClick={() => bump(r, -1)}>−</button>
          <span className="num">{bag[r]}</span>
          <button onClick={() => bump(r, 1)}>+</button>
        </div>
      ))}
    </div>
  );
}

function BagSummary({ label, bag }: { label: string; bag: ResourceBag }) {
  const items = RESOURCE_TYPES.filter((r) => bag[r] > 0);
  return (
    <div className="bagsum">
      <span className="muted">{label}</span>
      {items.length === 0 ? (
        <span>nothing</span>
      ) : (
        items.map((r) => (
          <span className="chip" key={r}>
            <span className="cdot" style={{ background: RESOURCE_COLOR[r] }} />
            {bag[r]}
          </span>
        ))
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay">
      <div className="dialog">{children}</div>
    </div>
  );
}
