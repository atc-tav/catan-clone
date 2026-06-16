"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Board, hexToWorld } from "@core";
import { HexTile } from "./HexTile";
import { Robber } from "./Robber";

const SIZE = 1; // hex center-to-corner; matches HexTile geometry

export default function BoardScene({ board }: { board: Board }) {
  const tiles = [...board.tiles.values()];
  const robber = board.tiles.get(board.robberHex)!;
  const robberPos = hexToWorld(robber.coord, SIZE);

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

      {tiles.map((tile) => {
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
