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

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay">
      <div className="dialog">{children}</div>
    </div>
  );
}
