import { GameState, Player, PortType, ResourceType } from "@core";

/** Display colors for resource chips in the HUD. */
export const RESOURCE_COLOR: Record<ResourceType, string> = {
  [ResourceType.Wood]: "#2e7d32",
  [ResourceType.Brick]: "#c75b27",
  [ResourceType.Sheep]: "#7cb342",
  [ResourceType.Wheat]: "#f4c542",
  [ResourceType.Ore]: "#8d99a6",
};

const PORT_FOR: Record<ResourceType, PortType> = {
  [ResourceType.Wood]: PortType.Wood,
  [ResourceType.Brick]: PortType.Brick,
  [ResourceType.Sheep]: PortType.Sheep,
  [ResourceType.Wheat]: PortType.Wheat,
  [ResourceType.Ore]: PortType.Ore,
};

/** Best bank-trade rate the player can get for giving up `give` (2, 3, or 4). */
export function bankTradeRate(player: Player, give: ResourceType): number {
  if (player.ports.has(PORT_FOR[give])) return 2;
  if (player.ports.has(PortType.Generic)) return 3;
  return 4;
}

/** Players the mover could steal from after placing the robber on `hex`. */
export function robberVictims(state: GameState, hex: string, moverId: number): number[] {
  const victims = new Set<number>();
  for (const vk of state.board.verticesOfHex(hex)) {
    const b = state.board.vertices.get(vk)?.building;
    if (b && b.owner !== moverId && state.player(b.owner).resourceCount() > 0) {
      victims.add(b.owner);
    }
  }
  return [...victims];
}
