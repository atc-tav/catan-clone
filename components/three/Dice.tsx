"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";

/**
 * Two procedural pip dice that tumble and settle on the rolled values. Pure
 * animation — no physics engine — so it stays light and deploys clean.
 */

// Which die face carries which value (opposite faces sum to 7).
//   +Y = 1, -Y = 6, +Z = 2, -Z = 5, +X = 3, -X = 4
// Resting rotation that brings each value's face to the top (+Y).
const FACE_UP: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  5: [Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
};

// Pip positions within a face (local x, y in [-0.25, 0.25]).
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.22, 0.22], [0.22, -0.22]],
  3: [[-0.22, 0.22], [0, 0], [0.22, -0.22]],
  4: [[-0.22, 0.22], [0.22, 0.22], [-0.22, -0.22], [0.22, -0.22]],
  5: [[-0.22, 0.22], [0.22, 0.22], [0, 0], [-0.22, -0.22], [0.22, -0.22]],
  6: [[-0.22, 0.22], [0.22, 0.22], [-0.22, 0], [0.22, 0], [-0.22, -0.22], [0.22, -0.22]],
};

// Each face: offset to its center and a rotation so its pip-plane faces outward.
const FACES: { value: number; pos: [number, number, number]; rot: [number, number, number] }[] = [
  { value: 1, pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },
  { value: 6, pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },
  { value: 2, pos: [0, 0, 0.5], rot: [0, 0, 0] },
  { value: 5, pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },
  { value: 3, pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
  { value: 4, pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
];

const DURATION = 1.1; // seconds

function Die({
  value,
  position,
  nonce,
  phase,
}: {
  value: number;
  position: [number, number, number];
  nonce: number;
  phase: number; // 0 or 1 — stagger the two dice slightly
}) {
  const ref = useRef<Group>(null);
  const start = useRef<number>(-1);
  const spin = useRef<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    start.current = 0; // (re)start on the next frame using elapsed time
    spin.current = [
      6 + Math.random() * 6,
      6 + Math.random() * 6,
      6 + Math.random() * 6,
    ];
  }, [nonce]);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const target = FACE_UP[value] ?? FACE_UP[1];
    if (start.current === 0) start.current = state.clock.elapsedTime + phase * 0.12;
    const t = state.clock.elapsedTime - start.current;
    if (t < 0) return;
    const p = Math.min(t / DURATION, 1);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const k = 1 - e;
    g.rotation.set(
      target[0] + spin.current[0] * k,
      target[1] + spin.current[1] * k,
      target[2] + spin.current[2] * k,
    );
    // Little hop while tumbling.
    g.position.y = position[1] + Math.sin(p * Math.PI) * 0.6 * k;
  });

  return (
    <group ref={ref} position={position} scale={0.62}>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f3efe6" />
      </mesh>
      {FACES.map((f) => (
        <group key={f.value} position={f.pos} rotation={f.rot}>
          {PIPS[f.value].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.02]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#23201c" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Dice({
  values,
  nonce,
  position = [0, 2.2, 3.4],
}: {
  values: [number, number];
  nonce: number;
  position?: [number, number, number];
}) {
  const [x, y, z] = position;
  return (
    <>
      <Die value={values[0]} position={[x - 0.55, y, z]} nonce={nonce} phase={0} />
      <Die value={values[1]} position={[x + 0.55, y, z]} nonce={nonce} phase={1} />
    </>
  );
}
