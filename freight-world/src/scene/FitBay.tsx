// The load-planning yard: real container floor plans at 1 unit = 1 m.
// Step 1 lays Al Noor's 18 pallets into a 20', 40' and 40' HC. Phase 4 packs 32 pallets, standard vs AI.
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BOXES, LCL, S } from "../data";
import { useStore } from "../store";
import { SITES } from "./geo";
import type { Palette } from "./palette";
import { B, box } from "./Props";

const Y = 1.25;
const tmp = new THREE.Object3D();
const col = new THREE.Color();

interface Pal3 { x: number; y: number; z: number; l: number; w: number; h: number; c: string; over?: boolean }

/** Open-top container shell, floor at y=0, door at +x end. */
function Shell({ len, high, pal, ok }: { len: number; high: boolean; pal: Palette; ok?: boolean }) {
  const H = high ? 2.69 : 2.39;
  const W = 2.35;
  const edge = ok === undefined ? pal.ink : ok ? pal.teal : pal.red;
  return (
    <group>
      <B s={[len, 0.12, W]} p={[len / 2, 0.06, 0]} c={pal.wallShade} />
      <B s={[len, H, 0.06]} p={[len / 2, H / 2, -W / 2]} c={pal.wall} opacity={0.35} />
      <B s={[0.06, H, W]} p={[0, H / 2, 0]} c={pal.wall} opacity={0.5} />
      {[0, len].map((x) =>
        [-W / 2, W / 2].map((z) => <B key={`${x}${z}`} s={[0.12, H, 0.12]} p={[x, H / 2, z]} c={edge} />),
      )}
      {[-W / 2, W / 2].map((z) => <B key={z} s={[len, 0.1, 0.1]} p={[len / 2, H, z]} c={edge} />)}
    </group>
  );
}

function Pallets({ items, grow }: { items: Pal3[]; grow: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const wood = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    items.forEach((it, i) => {
      tmp.position.set(it.x + it.l / 2, it.y + 0.14 + (it.h - 0.14) / 2, it.z + it.w / 2);
      tmp.scale.set(it.l - 0.06, it.h - 0.14, it.w - 0.06);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
      ref.current.setColorAt(i, col.set(it.c));
      tmp.position.set(it.x + it.l / 2, it.y + 0.07, it.z + it.w / 2);
      tmp.scale.set(it.l - 0.04, 0.14, it.w - 0.04);
      tmp.updateMatrix();
      wood.current.setMatrixAt(i, tmp.matrix);
    });
    ref.current.count = items.length;
    wood.current.count = items.length;
    ref.current.instanceMatrix.needsUpdate = true;
    wood.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [items]);
  const g = useRef<THREE.Group>(null!);
  useFrame(() => {
    const s = g.current.scale.y;
    g.current.scale.y = s + (grow - s) * 0.12;
  });
  return (
    <group ref={g} scale={[1, 0.001, 1]}>
      <instancedMesh ref={wood} args={[box, undefined, 64]} castShadow>
        <meshStandardMaterial color="#c9a578" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={ref} args={[box, undefined, 64]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

/** 18 pallets on a container floor: two across, as many columns as fit, the rest beside it. */
function fitLayout(len: number, cols: number, pal: Palette): Pal3[] {
  const out: Pal3[] = [];
  for (let i = 0; i < S.pallets; i++) {
    const c = Math.floor(i / 2), r = i % 2;
    if (c < cols) out.push({ x: 0.1 + c * 1.2, y: 0, z: -1.1 + r * 1.07, l: 1.2, w: 1.0, h: 1.6, c: pal.teal });
    else {
      const k = i - cols * 2;
      out.push({ x: len + 1.2 + (k % 5) * 1.3, y: 0, z: -1.1 + Math.floor(k / 5) * 1.15, l: 1.2, w: 1.0, h: 1.6, c: pal.red, over: true });
    }
  }
  return out;
}

/** Port of the MVP's load planner: floor-only in order of arrival, or stacked where cargo allows. */
function packLayout(ai: boolean): { items: Pal3[]; left: number } {
  const items: Pal3[] = [];
  let row = 0;
  let left = 0;
  for (const c of LCL) {
    const per = 2 * (ai && c.stack ? 2 : 1);
    let placed = 0;
    while (placed < c.u) {
      if (row >= 10) {
        for (let k = placed; k < c.u; k++) {
          items.push({ x: 13.4 + (left % 4) * 1.3, y: 0, z: -1.1 + Math.floor(left / 4) * 1.15, l: 1.12, w: 1.0, h: c.h - 0.04, c: c.c, over: true });
          left++;
        }
        break;
      }
      for (let k = 0; k < per && placed < c.u; k++) {
        const j = k % 2, t = Math.floor(k / 2);
        items.push({ x: row * 1.2 + 0.04, y: t * c.h, z: -1.1 + j * 1.07, l: 1.12, w: 1.0, h: c.h - 0.04, c: c.c });
        placed++;
      }
      row++;
    }
  }
  return { items, left };
}

export function FitBay({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  const step = useStore((s) => s.step);
  const filled = useStore((s) => s.filled);
  const aiPlan = useStore((s) => s.aiPlan);
  const layouts = useMemo(() => BOXES.map((b) => fitLayout(b.lenM, b.cols, pal)), [pal]);
  const pack = useMemo(() => packLayout(aiPlan), [aiPlan]);
  const [x, z] = SITES.fitBay.p;
  const showFit = view === "flow" && step === 1;
  const showPack = view === "opt";

  return (
    <group position={[x - 10, Y, z]}>
      <B s={[30, 0.3, 18]} p={[10, 0.15, 0]} c={pal.wallShade} />
      {[-6, 0, 6].map((zz) => <B key={zz} s={[28, 0.02, 0.12]} p={[10, 0.31, zz + 3]} c={pal.signal} shadow={false} />)}
      <group position={[0, 0.3, 0]}>
        {showFit &&
          BOXES.map((b, i) => (
            <group key={b.key} position={[0, 0, -6 + i * 6]}>
              <Shell len={b.lenM} high={b.key === "40hc"} pal={pal} ok={filled ? b.ok : undefined} />
              <Pallets items={layouts[i]} grow={filled ? 1 : 0.001} />
            </group>
          ))}
        {showPack && (
          <group position={[0, 0, 0]}>
            <Shell len={12.03} high pal={pal} ok={pack.left === 0} />
            <Pallets items={pack.items} grow={1} />
          </group>
        )}
      </group>
    </group>
  );
}
