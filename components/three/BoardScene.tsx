"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  BuildingType,
  GameState,
  canBuildRoad,
  hexToWorld,
  isOpenForSettlement,
  terrainResource,
  vertexConnectsToRoad,
} from "@core";
import { HexTile, TILE_HEIGHT, TILE_RADIUS } from "./HexTile";
import { Robber } from "./Robber";
import {
  City,
  HexGhost,
  Road,
  RoadGhost,
  Settlement,
  SettlementGhost,
} from "./pieces";
import { PLAYER_COLOR } from "./colors";
import { RESOURCE_COLOR } from "./helpers";
import { Gain, ProductionTokens } from "./ProductionTokens";
import { SIZE, edgeTransform, vertexPos } from "./geometry";

export type BoardMode =
  | "none"
  | "setup-settlement"
  | "setup-road"
  | "build-road"
  | "build-settlement"
  | "build-city"
  | "move-robber";

export default function BoardScene({
  state,
  mode,
  highlightSum,
  rollNonce,
  onVertex,
  onEdge,
  onHex,
}: {
  state: GameState;
  // `version` forces a re-render after each in-place mutation of the state.
  version: number;
  mode: BoardMode;
  /** The just-rolled sum during the highlight window (null otherwise). */
  highlightSum: number | null;
  rollNonce: number;
  onVertex: (vertex: string) => void;
  onEdge: (edge: string) => void;
  onHex: (hex: string) => void;
}) {
  const board = state.board;
  const cur = state.currentPlayerIndex;
  const robber = board.tiles.get(board.robberHex)!;
  const robberPos = hexToWorld(robber.coord, SIZE);
  const activeColor = PLAYER_COLOR[state.currentPlayer.color];

  // Clickable targets, derived from the mode via the same rules the engine uses.
  const vertexSpots: string[] =
    mode === "setup-settlement"
      ? [...board.vertices.keys()].filter((k) => isOpenForSettlement(board, k))
      : mode === "build-settlement"
        ? [...board.vertices.keys()].filter(
            (k) => isOpenForSettlement(board, k) && vertexConnectsToRoad(board, cur, k),
          )
        : mode === "build-city"
          ? [...board.vertices.values()]
              .filter(
                (v) =>
                  v.building?.owner === cur && v.building.type === BuildingType.Settlement,
              )
              .map((v) => v.key)
          : [];

  const edgeSpots: string[] =
    mode === "setup-road"
      ? state.lastSetupVertex
        ? board.edgesOfVertex(state.lastSetupVertex).filter((e) => board.edges.get(e)!.road === null)
        : []
      : mode === "build-road"
        ? [...board.edges.keys()].filter((e) => canBuildRoad(board, cur, e))
        : [];

  const hexSpots: string[] =
    mode === "move-robber"
      ? [...board.tiles.keys()].filter((k) => k !== board.robberHex)
      : [];

  // Production tokens: one per produced resource at each producing building,
  // shown for the just-rolled (non-7) number.
  const gains: Gain[] = [];
  if (highlightSum !== null && highlightSum !== 7) {
    for (const tile of board.tiles.values()) {
      if (tile.numberToken !== highlightSum || tile.key === board.robberHex) continue;
      const res = terrainResource(tile.terrain);
      if (!res) continue;
      for (const vk of board.verticesOfHex(tile.key)) {
        const b = board.vertices.get(vk)?.building;
        if (!b) continue;
        const [vx, , vz] = vertexPos(board, vk);
        const count = b.type === BuildingType.City ? 2 : 1;
        for (let i = 0; i < count; i++) {
          gains.push({
            id: `${vk}-${i}`,
            position: [vx, TILE_HEIGHT / 2 + 0.3 + i * 0.25, vz],
            color: RESOURCE_COLOR[res],
          });
        }
      }
    }
  }

  return (
    <Canvas shadows camera={{ position: [0, 13, 11], fov: 45 }}>
      <color attach="background" args={["#0e1726"]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[8, 18, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Terrain tiles */}
      {[...board.tiles.values()].map((tile) => {
        const { x, z } = hexToWorld(tile.coord, SIZE);
        return (
          <HexTile
            key={tile.key}
            position={[x, 0, z]}
            terrain={tile.terrain}
            numberToken={tile.numberToken}
            highlight={
              highlightSum !== null &&
              tile.numberToken === highlightSum &&
              tile.key !== board.robberHex
            }
          />
        );
      })}

      {/* Placed buildings */}
      {[...board.vertices.values()].map((v) => {
        if (!v.building) return null;
        const color = PLAYER_COLOR[state.player(v.building.owner).color];
        const pos = vertexPos(board, v.key);
        return v.building.type === BuildingType.City ? (
          <City key={v.key} position={pos} color={color} />
        ) : (
          <Settlement key={v.key} position={pos} color={color} />
        );
      })}

      {/* Placed roads */}
      {[...board.edges.values()].map((e) =>
        e.road === null ? null : (
          <Road
            key={e.key}
            transform={edgeTransform(board, e.key)}
            color={PLAYER_COLOR[state.player(e.road).color]}
          />
        ),
      )}

      {/* Interactive targets */}
      {vertexSpots.map((vk) => (
        <SettlementGhost
          key={`gv-${vk}`}
          position={vertexPos(board, vk)}
          color={activeColor}
          onClick={() => onVertex(vk)}
        />
      ))}
      {edgeSpots.map((ek) => (
        <RoadGhost
          key={`ge-${ek}`}
          transform={edgeTransform(board, ek)}
          color={activeColor}
          onClick={() => onEdge(ek)}
        />
      ))}
      {hexSpots.map((hk) => {
        const { x, z } = hexToWorld(board.tiles.get(hk)!.coord, SIZE);
        return (
          <HexGhost
            key={`gh-${hk}`}
            position={[x, 0.2, z]}
            radius={TILE_RADIUS}
            onClick={() => onHex(hk)}
          />
        );
      })}

      <Robber position={[robberPos.x, 0, robberPos.z]} />

      <ProductionTokens gains={gains} nonce={rollNonce} />

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={8}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  );
}
