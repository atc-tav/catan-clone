"use client";

import { useCursor } from "@react-three/drei";
import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { EdgeTransform } from "./geometry";

/** A settlement: a little house (box + pyramid roof) in the owner's color. */
export function Settlement({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.24, 0.18, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** A city: a taller, two-tier block in the owner's color. */
export function City({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.42, 0.3, 0.42]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.1, 0.42, 0.1]} castShadow>
        <boxGeometry args={[0.22, 0.26, 0.22]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/** A road: a slim box laid along its edge, in the owner's color. */
export function Road({ transform, color }: { transform: EdgeTransform; color: string }) {
  return (
    <mesh
      position={transform.position}
      rotation={[0, transform.rotationY, 0]}
      castShadow
    >
      <boxGeometry args={[transform.length * 0.82, 0.12, 0.16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** A clickable, hover-highlighted ghost marker for a placeable settlement spot. */
export function SettlementGhost({
  position,
  color,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return (
    <mesh
      position={[position[0], position[1] + 0.16, position[2]]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <sphereGeometry args={[hovered ? 0.2 : 0.15, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered ? 0.95 : 0.55}
        emissive={color}
        emissiveIntensity={hovered ? 0.5 : 0.15}
      />
    </mesh>
  );
}

/** A clickable, hover-highlighted ghost marker for a placeable road. */
export function RoadGhost({
  transform,
  color,
  onClick,
}: {
  transform: EdgeTransform;
  color: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return (
    <mesh
      position={[transform.position[0], transform.position[1] + 0.05, transform.position[2]]}
      rotation={[0, transform.rotationY, 0]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <boxGeometry args={[transform.length * 0.82, 0.14, 0.18]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered ? 0.95 : 0.5}
        emissive={color}
        emissiveIntensity={hovered ? 0.5 : 0.15}
      />
    </mesh>
  );
}

/** A clickable hex overlay, used to choose where to move the robber. */
export function HexGhost({
  position,
  radius,
  onClick,
}: {
  position: [number, number, number];
  radius: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return (
    <mesh
      position={[position[0], position[1] + 0.12, position[2]]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <cylinderGeometry args={[radius, radius, 0.12, 6]} />
      <meshStandardMaterial
        color="#1a1a1a"
        transparent
        opacity={hovered ? 0.45 : 0.18}
        emissive="#000000"
      />
    </mesh>
  );
}
