"use client";

import { Canvas } from "@react-three/fiber";
import { Dice } from "./Dice";

/**
 * A small fixed dice "tray" with its own mini 3D scene, so the dice roll in a
 * dedicated corner instead of on top of the board.
 */
export function DiceTray({
  values,
  nonce,
  rolling,
}: {
  values: [number, number] | null;
  nonce: number;
  rolling: boolean;
}) {
  return (
    <div className="dice-tray">
      <div className="dice-tray-label">{rolling ? "rolling…" : "dice"}</div>
      <Canvas camera={{ position: [0, 2.1, 2.7], fov: 35 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} />
        {values && <Dice values={values} nonce={nonce} />}
      </Canvas>
    </div>
  );
}
