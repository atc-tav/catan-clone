"use client";

import { Text } from "@react-three/drei";
import { Board, PortType } from "@core";
import { TOP_Y, edgeTransform, vertexPos } from "./geometry";

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

/** A wooden pier connecting the buoy to one of the port's two corners. */
function Pier({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, TOP_Y, (from[2] + to[2]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      <boxGeometry args={[len, 0.06, 0.08]} />
      <meshStandardMaterial color="#7a5a33" />
    </mesh>
  );
}

/** Each trading port: a labeled buoy off the coast with piers to its two corners. */
export function Ports({ board }: { board: Board }) {
  return (
    <group>
      {board.portEdges.map(({ edge, type }) => {
        const t = edgeTransform(board, edge);
        const [x, , z] = t.position;
        const len = Math.hypot(x, z) || 1;
        const buoy: [number, number, number] = [x + (x / len) * 0.7, TOP_Y, z + (z / len) * 0.7];
        const corners = board.verticesOfEdge(edge).map((vk) => vertexPos(board, vk));
        return (
          <group key={edge}>
            {corners.map((c, i) => (
              <Pier key={i} from={buoy} to={c} />
            ))}
            <group position={buoy}>
              <mesh>
                <cylinderGeometry args={[0.34, 0.34, 0.16, 16]} />
                <meshStandardMaterial color={PORT_COLOR[type]} />
              </mesh>
              <Text
                position={[0, 0.11, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.26}
                color="#10161f"
                anchorX="center"
                anchorY="middle"
              >
                {label(type)}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
}
