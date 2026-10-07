// A tractor and 13.6 m trailer drawn as a cut-away, so the 33 pallet positions read as capacity at a glance.
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { freePallets, liveHolds } from "../sim/engine";
import { smoothNow, useStore } from "../sim/store";
import type { Departure } from "../sim/types";
import { rigGroups } from "./anchors";
import { DOCK_X, DOCK_Z, arriveForward, arriveReverse, departPath } from "./layout";
import type { Palette } from "./palette";

const DECK_Y = 1.38;
const ARRIVE_MIN = 18;
const DEPART_MIN = 10;

const slotPos = (i: number) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return { x: (col - 1) * 0.82, z: 2.9 - row * 1.2 };
};

// stable pseudo-random cargo height per allocation, so loads look like real mixed freight
const heightFor = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 0.85 + (h % 70) / 100;
};

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const easeIn = (u: number) => u * u;

const box = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.42, 18).rotateZ(Math.PI / 2);
const tmp = new THREE.Object3D();

function Part({ s, p, c, ...rest }: { s: [number, number, number]; p: [number, number, number]; c: string } & Record<string, unknown>) {
  return (
    <mesh geometry={box} scale={s} position={p} castShadow receiveShadow {...rest}>
      <meshStandardMaterial color={c} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function Wheels({ z, color }: { z: number[]; color: string }) {
  return (
    <>
      {z.flatMap((zz) =>
        [-1.02, 1.02].map((x) => (
          <mesh key={`${zz}${x}`} geometry={wheelGeo} position={[x, 0.5, zz]} castShadow>
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        )),
      )}
    </>
  );
}

function Body({ d, pal }: { d: Departure; pal: Palette }) {
  const post = d.trailer === "box" ? pal.accentDeep : pal.trailer;
  const top = DECK_Y + 2.7;
  return (
    <group>
      {/* trailer */}
      <Part s={[2.5, 0.26, 13.6]} p={[0, DECK_Y - 0.13, -3]} c={pal.wallShade} />
      <Part s={[1.0, 0.4, 13.2]} p={[0, 0.95, -3.1]} c={pal.chassis} />
      <Part s={[0.18, 0.9, 0.18]} p={[-0.9, 0.55, 0.6]} c={pal.chassis} />
      <Part s={[0.18, 0.9, 0.18]} p={[0.9, 0.55, 0.6]} c={pal.chassis} />
      <Wheels z={[-8.5, -7.3, -6.1]} color={pal.tyre} />
      <Part s={[2.5, 2.7, 0.14]} p={[0, DECK_Y + 1.35, 3.73]} c={pal.trailer} />
      <Part s={[2.5, 0.34, 0.16]} p={[0, DECK_Y + 0.5, 3.82]} c={pal.accent} />
      {[-9.73, -6.4, -3.0, 0.4].map((z) =>
        [-1.19, 1.19].map((x) => <Part key={`${z}${x}`} s={[0.12, 2.7, 0.12]} p={[x, DECK_Y + 1.35, z]} c={post} />),
      )}
      {[-1.19, 1.19].map((x) => <Part key={x} s={[0.12, 0.14, 13.6]} p={[x, top, -3]} c={post} />)}
      <Part s={[2.5, 0.14, 0.14]} p={[0, top, -9.73]} c={post} />
      {[-1.24, 1.24].map((x) => (
        <mesh key={x} position={[x, DECK_Y + 1.35, -3]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[13.6, 2.7]} />
          <meshStandardMaterial color={pal.glass} transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {d.trailer === "reefer" && <Part s={[2.0, 1.5, 0.55]} p={[0, DECK_Y + 1.9, 4.1]} c={pal.reefer} />}
      {/* tractor */}
      <Part s={[1.0, 0.36, 7.0]} p={[0, 0.85, 6.3]} c={pal.chassis} />
      <Part s={[1.4, 0.12, 1.2]} p={[0, 1.08, 3.9]} c={pal.chassis} />
      <Part s={[2.5, 2.5, 2.3]} p={[0, 2.35, 8.55]} c={pal.accent} />
      <Part s={[2.4, 0.75, 1.7]} p={[0, 3.95, 8.3]} c={pal.trailer} />
      <Part s={[2.2, 0.9, 0.06]} p={[0, 2.95, 9.72]} c={pal.chassis} />
      <Part s={[2.5, 0.42, 0.26]} p={[0, 0.92, 9.75]} c={pal.chassis} />
      <Part s={[0.1, 0.45, 2.2]} p={[-1.05, 0.95, 5.6]} c={pal.wallShade} />
      <Part s={[0.1, 0.45, 2.2]} p={[1.05, 0.95, 5.6]} c={pal.wallShade} />
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} geometry={box} scale={[0.4, 0.2, 0.06]} position={[x, 1.35, 9.72]}>
          <meshStandardMaterial color={pal.lamp} emissive={pal.lamp} emissiveIntensity={pal.windowGlow * 2} />
        </mesh>
      ))}
      <Wheels z={[4.5, 5.75, 8.85]} color={pal.tyre} />
    </group>
  );
}

function Load({ d, pal, preview }: { d: Departure; pal: Palette; preview: number }) {
  const wood = useRef<THREE.InstancedMesh>(null!);
  const booked = useRef<THREE.InstancedMesh>(null!);
  const held = useRef<THREE.InstancedMesh>(null!);
  const prev = useRef<THREE.InstancedMesh>(null!);
  const free = useRef<THREE.InstancedMesh>(null!);
  const heldMat = useRef<THREE.MeshStandardMaterial>(null!);
  const prevMat = useRef<THREE.MeshStandardMaterial>(null!);

  const holds = liveHolds(d);
  const key = `${d.bookings.map((b) => b.id + b.pallets).join()}|${holds.map((h) => h.id + h.pallets).join()}|${preview}|${pal.booked}`;

  useLayoutEffect(() => {
    let i = 0;
    let w = 0;
    let nb = 0;
    let nh = 0;
    let np = 0;
    let nf = 0;
    const color = new THREE.Color();
    const place = (mesh: THREE.InstancedMesh, n: number, slot: number, hgt: number) => {
      const s = slotPos(slot);
      tmp.position.set(s.x, DECK_Y + 0.14 + hgt / 2, s.z);
      tmp.scale.set(0.74, hgt, 1.1);
      tmp.updateMatrix();
      mesh.setMatrixAt(n, tmp.matrix);
    };
    const base = (slot: number) => {
      const s = slotPos(slot);
      tmp.position.set(s.x, DECK_Y + 0.07, s.z);
      tmp.scale.set(0.78, 0.14, 1.16);
      tmp.updateMatrix();
      wood.current.setMatrixAt(w++, tmp.matrix);
    };
    for (const b of d.bookings) {
      const hgt = heightFor(b.id);
      for (let k = 0; k < b.pallets && i < d.slots; k++, i++) {
        base(i);
        place(booked.current, nb, i, hgt);
        color.set(b.dgClass ? pal.dg : pal.booked).offsetHSL(0, 0, ((hgt * 10) % 1) * 0.08 - 0.04);
        booked.current.setColorAt(nb, color);
        nb++;
      }
    }
    for (const hl of holds) {
      for (let k = 0; k < hl.pallets && i < d.slots; k++, i++) {
        base(i);
        place(held.current, nh++, i, 1.25);
      }
    }
    for (let k = 0; k < preview && i < d.slots; k++, i++) {
      base(i);
      place(prev.current, np++, i, 1.25);
    }
    for (; i < d.slots; i++) {
      const s = slotPos(i);
      tmp.position.set(s.x, DECK_Y + 0.012, s.z);
      tmp.scale.set(0.76, 0.02, 1.12);
      tmp.updateMatrix();
      free.current.setMatrixAt(nf++, tmp.matrix);
    }
    wood.current.count = w;
    booked.current.count = nb;
    held.current.count = nh;
    prev.current.count = np;
    free.current.count = nf;
    for (const m of [wood, booked, held, prev, free]) m.current.instanceMatrix.needsUpdate = true;
    if (booked.current.instanceColor) booked.current.instanceColor.needsUpdate = true;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock: c }) => {
    const t = c.getElapsedTime();
    if (heldMat.current) heldMat.current.opacity = 0.55 + Math.sin(t * 3.2) * 0.2;
    if (prevMat.current) prevMat.current.opacity = 0.45 + Math.sin(t * 5) * 0.2;
  });

  return (
    <group>
      <instancedMesh ref={wood} args={[box, undefined, 33]} castShadow>
        <meshStandardMaterial color={pal.wood} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={booked} args={[box, undefined, 33]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={held} args={[box, undefined, 33]}>
        <meshStandardMaterial ref={heldMat} color={pal.held} emissive={pal.held} emissiveIntensity={0.25} transparent opacity={0.6} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={prev} args={[box, undefined, 33]}>
        <meshStandardMaterial ref={prevMat} color={pal.preview} emissive={pal.preview} emissiveIntensity={0.35} transparent opacity={0.5} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={free} args={[box, undefined, 33]} receiveShadow>
        <meshStandardMaterial color={pal.freeTile} roughness={1} />
      </instancedMesh>
    </group>
  );
}

export function Rig({ d, pal }: { d: Departure; pal: Palette }) {
  const group = useRef<THREE.Group>(null!);
  const selected = useStore((s) => s.selection?.kind === "departure" && s.selection.id === d.id);
  const hovered = useStore((s) => s.hover === d.id);
  const draft = useStore((s) => s.draft);
  const rfqs = useStore((s) => s.world.rfqs);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const dock = d.dock ?? 1;
  useLayoutEffect(() => {
    rigGroups.set(d.id, group.current);
    return () => {
      rigGroups.delete(d.id);
    };
  }, [d.id]);
  const paths = useMemo(() => ({ dep: departPath(dock), fwd: arriveForward(dock), rev: arriveReverse(dock) }), [dock]);

  const draftRfq = draft && draft.departureId === d.id ? rfqs.find((r) => r.id === draft.rfqId) : undefined;
  const preview = draftRfq ? Math.min(draftRfq.pallets, freePallets(d)) : 0;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = smoothNow();
    let curve: THREE.Curve<THREE.Vector3> | null = null;
    let u = 0;
    let reverse = false;
    if (d.status === "inbound" && d.positionedAt !== undefined) {
      const k = THREE.MathUtils.clamp((t - (d.positionedAt - ARRIVE_MIN)) / ARRIVE_MIN, 0, 1);
      if (k < 0.6) {
        curve = paths.fwd;
        u = ease(k / 0.6);
      } else {
        curve = paths.rev;
        u = ease((k - 0.6) / 0.4);
        reverse = true;
      }
    } else if (d.status === "departed" && d.departedAt !== undefined) {
      const k = THREE.MathUtils.clamp((t - d.departedAt) / DEPART_MIN, 0, 1);
      g.visible = k < 1;
      curve = paths.dep;
      u = easeIn(k);
    }
    if (curve) {
      const pos = curve.getPointAt(u);
      const tan = curve.getTangentAt(Math.min(u, 0.999));
      g.position.set(pos.x, 0, pos.z);
      g.rotation.y = reverse ? Math.atan2(-tan.x, -tan.z) : Math.atan2(tan.x, tan.z);
    } else {
      g.visible = true;
      g.position.set(DOCK_X[dock - 1], 0, DOCK_Z);
      g.rotation.y = 0;
    }
  });


  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: "departure", id: d.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(d.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(null);
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 21]} />
        <meshBasicMaterial color={pal.accent} transparent opacity={selected ? 0.32 : hovered ? 0.16 : 0} depthWrite={false} />
      </mesh>
      <Body d={d} pal={pal} />
      <Load d={d} pal={pal} preview={preview} />
    </group>
  );
}
