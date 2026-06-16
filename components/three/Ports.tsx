"use client";

import { Text } from "@react-three/drei";
import { Board, PortType, hexKey, hexToWorld } from "@core";
import { SIZE, TOP_Y, vertexPos } from "./geometry";

const PORT_COLOR: Record<PortType, string> = {
  [PortType.Generic]: "#eef2f7", // near-white "any" port, distinct from grey ore
  [PortType.Wood]: "#2e7d32",
  [PortType.Brick]: "#c75b27",
  [PortType.Sheep]: "#7cb342",
  [PortType.Wheat]: "#f4c542",
  [PortType.Ore]: "#586271", // darker steel so 2:1 ore != 3:1 generic
};

const OCEAN = "#2c6e9c";

function label(type: PortType): string {
  return type === PortType.Generic ? "3:1" : "2:1";
}

/** An ocean-colored pier from the buoy to one of the port's two corners. */
function Pier({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, TOP_Y, (from[2] + to[2]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      <boxGeometry args={[len, 0.07, 0.1]} />
      <meshStandardMaterial color={OCEAN} />
    </mesh>
  );
}

/**
 * Each trading port sits at the center of its sea hex (the off-board hexagon
 * beyond the coast edge), with piers reaching to the two corners it serves.
 */
export function Ports({ board }: { board: Board }) {
  return (
    <group>
      {board.portEdges.map(({ edge, type }) => {
        const es = board.edges.get(edge)!;
        // The port edge borders one real tile and one off-board "sea" hex.
        const seaHex = es.coord.hexes.find((h) => !board.tiles.has(hexKey(h)));
        if (!seaHex) return null;
        const sea = hexToWorld(seaHex, SIZE);
        const buoy: [number, number, number] = [sea.x, TOP_Y, sea.z];
        const corners = board.verticesOfEdge(edge).map((vk) => vertexPos(board, vk));
        return (
          <group key={edge}>
            {corners.map((c, i) => (
              <Pier key={i} from={buoy} to={c} />
            ))}
            <group position={buoy}>
              <mesh>
                <cylinderGeometry args={[0.36, 0.36, 0.16, 16]} />
                <meshStandardMaterial color={PORT_COLOR[type]} />
              </mesh>
              <Text
                position={[0, 0.11, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.28}
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
