"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Rng, buildStandardBoard, TerrainType } from "@core";
import { TERRAIN_COLOR, TERRAIN_LABEL } from "@/components/three/colors";

// Three.js touches browser-only APIs, so load the scene on the client only.
const BoardScene = dynamic(() => import("@/components/three/BoardScene"), {
  ssr: false,
  loading: () => <div style={{ padding: 20 }}>Loading board…</div>,
});

export default function GameClient() {
  const [seed, setSeed] = useState(2026);
  // The board is generated purely from the seed by the portable core.
  const board = useMemo(() => buildStandardBoard(new Rng(seed)), [seed]);

  return (
    <main className="app">
      <header className="topbar">
        <h1>catan-clone</h1>
        <span className="tagline">seed #{seed} · 3D board (Three.js)</span>
        <div className="spacer" />
        <button onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>
          New board
        </button>
      </header>

      <div className="canvas-wrap">
        <BoardScene board={board} />

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
