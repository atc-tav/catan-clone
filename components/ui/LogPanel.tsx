"use client";

import { useEffect, useRef } from "react";
import { GameEvent, GameState, RESOURCE_TYPES, ResourceBag } from "@core";
import { PLAYER_COLOR } from "@/components/three/colors";
import { BUILDING_ICON, DEV_ICON, DEV_LABEL, RESOURCE_ICON } from "./icons";

function Name({ state, id }: { state: GameState; id: number }) {
  return (
    <strong style={{ color: PLAYER_COLOR[state.player(id).color] }}>{state.player(id).name}</strong>
  );
}

function bagIcons(bag: ResourceBag): string {
  return RESOURCE_TYPES.filter((r) => bag[r] > 0)
    .map((r) => `${bag[r]}${RESOURCE_ICON[r]}`)
    .join(" ");
}

function line(state: GameState, e: GameEvent, key: number) {
  const who = <Name state={state} id={e.player} />;
  let body: React.ReactNode = null;
  switch (e.kind) {
    case "setup-build":
    case "build":
      body = <>built a {BUILDING_ICON[e.building]} {e.building}</>;
      break;
    case "roll":
      body = <>rolled 🎲 {e.die1}+{e.die2} = {e.sum}</>;
      break;
    case "receive":
      body = <>received {bagIcons(e.resources)}</>;
      break;
    case "buy-dev":
      body = <>bought a dev card 🃏</>;
      break;
    case "play-dev":
      body = <>played {DEV_ICON[e.card]} {DEV_LABEL[e.card]}</>;
      break;
    case "robber":
      body = <>moved the robber 🥷</>;
      break;
    case "steal":
      body = <>stole 🂠 from <Name state={state} id={e.from} /></>;
      break;
    case "discard":
      body = <>discarded {e.count} 🗑</>;
      break;
    case "bank-trade":
      body = <>traded {e.rate}{RESOURCE_ICON[e.give]} → {RESOURCE_ICON[e.receive]} 🏦</>;
      break;
    case "player-trade":
      body = <>traded {bagIcons(e.give)} → {bagIcons(e.receive)} with <Name state={state} id={e.partner} /></>;
      break;
    case "award":
      body = <>took {e.award === "longest-road" ? "Longest Road" : "Largest Army"} (+2 vp) 🏅</>;
      break;
    case "end-turn":
      body = <>ended turn</>;
      break;
    case "win":
      body = <> wins! 🏆</>;
      break;
  }
  return (
    <div className="logline" key={key}>
      {who} {body}
    </div>
  );
}

/** Scrolling game log; auto-sticks to the newest event. */
export function LogPanel({ state }: { state: GameState; version: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [state.log.length]);

  return (
    <div className="logpanel" ref={ref}>
      {state.log.map((e, i) => line(state, e, i))}
    </div>
  );
}
