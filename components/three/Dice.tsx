"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { CanvasTexture, Group } from "three";

/**
 * Two procedural pip dice that tumble and settle on the rolled values. Rounded
 * corners (RoundedBox) and engraved-looking pips (drawn to a canvas texture,
 * with an inner gradient that reads as a recess) for a quality-die feel. Pure
 * animation — no physics engine.
 */

// +Y = 1, -Y = 6, +Z = 2, -Z = 5, +X = 3, -X = 4 (opposite faces sum to 7).
const FACE_UP: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  5: [Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
};

const FACES: { value: number; pos: [number, number, number]; rot: [number, number, number] }[] = [
  { value: 1, pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },
  { value: 6, pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },
  { value: 2, pos: [0, 0, 0.5], rot: [0, 0, 0] },
  { value: 5, pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },
  { value: 3, pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
  { value: 4, pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
];

// Pip layout per value, in normalized face coords [-1, 1] (corners at ±1).
const PIP_POS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};

const DURATION = 0.8;

function makePipTexture(value: number): CanvasTexture {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  const r = S * 0.105;
  // Spread pips toward the corners (matching real dice) while leaving a margin.
  const spread = 0.36;
  for (const [nx, ny] of PIP_POS[value]) {
    const cx = S / 2 + nx * S * spread;
    const cy = S / 2 - ny * S * spread;
    // Radial gradient: dark center -> lighter rim fakes an engraved recess.
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, "#000000");
    g.addColorStop(0.7, "#1c1a17");
    g.addColorStop(1, "#4a463f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function Die({
  value,
  position,
  nonce,
  phase,
}: {
  value: number;
  position: [number, number, number];
  nonce: number;
  phase: number;
}) {
  const ref = useRef<Group>(null);
  const startMs = useRef<number>(-1);
  const spin = useRef<[number, number, number]>([0, 0, 0]);
  const textures = useMemo(() => [1, 2, 3, 4, 5, 6].map(makePipTexture), []);

  useEffect(() => {
    if (nonce <= 0) return; // sit at rest until the first real roll
    startMs.current = performance.now() + phase * 110;
    spin.current = [6 + Math.random() * 6, 6 + Math.random() * 6, 6 + Math.random() * 6];
  }, [nonce, phase]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const target = FACE_UP[value] ?? FACE_UP[1];
    // Wall-clock timing (independent of the R3F render clock) so a roll is
    // always exactly DURATION, never "stuck".
    if (startMs.current < 0) {
      g.rotation.set(target[0], target[1], target[2]);
      return;
    }
    const t = (performance.now() - startMs.current) / 1000;
    if (t < 0) return;
    const p = Math.min(t / DURATION, 1);
    const e = 1 - Math.pow(1 - p, 3);
    const k = 1 - e;
    g.rotation.set(
      target[0] + spin.current[0] * k,
      target[1] + spin.current[1] * k,
      target[2] + spin.current[2] * k,
    );
  });

  return (
    <group ref={ref} position={position} scale={0.85}>
      <RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#efe9dd" roughness={0.45} />
      </RoundedBox>
      {FACES.map((f) => (
        <mesh
          key={f.value}
          position={[f.pos[0] * 1.005, f.pos[1] * 1.005, f.pos[2] * 1.005]}
          rotation={f.rot}
        >
          <planeGeometry args={[0.82, 0.82]} />
          <meshStandardMaterial map={textures[f.value - 1]} transparent />
        </mesh>
      ))}
    </group>
  );
}

export function Dice({ values, nonce }: { values: [number, number]; nonce: number }) {
  return (
    <>
      <Die value={values[0]} position={[-0.75, 0, 0]} nonce={nonce} phase={0} />
      <Die value={values[1]} position={[0.75, 0, 0]} nonce={nonce} phase={1} />
    </>
  );
}
