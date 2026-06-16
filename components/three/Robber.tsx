"use client";

import { TILE_HEIGHT } from "./HexTile";

/** The robber: a simple dark pawn standing on its hex. */
export function Robber({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, TILE_HEIGHT / 2 + 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.8, 12]} />
        <meshStandardMaterial color="#37343a" roughness={0.6} />
      </mesh>
      <mesh position={[0, TILE_HEIGHT / 2 + 0.95, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#37343a" roughness={0.6} />
      </mesh>
    </group>
  );
}
