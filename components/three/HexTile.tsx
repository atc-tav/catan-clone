"use client";

import { Text } from "@react-three/drei";
import { TerrainType } from "@core";
import { TERRAIN_COLOR, tokenColor } from "./colors";

export const TILE_HEIGHT = 0.4;
export const TILE_RADIUS = 0.95; // < layout size (1) so tiles have a slight gap

export function HexTile({
  position,
  terrain,
  numberToken,
}: {
  position: [number, number, number];
  terrain: TerrainType;
  numberToken: number;
}) {
  return (
    <group position={position}>
      {/* The hexagonal prism. A 6-sided cylinder is pointy-top by default,
          matching the core's axial layout. */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[TILE_RADIUS, TILE_RADIUS, TILE_HEIGHT, 6]} />
        <meshStandardMaterial color={TERRAIN_COLOR[terrain]} flatShading />
      </mesh>

      {numberToken > 0 && (
        <group position={[0, TILE_HEIGHT / 2 + 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.42, 32]} />
            <meshStandardMaterial color="#f5e9c8" />
          </mesh>
          <Text
            position={[0, 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.42}
            color={tokenColor(numberToken)}
            anchorX="center"
            anchorY="middle"
          >
            {String(numberToken)}
          </Text>
        </group>
      )}
    </group>
  );
}
