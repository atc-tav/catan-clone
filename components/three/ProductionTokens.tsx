"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";

export interface Gain {
  id: string;
  position: [number, number, number];
  color: string;
}

const LIFETIME = 1.8; // seconds

/** A resource token that floats up from a producing tile and fades out. */
function Token({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const start = useRef(-1);

  useFrame((state) => {
    if (!ref.current || !mat.current) return;
    if (start.current < 0) start.current = state.clock.elapsedTime;
    const p = Math.min((state.clock.elapsedTime - start.current) / LIFETIME, 1);
    ref.current.position.y = position[1] + p * 1.6;
    mat.current.opacity = 1 - p * p;
    const s = 0.9 + p * 0.2;
    ref.current.scale.setScalar(s);
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 16]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
        />
      </mesh>
    </group>
  );
}

/** Re-mounts (via the keyed nonce) and animates a burst of gain tokens. */
export function ProductionTokens({ gains, nonce }: { gains: Gain[]; nonce: number }) {
  return (
    <group>
      {gains.map((g, i) => (
        <Token key={`${nonce}-${g.id}-${i}`} position={g.position} color={g.color} />
      ))}
    </group>
  );
}
