import { DevCardType, ResourceType } from "@core";

export const RESOURCE_ICON: Record<ResourceType, string> = {
  [ResourceType.Wood]: "🌲",
  [ResourceType.Brick]: "🧱",
  [ResourceType.Sheep]: "🐑",
  [ResourceType.Wheat]: "🌾",
  [ResourceType.Ore]: "⛰",
};

export const DEV_ICON: Record<DevCardType, string> = {
  [DevCardType.Knight]: "🛡",
  [DevCardType.VictoryPoint]: "⭐",
  [DevCardType.RoadBuilding]: "🛣",
  [DevCardType.YearOfPlenty]: "🌾",
  [DevCardType.Monopoly]: "💰",
};

export const DEV_LABEL: Record<DevCardType, string> = {
  [DevCardType.Knight]: "Knight",
  [DevCardType.VictoryPoint]: "Victory Point",
  [DevCardType.RoadBuilding]: "Road Building",
  [DevCardType.YearOfPlenty]: "Year of Plenty",
  [DevCardType.Monopoly]: "Monopoly",
};

export const BUILDING_ICON: Record<string, string> = {
  road: "🛣",
  settlement: "🏠",
  city: "🏙",
};
