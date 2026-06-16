"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";
import { Text } from "@react-three/drei";
import { TerrainType, tokenPips } from "@core";
import { TERRAIN_COLOR, tokenColor } from "./colors";
import { screenUpYaw } from "./billboard";

export const TILE_HEIGHT = 0.4;
export const TILE_RADIUS = 0.95; // < layout size (1) so tiles have a slight gap

export function HexTile({
  position,
  terrain,
  numberToken,
  highlight = false,
}: {
  position: [number, number, number];
  terrain: TerrainType;
  numberToken: number;
  highlight?: boolean;
}) {
  const mat = useRef<MeshStandardMaterial>(null);
  const token = useRef<Group>(null);

  useFrame((state) => {
    if (mat.current) {
      mat.current.emissiveIntensity = highlight
        ? 0.35 + 0.25 * Math.sin(state.clock.elapsedTime * 6)
        : 0;
    }
    // Keep the number/dots screen-aligned as the board orbits (stable overhead).
    if (token.current) {
      token.current.rotation.y = screenUpYaw(state.camera);
    }
  });

  const pips = tokenPips(numberToken);
  const dotColor = tokenColor(numberToken);
  const dotSpacing = 0.06;
  const dotStart = -((pips - 1) * dotSpacing) / 2;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[TILE_RADIUS, TILE_RADIUS, TILE_HEIGHT, 6]} />
        <meshStandardMaterial
          ref={mat}
          color={TERRAIN_COLOR[terrain]}
          emissive="#fff2b0"
          emissiveIntensity={0}
          flatShading
        />
      </mesh>

      {numberToken > 0 && (
        <group ref={token} position={[0, TILE_HEIGHT / 2 + 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.42, 32]} />
            <meshStandardMaterial color="#f5e9c8" />
          </mesh>
          <Text
            position={[0, 0.02, -0.06]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.38}
            color={dotColor}
            anchorX="center"
            anchorY="middle"
          >
            {String(numberToken)}
          </Text>
          {/* Probability dots: more dots = more likely to be rolled. */}
          {Array.from({ length: pips }, (_, i) => (
            <mesh key={i} position={[dotStart + i * dotSpacing, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.022, 12]} />
              <meshStandardMaterial color={dotColor} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
