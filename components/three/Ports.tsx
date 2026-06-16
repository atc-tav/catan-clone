"use client";

import { Text } from "@react-three/drei";
import { Board, PortType } from "@core";
import { TOP_Y, edgeTransform } from "./geometry";

const PORT_COLOR: Record<PortType, string> = {
  [PortType.Generic]: "#9aa7bd",
  [PortType.Wood]: "#2e7d32",
  [PortType.Brick]: "#c75b27",
  [PortType.Sheep]: "#7cb342",
  [PortType.Wheat]: "#f4c542",
  [PortType.Ore]: "#8d99a6",
};

function label(type: PortType): string {
  return type === PortType.Generic ? "3:1" : "2:1";
}

/** Renders each trading port as a labeled buoy just off the coast. */
export function Ports({ board }: { board: Board }) {
  return (
    <group>
      {board.portEdges.map(({ edge, type }) => {
        const t = edgeTransform(board, edge);
        // Push the marker outward from the board center, onto the "water".
        const [x, , z] = t.position;
        const len = Math.hypot(x, z) || 1;
        const px = x + (x / len) * 0.7;
        const pz = z + (z / len) * 0.7;
        return (
          <group key={edge} position={[px, TOP_Y, pz]}>
            <mesh>
              <cylinderGeometry args={[0.34, 0.34, 0.14, 16]} />
              <meshStandardMaterial color={PORT_COLOR[type]} />
            </mesh>
            <Text
              position={[0, 0.1, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.26}
              color="#10161f"
              anchorX="center"
              anchorY="middle"
            >
              {label(type)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
