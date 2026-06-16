"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  BuildingType,
  GamePhase,
  GameState,
  hexToWorld,
  isOpenForSettlement,
} from "@core";
import { HexTile } from "./HexTile";
import { Robber } from "./Robber";
import { City, Road, RoadGhost, Settlement, SettlementGhost } from "./pieces";
import { PLAYER_COLOR } from "./colors";
import { SIZE, edgeTransform, vertexPos } from "./geometry";

export default function BoardScene({
  state,
  onPlaceSettlement,
  onPlaceRoad,
}: {
  state: GameState;
  // `version` forces a re-render after each in-place mutation of the state.
  version: number;
  onPlaceSettlement: (vertex: string) => void;
  onPlaceRoad: (edge: string) => void;
}) {
  const board = state.board;
  const robber = board.tiles.get(board.robberHex)!;
  const robberPos = hexToWorld(robber.coord, SIZE);

  const inSetup = state.phase === GamePhase.Setup;
  const activeColor = PLAYER_COLOR[state.currentPlayer.color];

  // Placeable settlement spots (whole board) / roads (touching the new settlement).
  const settlementGhosts =
    inSetup && state.setupSubStep === "settlement"
      ? [...board.vertices.keys()].filter((k) => isOpenForSettlement(board, k))
      : [];
  const roadGhosts =
    inSetup && state.setupSubStep === "road" && state.lastSetupVertex
      ? board.edgesOfVertex(state.lastSetupVertex).filter((e) => board.edges.get(e)!.road === null)
      : [];

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

      {/* Interactive setup ghosts */}
      {settlementGhosts.map((vk) => (
        <SettlementGhost
          key={`g-${vk}`}
          position={vertexPos(board, vk)}
          color={activeColor}
          onClick={() => onPlaceSettlement(vk)}
        />
      ))}
      {roadGhosts.map((ek) => (
        <RoadGhost
          key={`g-${ek}`}
          transform={edgeTransform(board, ek)}
          color={activeColor}
          onClick={() => onPlaceRoad(ek)}
        />
      ))}

      <Robber position={[robberPos.x, 0, robberPos.z]} />

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
