"use client";

import { COST_CITY, COST_DEV_CARD, COST_ROAD, COST_SETTLEMENT, GameState } from "@core";
import { BoardMode } from "@/components/three/BoardScene";

type BuildTarget = "build-road" | "build-settlement" | "build-city";

/** Left rail: what you can build, with cost and whether it's currently possible. */
export function BuildPanel({
  state,
  mode,
  freeRoads,
  canAct,
  onSetBuild,
  onBuyDev,
}: {
  state: GameState;
  version: number;
  mode: BoardMode;
  freeRoads: number;
  canAct: boolean;
  onSetBuild: (m: BuildTarget | null) => void;
  onBuyDev: () => void;
}) {
  const p = state.currentPlayer;

  const rows: {
    label: string;
    icon: string;
    left: number;
    cost: string;
    target?: BuildTarget;
    enabled: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "Road",
      icon: "🛣",
      left: p.roadsLeft,
      cost: "🌲🧱",
      target: "build-road",
      enabled: canAct && p.roadsLeft > 0 && (freeRoads > 0 || p.hasResources(COST_ROAD)),
      onClick: () => onSetBuild(mode === "build-road" ? null : "build-road"),
    },
    {
      label: "Settlement",
      icon: "🏠",
      left: p.settlementsLeft,
      cost: "🌲🧱🐑🌾",
      target: "build-settlement",
      enabled: canAct && p.settlementsLeft > 0 && p.hasResources(COST_SETTLEMENT),
      onClick: () => onSetBuild(mode === "build-settlement" ? null : "build-settlement"),
    },
    {
      label: "City",
      icon: "🏙",
      left: p.citiesLeft,
      cost: "🌾🌾⛰⛰⛰",
      target: "build-city",
      enabled: canAct && p.citiesLeft > 0 && p.hasResources(COST_CITY),
      onClick: () => onSetBuild(mode === "build-city" ? null : "build-city"),
    },
    {
      label: "Dev card",
      icon: "🃏",
      left: state.devDeck.length,
      cost: "🐑🌾⛰",
      enabled: canAct && state.devDeck.length > 0 && p.hasResources(COST_DEV_CARD),
      onClick: onBuyDev,
    },
  ];

  return (
    <div className="buildpanel">
      <div className="rail-label">Build</div>
      {rows.map((r) => (
        <button
          key={r.label}
          className={`buildrow${r.target && mode === r.target ? " active" : ""}`}
          disabled={!r.enabled && !(r.target && mode === r.target)}
          onClick={r.onClick}
        >
          <span className="bicon">{r.icon}</span>
          <span className="bmeta">
            <span className="blabel">
              {r.label} <span className="bleft">×{r.left}</span>
            </span>
            <span className="bcost">{r.cost}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
