# Three.js the streamlined way (React Three Fiber)

A practical, copy-paste-friendly reference for building 3D in the browser the way
this project does it — **declarative Three.js via React Three Fiber (R3F)**,
using **procedural geometry** (shapes built from code, no model files). Written so
you can lift these patterns into future projects.

If you fought raw Three.js before (manual `Scene`/`Renderer`/`requestAnimationFrame`,
disposing geometries by hand, juggling refs): R3F removes ~80% of that boilerplate.
You describe *what* is in the scene as JSX; R3F runs the render loop and cleanup.

---

## 1. The mental model

Three.js draws a **scene graph**: a tree of objects, each with a position,
rotation, and scale, some of which are **meshes** (a shape you can see). A mesh is
always two things bolted together:

> **mesh = geometry (the shape) + material (the surface)**

R3F lets you write that tree as React components. Every Three.js class becomes a
lowercase JSX tag:

```tsx
<mesh>                       {/* THREE.Mesh */}
  <boxGeometry args={[1, 1, 1]} />   {/* THREE.BoxGeometry(1,1,1) */}
  <meshStandardMaterial color="tomato" /> {/* THREE.MeshStandardMaterial */}
</mesh>
```

Rules of thumb:
- A JSX tag `<xyz />` maps to `THREE.Xyz`.
- **`args`** is the constructor — `<boxGeometry args={[w, h, d]} />` === `new THREE.BoxGeometry(w, h, d)`.
- Any other prop sets a property — `position={[x, y, z]}`, `color="red"`,
  `rotation={[x, y, z]}` (radians!), `castShadow`.
- Nesting = parenting. Children inherit the parent's transform.

That's the whole language. The rest is knowing which shapes and materials exist.

---

## 2. The Canvas (and the Next.js gotcha)

Everything lives inside a `<Canvas>`. It creates the renderer, a default camera,
and runs the animation loop for you:

```tsx
import { Canvas } from "@react-three/fiber";

<Canvas shadows camera={{ position: [0, 13, 11], fov: 45 }}>
  {/* lights + meshes go here */}
</Canvas>
```

**Gotcha (this bites everyone in Next.js):** Three.js touches `window`, which does
not exist during server-side rendering. Render the Canvas **client-side only**, or
the build/hydration explodes. Two-part fix we use:

```tsx
// 1. The component with the Canvas starts with:
"use client";

// 2. The page imports it with SSR disabled:
import dynamic from "next/dynamic";
const BoardScene = dynamic(() => import("@/components/three/BoardScene"), {
  ssr: false,
  loading: () => <div>Loading board…</div>,
});
```

See `app/GameClient.tsx` (the dynamic import) and `components/three/BoardScene.tsx`
(`"use client"` + the Canvas).

---

## 3. Procedural geometry: the primitives cheat-sheet

You can get *surprisingly* far with five built-in shapes. `args` are their
constructor parameters.

| Shape | JSX | Key `args` | Notes |
| --- | --- | --- | --- |
| Box | `<boxGeometry args={[w, h, d]} />` | width, height, depth | Walls, roads, towers |
| Cylinder | `<cylinderGeometry args={[rTop, rBot, h, sides]} />` | radii, height, radial segments | **`sides=6` → a hexagonal prism!** |
| Cone | `<coneGeometry args={[r, h, sides]} />` | radius, height, segments | **`sides=4` → a pyramid** (roof) |
| Sphere | `<sphereGeometry args={[r, wSeg, hSeg]} />` | radius, detail | Heads, ghost markers |
| Plane | `<planeGeometry args={[w, h]} />` | width, height | Ground, tokens (flat disc: `circleGeometry`) |

The "aha" moments that build our whole board:
- **A tile is a 6-sided cylinder** — `cylinderGeometry args={[r, r, h, 6]}`
  (`components/three/HexTile.tsx`).
- **A roof is a 4-sided cone** — a pyramid (`components/three/pieces.tsx`).

### Compound objects = a `<group>` of primitives

A "settlement" isn't one shape; it's a box + a pyramid, wrapped in a `<group>` so
they move/rotate together and share one position:

```tsx
function Settlement({ position, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.11, 0]}>           {/* walls */}
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[0, Math.PI / 4, 0]}> {/* roof */}
        <coneGeometry args={[0.24, 0.18, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
```

A city is "two stacked boxes," a road is "one long thin box," the robber is "a
tapered cylinder + a sphere." That's the entire art pipeline.

**Units & rotation:** units are arbitrary — pick a scale and stay consistent (our
hex is ~1 unit). Rotations are in **radians**, not degrees: `Math.PI` = 180°,
`Math.PI / 4` = 45°. To convert: `radians = degrees * Math.PI / 180`.

---

## 4. Materials + light = the look

Geometry alone is invisible until light hits a material.

| Material | Reacts to light? | Use it for |
| --- | --- | --- |
| `meshBasicMaterial` | No (flat, always full color) | UI markers, unlit accents |
| `meshStandardMaterial` | **Yes** (physically based) | Almost everything — realistic shading |
| `meshStandardMaterial` + `flatShading` | Yes, **faceted** | The crisp low-poly look our tiles have |

Two lights give depth — a soft fill so nothing is pure black, plus an angled
"sun" for highlights and shadow direction:

```tsx
<ambientLight intensity={0.75} />
<directionalLight position={[8, 18, 6]} intensity={1.1} castShadow />
```

> If your scene renders **solid black**, you almost certainly have a
> light-reacting material (`meshStandard…`) and **no lights**. Add a light, or
> switch to `meshBasicMaterial` to debug.

Shadows need three opt-ins: `shadows` on `<Canvas>`, `castShadow` on the light and
the casting meshes, and a surface with `receiveShadow`.

---

## 5. Camera controls (drei)

`@react-three/drei` is a companion grab-bag of helpers. The one you'll use first
is `OrbitControls` — drag to rotate, scroll to zoom, free:

```tsx
import { OrbitControls } from "@react-three/drei";

<OrbitControls
  enablePan={false}
  minDistance={8}
  maxDistance={28}
  maxPolarAngle={Math.PI / 2.2}   // stop the camera dipping below the board
/>
```

Other drei helpers worth knowing: `<Text>` (3D text — our number tokens),
`useCursor` (pointer cursor on hover), `<Html>` (DOM overlays anchored in 3D),
`<Environment>` (instant realistic lighting), `<Bounds>` (auto-fit the camera).

---

## 6. Interactivity (clicking 3D objects)

R3F wires up raycasting for you — meshes take pointer events like DOM nodes. No
manual `Raycaster`:

```tsx
import { useCursor } from "@react-three/drei";

function ClickableSpot({ position, onClick }) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered); // swaps the mouse cursor to a pointer while hovered
  return (
    <mesh
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[hovered ? 0.2 : 0.15, 16, 16]} />
      <meshStandardMaterial color="gold" transparent opacity={hovered ? 0.95 : 0.55} />
    </mesh>
  );
}
```

**Always `e.stopPropagation()`** in 3D handlers — a single click ray can hit
several overlapping objects, and without it they *all* fire. See the ghost markers
in `components/three/pieces.tsx`.

---

## 7. Making the scene react to your app state

The scene is just React, so **state drives the picture** — change state, the scene
re-renders. Idiomatically you keep state in `useState`/a store and map over it:

```tsx
{buildings.map((b) => <Settlement key={b.id} position={b.pos} color={b.color} />)}
```

**Our specific case** is worth calling out because it's a common one. Our game
logic (`GameManager`) **mutates its state object in place** (it's designed to port
to C#, where that's normal). React doesn't see in-place mutations, so after each
move we bump a counter to force the re-render:

```tsx
const [version, setVersion] = useState(0);
const place = (action) => {
  const result = manager.dispatch(action);
  if (result.ok) setVersion((v) => v + 1); // <- triggers React to redraw the scene
};
```

That `version` flows into `<BoardScene>` as a prop, so React re-runs it and reads
the freshly-mutated state. See `app/GameClient.tsx`.

### Animating things: `useFrame`

For motion (a spinning robber, a dice tumble), `useFrame` runs every frame:

```tsx
import { useFrame } from "@react-three/fiber";
const ref = useRef();
useFrame((_, delta) => { ref.current.rotation.y += delta; }); // ~constant speed
return <mesh ref={ref}>…</mesh>;
```

Animate via refs (mutating `ref.current.rotation`) rather than React state — you do
**not** want a `setState` 60×/second.

---

## 8. Gotchas that cost people hours

- **Black screen** → light-reacting material with no lights (see §4).
- **`window is not defined` / hydration error in Next.js** → render the Canvas
  client-only with `dynamic(..., { ssr: false })` (see §2).
- **Degrees vs radians** → rotations are radians. `45°` is `Math.PI / 4`.
- **Clicks firing on hidden objects** → missing `e.stopPropagation()` (see §6).
- **Nothing reacts when data changes** → you mutated state in place; React needs a
  new reference or a version bump (see §7).
- **Z-fighting (flickering coplanar faces)** → nudge one surface up by a hair
  (`y + 0.01`), as we do for number tokens sitting on tiles.
- **Performance with many identical objects** → reuse one geometry/material, or use
  `<Instances>`/`InstancedMesh` (drei) instead of thousands of separate meshes.

---

## 9. A complete minimal starter

Drop this in any React app (Vite or Next.js) after
`npm i three @react-three/fiber @react-three/drei`:

```tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function Scene() {
  return (
    <Canvas camera={{ position: [3, 3, 3] }} style={{ height: "100vh" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="tomato" flatShading />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
```

---

## 10. Where each idea lives in this repo

| Concept | File |
| --- | --- |
| Canvas, lights, camera, mapping state → meshes | `components/three/BoardScene.tsx` |
| Hexagon-from-cylinder + 3D text token | `components/three/HexTile.tsx` |
| Compound primitives + clickable ghosts | `components/three/pieces.tsx` |
| Robber (cylinder + sphere) | `components/three/Robber.tsx` |
| Math: board coords → world transforms | `components/three/geometry.ts` |
| SSR-safe dynamic import + state→render bump | `app/GameClient.tsx` |

## Further reading

- React Three Fiber docs: https://r3f.docs.pmnd.rs
- drei helpers: https://github.com/pmndrs/drei
- Three.js manual: https://threejs.org/manual
- Three.js geometry list: https://threejs.org/docs (see *Geometries*)
