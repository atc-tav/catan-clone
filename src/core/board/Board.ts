/**
 * The board graph: tiles (hexes), corners (vertices) where buildings go, and
 * sides (edges) where roads go. Adjacency between all three is precomputed once
 * at construction so the rules engine does O(1) lookups instead of recomputing
 * geometry. The Board owns *placed* pieces (buildings/roads) and the robber.
 *
 * All identity is via the string keys from the coordinate module, so this whole
 * structure serializes cleanly and ports to C# (Dictionary<string, ...>).
 */
import {
  Hex,
  hexKey,
  hexToWorld,
} from "../coordinates/Hex.js";
import {
  EdgeCoord,
  VertexCoord,
  adjacentVertices,
  edgeKey,
  edgeVertices,
  hexCorner,
  hexSide,
  vertexEdges,
  vertexKey,
} from "../coordinates/Intersections.js";
import { BuildingType, PortType, TerrainType } from "../domain/enums.js";

export interface Tile {
  readonly coord: Hex;
  readonly key: string;
  terrain: TerrainType;
  /** Dice number that triggers production; 0 for the desert. */
  numberToken: number;
}

export interface Building {
  owner: number; // player id
  type: BuildingType;
}

export interface VertexState {
  readonly coord: VertexCoord;
  readonly key: string;
  building: Building | null;
  port: PortType | null;
}

export interface EdgeState {
  readonly coord: EdgeCoord;
  readonly key: string;
  road: number | null; // owning player id, or null
}

export class Board {
  readonly tiles = new Map<string, Tile>();
  readonly vertices = new Map<string, VertexState>();
  readonly edges = new Map<string, EdgeState>();

  /** Trading ports, each on one perimeter edge (drives rendering). */
  readonly portEdges: { edge: string; type: PortType }[] = [];

  robberHex: string;

  // Precomputed adjacency (all by key).
  private readonly vertexEdgeKeys = new Map<string, string[]>();
  private readonly edgeVertexKeys = new Map<string, string[]>();
  private readonly vertexVertexKeys = new Map<string, string[]>();
  private readonly vertexHexKeys = new Map<string, string[]>();
  private readonly hexVertexKeys = new Map<string, string[]>();

  constructor(tiles: Tile[], robberHex: string) {
    for (const t of tiles) this.tiles.set(t.key, t);
    this.robberHex = robberHex;
    this.buildGraph();
  }

  // --- Graph construction ---------------------------------------------------

  private buildGraph(): void {
    // Enumerate every corner and side of every tile, deduplicating by key.
    for (const tile of this.tiles.values()) {
      for (let i = 0; i < 6; i++) {
        const v = hexCorner(tile.coord, i);
        const vk = vertexKey(v);
        if (!this.vertices.has(vk)) {
          this.vertices.set(vk, { coord: v, key: vk, building: null, port: null });
        }
        const e = hexSide(tile.coord, i);
        const ek = edgeKey(e);
        if (!this.edges.has(ek)) {
          this.edges.set(ek, { coord: e, key: ek, road: null });
        }
      }
    }

    // Vertex -> incident edges, adjacent vertices, adjacent tiles.
    for (const vs of this.vertices.values()) {
      const incidentEdges = vertexEdges(vs.coord)
        .map(edgeKey)
        .filter((k) => this.edges.has(k));
      this.vertexEdgeKeys.set(vs.key, incidentEdges);

      const adjVerts = adjacentVertices(vs.coord)
        .map(vertexKey)
        .filter((k) => this.vertices.has(k));
      this.vertexVertexKeys.set(vs.key, dedupe(adjVerts));

      const adjHexes = vs.coord.hexes.map(hexKey).filter((k) => this.tiles.has(k));
      this.vertexHexKeys.set(vs.key, adjHexes);
      for (const hk of adjHexes) {
        const list = this.hexVertexKeys.get(hk) ?? [];
        list.push(vs.key);
        this.hexVertexKeys.set(hk, list);
      }
    }

    // Edge -> endpoint vertices.
    for (const es of this.edges.values()) {
      const verts = edgeVertices(es.coord)
        .map(vertexKey)
        .filter((k) => this.vertices.has(k));
      this.edgeVertexKeys.set(es.key, verts);
    }
  }

  // --- Adjacency queries ----------------------------------------------------

  edgesOfVertex(vk: string): string[] {
    return this.vertexEdgeKeys.get(vk) ?? [];
  }

  verticesOfEdge(ek: string): string[] {
    return this.edgeVertexKeys.get(ek) ?? [];
  }

  neighborsOfVertex(vk: string): string[] {
    return this.vertexVertexKeys.get(vk) ?? [];
  }

  hexesOfVertex(vk: string): string[] {
    return this.vertexHexKeys.get(vk) ?? [];
  }

  verticesOfHex(hk: string): string[] {
    return this.hexVertexKeys.get(hk) ?? [];
  }

  /** Does edge `ek` touch vertex `vk`? */
  edgeTouchesVertex(ek: string, vk: string): boolean {
    return this.verticesOfEdge(ek).includes(vk);
  }

  /** The other endpoint of edge `ek` given one endpoint `vk`. */
  otherEndpoint(ek: string, vk: string): string | null {
    const vs = this.verticesOfEdge(ek);
    return vs.find((v) => v !== vk) ?? null;
  }

  // --- Geometry (render-only helper, also used to order perimeter ports) -----

  /** World position of a vertex: the centroid of its three hex centers. */
  vertexWorld(vk: string, size: number): { x: number; z: number } {
    const vs = this.vertices.get(vk)!;
    let x = 0;
    let z = 0;
    for (const h of vs.coord.hexes) {
      const w = hexToWorld(h, size);
      x += w.x;
      z += w.z;
    }
    return { x: x / 3, z: z / 3 };
  }

  /** True if an edge lies on the outer perimeter (touches exactly one tile). */
  isPerimeterEdge(ek: string): boolean {
    const es = this.edges.get(ek)!;
    const onBoard = es.coord.hexes.filter((h) => this.tiles.has(hexKey(h)));
    return onBoard.length === 1;
  }
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
