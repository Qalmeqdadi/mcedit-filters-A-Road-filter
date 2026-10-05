// Low-poly building blocks for the world: ships, cranes, container yards and the party buildings.
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Palette } from "./palette";

export const box = new THREE.BoxGeometry(1, 1, 1);
const tmp = new THREE.Object3D();
const col = new THREE.Color();

type V3 = [number, number, number];

export function B({ s, p, c, r, shadow = true, emissive, glow = 0, opacity }: {
  s: V3; p: V3; c: string; r?: V3; shadow?: boolean; emissive?: string; glow?: number; opacity?: number;
}) {
  return (
    <mesh geometry={box} scale={s} position={p} rotation={r} castShadow={shadow} receiveShadow>
      <meshStandardMaterial
        color={c} roughness={0.75} emissive={emissive ?? "#000000"} emissiveIntensity={glow}
        transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------- ships

const BOX_COLORS = ["#2f6f9f", "#13837a", "#f2b705", "#b8402c", "#7a4e9a", "#8a9aa0", "#1f5f8b", "#d98a2b"];
const L = 12;
const BEAM = 2.6;
const BAYS = 4;
const ROWS = 3;
const TIERS = 3;
export const SHIP_SLOTS = BAYS * ROWS * TIERS;

function hullGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-BEAM / 2, -L / 2);
  s.lineTo(BEAM / 2, -L / 2);
  s.lineTo(BEAM / 2, L / 2 - 2.6);
  s.quadraticCurveTo(BEAM / 2, L / 2 - 0.6, 0, L / 2);
  s.quadraticCurveTo(-BEAM / 2, L / 2 - 0.6, -BEAM / 2, L / 2 - 2.6);
  s.lineTo(-BEAM / 2, -L / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, 1.3, 0);
  return g;
}
const HULL = hullGeometry();

export interface ShipProps {
  color: string;
  pal: Palette;
  /** containers on deck, 0 to SHIP_SLOTS */
  load?: number;
  /** extra slots drawn as ghost boxes, for free space */
  ghost?: number;
  dim?: boolean;
  seed?: number;
}

/** A feeder-sized container ship, bow pointing +z. */
export const Ship = forwardRef<THREE.Group, ShipProps & ThreeElements["group"]>(function Ship(
  { color, pal, load = 20, ghost = 0, dim = false, seed = 1, ...rest },
  ref,
) {
  const solid = useRef<THREE.InstancedMesh>(null!);
  const ghosts = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    let n = 0;
    let g = 0;
    for (let tier = 0; tier < TIERS; tier++)
      for (let bay = 0; bay < BAYS; bay++)
        for (let row = 0; row < ROWS; row++) {
          const i = tier * BAYS * ROWS + bay * ROWS + row;
          tmp.position.set((row - 1) * 0.82, 1.3 + 0.36 + tier * 0.72, -3.2 + bay * 1.95);
          tmp.scale.set(0.76, 0.68, 1.86);
          tmp.updateMatrix();
          if (i < load) {
            solid.current.setMatrixAt(n, tmp.matrix);
            col.set(dim ? "#9aa7ab" : BOX_COLORS[(i * 7 + seed * 3) % BOX_COLORS.length]);
            solid.current.setColorAt(n, col);
            n++;
          } else if (i < load + ghost) {
            ghosts.current.setMatrixAt(g++, tmp.matrix);
          }
        }
    solid.current.count = n;
    ghosts.current.count = g;
    solid.current.instanceMatrix.needsUpdate = true;
    ghosts.current.instanceMatrix.needsUpdate = true;
    if (solid.current.instanceColor) solid.current.instanceColor.needsUpdate = true;
  }, [load, ghost, dim, seed]);

  const hullColor = dim ? "#9aa7ab" : color;
  return (
    <group ref={ref} {...rest}>
      <mesh geometry={HULL} castShadow receiveShadow>
        <meshStandardMaterial color={hullColor} roughness={0.6} />
      </mesh>
      <B s={[BEAM - 0.2, 0.08, L - 1.6]} p={[0, 1.33, -0.5]} c={pal.deck} shadow={false} />
      {/* bridge and funnel at the stern */}
      <B s={[BEAM - 0.3, 1.9, 1.5]} p={[0, 2.25, -L / 2 + 1.1]} c={dim ? "#c4ccce" : "#f6f8f7"} />
      <B s={[BEAM - 0.25, 0.32, 0.06]} p={[0, 2.85, -L / 2 + 1.87]} c="#1d2e36" shadow={false} />
      <B s={[0.6, 0.9, 0.6]} p={[0, 3.6, -L / 2 + 0.7]} c={hullColor} />
      <instancedMesh ref={solid} args={[box, undefined, SHIP_SLOTS]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={ghosts} args={[box, undefined, SHIP_SLOTS]}>
        <meshStandardMaterial color={pal.signal} transparent opacity={0.28} depthWrite={false} />
      </instancedMesh>
    </group>
  );
});

// ---------------------------------------------------------------- port furniture

export function Crane({ p, r = 0, pal }: { p: V3; r?: number; pal: Palette }) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      {[-1.1, 1.1].map((x) =>
        [-0.9, 0.9].map((z) => <B key={`${x}${z}`} s={[0.22, 5, 0.22]} p={[x, 2.5, z]} c={pal.crane} />),
      )}
      <B s={[2.6, 0.4, 0.4]} p={[0, 5.1, -0.9]} c={pal.crane} />
      <B s={[2.6, 0.4, 0.4]} p={[0, 5.1, 0.9]} c={pal.crane} />
      <B s={[0.5, 0.45, 9]} p={[0, 5.6, 2.5]} c={pal.crane} />
      <B s={[1.2, 0.9, 1.2]} p={[0, 6.1, -0.4]} c={pal.wall} />
    </group>
  );
}

/** A block of container stacks on a yard, as one instanced mesh. */
export function Yard({ p, cols, rows, seed = 0, maxTier = 3 }: { p: V3; cols: number; rows: number; seed?: number; maxTier?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = cols * rows * maxTier;
  useLayoutEffect(() => {
    let n = 0;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const h = 1 + ((c * 13 + r * 7 + seed) % maxTier);
        for (let t = 0; t < h; t++) {
          tmp.position.set(c * 2.1, 0.36 + t * 0.72, r * 0.9);
          tmp.scale.set(1.95, 0.68, 0.78);
          tmp.updateMatrix();
          ref.current.setMatrixAt(n, tmp.matrix);
          col.set(BOX_COLORS[(c * 5 + r * 3 + t + seed) % BOX_COLORS.length]);
          ref.current.setColorAt(n, col);
          n++;
        }
      }
    ref.current.count = n;
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [cols, rows, seed, maxTier]);
  return (
    <instancedMesh ref={ref} args={[box, undefined, count]} position={p} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.7} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------- party buildings

export function Tower({ p, pal, active }: { p: V3; pal: Palette; active?: boolean }) {
  const beacon = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = beacon.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = active ? 1.2 + Math.sin(clock.getElapsedTime() * 4) * 0.8 : 0.4;
  });
  const floors = 7;
  return (
    <group position={p}>
      <B s={[7, 0.6, 7]} p={[0, 0.3, 0]} c={pal.wallShade} />
      <B s={[4.4, 14, 4.4]} p={[0, 7.3, 0]} c={pal.wall} />
      {Array.from({ length: floors }, (_, f) => (
        <group key={f}>
          <B s={[4.46, 0.9, 4.46]} p={[0, 1.6 + f * 1.9, 0]} c={pal.glass} emissive={pal.glass} glow={pal.glassGlow} shadow={false} />
        </group>
      ))}
      <B s={[4.8, 0.5, 4.8]} p={[0, 14.55, 0]} c={pal.ink} />
      <mesh ref={beacon} position={[0, 15.6, 0]}>
        <boxGeometry args={[1.2, 1.4, 1.2]} />
        <meshStandardMaterial color={pal.signal} emissive={pal.signal} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function Warehouse({ p, pal, accent }: { p: V3; pal: Palette; accent: string }) {
  return (
    <group position={p}>
      <B s={[12, 4, 7]} p={[0, 2, 0]} c={pal.wall} />
      <B s={[12.4, 0.4, 7.4]} p={[0, 4.2, 0]} c={pal.roof} />
      <B s={[12.02, 0.7, 0.1]} p={[0, 3.3, 3.52]} c={accent} shadow={false} />
      {[-4, -1.3, 1.4, 4.1].map((x) => (
        <B key={x} s={[1.8, 2.2, 0.12]} p={[x, 1.1, 3.52]} c={pal.wallShade} shadow={false} />
      ))}
      {[-3, 0, 3].map((x) => <B key={x} s={[1.6, 0.5, 1.6]} p={[x, 4.6, -1]} c={pal.wallShade} />)}
    </group>
  );
}

export function CustomsHouse({ p, pal }: { p: V3; pal: Palette }) {
  return (
    <group position={p}>
      <B s={[6, 3.2, 5]} p={[0, 1.6, 0]} c={pal.wall} />
      <B s={[6.4, 0.4, 5.4]} p={[0, 3.4, 0]} c={pal.purple} />
      <B s={[2.6, 2.4, 2.6]} p={[0, 4.8, 0]} c={pal.wall} />
      <B s={[2.9, 0.3, 2.9]} p={[0, 6.1, 0]} c={pal.purple} />
      {[-1.8, 0, 1.8].map((x) => <B key={x} s={[0.9, 1.4, 0.1]} p={[x, 1.6, 2.53]} c={pal.glass} emissive={pal.glass} glow={pal.glassGlow} shadow={false} />)}
    </group>
  );
}

export function Bank({ p, pal }: { p: V3; pal: Palette }) {
  return (
    <group position={p}>
      <B s={[6, 0.6, 4.6]} p={[0, 0.3, 0]} c={pal.wallShade} />
      {[-2.2, -0.75, 0.75, 2.2].map((x) => <B key={x} s={[0.5, 3, 0.5]} p={[x, 2.1, 1.7]} c={pal.wall} />)}
      <B s={[5.6, 3, 3]} p={[0, 2.1, -0.4]} c={pal.wall} />
      <mesh position={[0, 4.2, 0.2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[4.2, 1.6, 4]} />
        <meshStandardMaterial color={pal.roof} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Terminal({ p, pal }: { p: V3; pal: Palette }) {
  return (
    <group position={p}>
      <B s={[9, 3.5, 5]} p={[0, 1.75, 0]} c={pal.wall} />
      <B s={[9.4, 0.4, 5.4]} p={[0, 3.7, 0]} c="#1f5f8b" />
      <B s={[3, 5, 3]} p={[3, 2.5, 0]} c={pal.wall} />
      <B s={[3.2, 1, 3.2]} p={[3, 5.3, 0]} c={pal.glass} emissive={pal.glass} glow={pal.glassGlow} shadow={false} />
    </group>
  );
}

/** Small town blocks so cities read as cities. */
export function Town({ p, n, spread, seed = 1, pal }: { p: V3; n: number; spread: number; seed?: number; pal: Palette }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const items = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: n }, () => ({ x: (rnd() - 0.5) * spread, z: (rnd() - 0.5) * spread * 0.7, h: 1 + rnd() * 4, w: 1.2 + rnd() * 1.6 }));
  }, [n, spread, seed]);
  useLayoutEffect(() => {
    items.forEach((it, i) => {
      tmp.position.set(it.x, it.h / 2, it.z);
      tmp.scale.set(it.w, it.h, it.w);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[box, undefined, n]} position={p} castShadow receiveShadow>
      <meshStandardMaterial color={pal.wall} roughness={0.8} emissive={pal.glass} emissiveIntensity={pal.glassGlow * 0.02} />
    </instancedMesh>
  );
}

/** A tractor with a box trailer, nose pointing +z. */
export const Truck = forwardRef<THREE.Group, { color: string; pal: Palette } & ThreeElements["group"]>(function Truck({ color, pal, ...rest }, ref) {
  return (
    <group ref={ref} {...rest}>
      <B s={[1.1, 1.1, 3.2]} p={[0, 0.85, -0.6]} c={pal.wall} />
      <B s={[1.1, 1.0, 1.0]} p={[0, 0.75, 1.5]} c={color} />
    </group>
  );
});
