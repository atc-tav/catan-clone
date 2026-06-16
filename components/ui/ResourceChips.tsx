"use client";

import { RESOURCE_TYPES, ResourceBag } from "@core";
import { RESOURCE_COLOR } from "@/components/three/helpers";
import { RESOURCE_ICON } from "./icons";

/** Renders a resource bag as compact colored "count× icon" chips. */
export function ResourceChips({ bag }: { bag: ResourceBag }) {
  const items = RESOURCE_TYPES.filter((r) => bag[r] > 0);
  if (items.length === 0) return <span className="muted">nothing</span>;
  return (
    <span className="reschips">
      {items.map((r) => (
        <span className="reschip" key={r} style={{ background: RESOURCE_COLOR[r] }}>
          {bag[r]}×{RESOURCE_ICON[r]}
        </span>
      ))}
    </span>
  );
}
