// Static depot: ground, roads, cross-dock warehouse, office, gatehouse, trees, drop yard.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { APRON, DOCK_X, GATE_X, HIGHWAY, WAREHOUSE } from "./layout";
import type { Palette } from "./palette";

const box = new THREE.BoxGeometry(1, 1, 1);

function B({ s, p, c, shadow = true, emissive, glow = 0 }: {
  s: [number, number, number]; p: [number, number, number]; c: string; shadow?: boolean; emissive?: string; glow?: number;
}) {
  return (
    <mesh geometry={box} scale={s} position={p} castShadow={shadow} receiveShadow>
      <meshStandardMaterial color={c} roughness={0.8} emissive={emissive ?? "#000000"} emissiveIntensity={glow} />
    </mesh>
  );
}

function Flat({ x0, x1, z0, z1, y = 0.01, c }: { x0: number; x1: number; z0: number; z1: number; y?: number; c: string }) {
  return (
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={c} roughness={1} />
    </mesh>
  );
}

function Tree({ x, z, s = 1, pal }: { x: number; z: number; s?: number; pal: Palette }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 2.2, 6]} />
        <meshStandardMaterial color={pal.trunk} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <sphereGeometry args={[1.35, 14, 10]} />
        <meshStandardMaterial color={pal.tree} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.45, 2.55, 0.35]} castShadow>
        <sphereGeometry args={[0.8, 10, 8]} />
        <meshStandardMaterial color={pal.treeDark} roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

function Lamp({ x, z, pal }: { x: number; z: number; pal: Palette }) {
  return (
    <group position={[x, 0, z]}>
      <B s={[0.16, 6, 0.16]} p={[0, 3, 0]} c={pal.chassis} />
      <B s={[0.9, 0.16, 0.3]} p={[0.35, 6, 0]} c={pal.chassis} />
      <B s={[0.5, 0.1, 0.26]} p={[0.55, 5.9, 0]} c={pal.lamp} emissive={pal.lamp} glow={pal.windowGlow * 2.5} shadow={false} />
    </group>
  );
}

function ParkedTrailer({ x, z, r, pal }: { x: number; z: number; r: number; pal: Palette }) {
  return (
    <group position={[x, 0, z]} rotation={[0, r, 0]}>
      <B s={[2.5, 2.9, 13.6]} p={[0, 2.75, 0]} c={pal.trailer} />
      <B s={[2.52, 0.4, 13.62]} p={[0, 1.6, 0]} c={pal.accent} />
      <B s={[1, 0.5, 13]} p={[0, 0.95, 0]} c={pal.chassis} />
      {[-5.6, -4.4].flatMap((zz) =>
        [-1.02, 1.02].map((xx) => (
          <mesh key={`${zz}${xx}`} position={[xx, 0.5, zz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.4, 14]} />
            <meshStandardMaterial color={pal.tyre} />
          </mesh>
        )),
      )}
      <B s={[0.2, 1.0, 0.2]} p={[0, 0.5, 5]} c={pal.chassis} />
    </group>
  );
}

function Barrier({ pal }: { pal: Palette }) {
  const arm = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    // the arm lifts briefly and often enough to read as a working gate
    const t = clock.getElapsedTime() % 9;
    const lift = t < 1 ? t : t < 3 ? 1 : t < 4 ? 4 - t : 0;
    arm.current.rotation.z = lift * 1.25;
  });
  return (
    <group position={[GATE_X - 3.6, 0, 15.5]}>
      <B s={[0.5, 1.2, 0.5]} p={[0, 0.6, 0]} c={pal.chassis} />
      <group ref={arm} position={[0, 1.1, 0]}>
        <B s={[6.6, 0.18, 0.18]} p={[3.3, 0, 0]} c={pal.held} />
      </group>
    </group>
  );
}

export function Depot({ pal }: { pal: Palette }) {
  const W = WAREHOUSE;
  const trees = useMemo(
    () => [
      [-44, -28, 1.1], [-46, -18, 0.9], [-45, 14, 1], [-38, 15.5, 0.85], [-27, 15, 1.1], [-14, 15.8, 0.8], [-4, 15.5, 1],
      [8, 15.8, 0.85], [18, 15.4, 1.05], [38, 12, 1], [40, 2, 0.9], [39, -10, 1.1], [38, -22, 0.95], [26, -34, 1],
      [12, -35, 0.85], [-2, -35, 1.1], [-16, -35, 0.9], [-30, -36, 1], [-52, 30, 1.2], [-30, 32, 1], [-8, 33, 1.1],
      [16, 32, 0.9], [44, 33, 1.2], [60, 31, 1], [-62, 6, 1], [55, -8, 1.1], [56, -26, 0.9],
    ] as [number, number, number][],
    [],
  );
  return (
    <group>
      {/* ground and planting */}
      <Flat x0={-160} x1={160} z0={-120} z1={120} y={0} c={pal.ground} />
      <Flat x0={-50} x1={-24.5} z0={12} z1={17} c={pal.grass} />
      <Flat x0={-24} x1={GATE_X - 4} z0={14.5} z1={17} c={pal.grass} />
      <Flat x0={GATE_X + 4} x1={46} z0={-38} z1={17} c={pal.grass} />
      <Flat x0={-50} x1={34} z0={-38} z1={-31} c={pal.grass} />
      <Flat x0={-160} x1={160} z0={HIGHWAY.z1 + 1} z1={40} c={pal.grass} />

      {/* apron, drop yard, gate road and highway */}
      <Flat x0={APRON.x0} x1={APRON.x1} z0={APRON.z0} z1={APRON.z1} y={0.015} c={pal.apron} />
      <Flat x0={-49} x1={-24} z0={-14} z1={11} y={0.015} c={pal.apron} />
      <Flat x0={GATE_X - 4} x1={GATE_X + 4} z0={APRON.z1} z1={HIGHWAY.z0} y={0.016} c={pal.asphalt} />
      <Flat x0={-160} x1={160} z0={HIGHWAY.z0} z1={HIGHWAY.z1} y={0.016} c={pal.asphalt} />
      {Array.from({ length: 40 }, (_, i) => (
        <Flat key={i} x0={-158 + i * 8} x1={-154 + i * 8} z0={23.1} z1={23.4} y={0.03} c={pal.line} />
      ))}
      {/* dock bay markings */}
      {DOCK_X.map((x) =>
        [-1.6, 1.6].map((dx) => <Flat key={`${x}${dx}`} x0={x + dx - 0.08} x1={x + dx + 0.08} z0={-16} z1={4.5} y={0.03} c={pal.line} />),
      )}
      <Flat x0={APRON.x0 + 1} x1={APRON.x1 - 1} z0={6.9} z1={7.05} y={0.03} c={pal.line} />

      {/* cross-dock warehouse */}
      <B s={[W.x1 - W.x0, W.h, W.z1 - W.z0]} p={[0, W.h / 2, (W.z0 + W.z1) / 2]} c={pal.wall} />
      <B s={[W.x1 - W.x0 + 0.6, 0.5, W.z1 - W.z0 + 0.6]} p={[0, W.h + 0.25, (W.z0 + W.z1) / 2]} c={pal.roof} />
      <B s={[W.x1 - W.x0 + 0.02, 1.0, 0.3]} p={[0, W.h - 1.0, W.z1 + 0.05]} c={pal.accent} />
      {[-12, -4, 4, 12].map((x) => (
        <B key={x} s={[3.2, 1.0, 3.2]} p={[x, W.h + 0.9, -23]} c={pal.wallShade} />
      ))}
      {DOCK_X.map((x) => (
        <group key={x}>
          <B s={[3.2, 3.6, 0.2]} p={[x, 2.95, W.z1 + 0.05]} c={pal.accent} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <B key={k} s={[3.2, 0.05, 0.22]} p={[x, 1.4 + k * 0.6, W.z1 + 0.06]} c={pal.accentDeep} shadow={false} />
          ))}
          <B s={[3.6, 1.15, 1.2]} p={[x, 0.575, W.z1 + 0.6]} c={pal.wallShade} />
          <B s={[0.35, 0.6, 0.3]} p={[x - 1.5, 1.0, W.z1 + 1.3]} c={pal.chassis} />
          <B s={[0.35, 0.6, 0.3]} p={[x + 1.5, 1.0, W.z1 + 1.3]} c={pal.chassis} />
          <B s={[4.2, 0.2, 1.6]} p={[x, 5.1, W.z1 + 0.8]} c={pal.wallShade} />
        </group>
      ))}

      {/* office */}
      <group position={[-31, 0, -24]}>
        <B s={[12, 11, 9]} p={[0, 5.5, 0]} c={pal.wall} />
        <B s={[12.4, 0.4, 9.4]} p={[0, 11.2, 0]} c={pal.roof} />
        <B s={[3, 1.6, 3]} p={[-2.5, 12.2, 0]} c={pal.wallShade} />
        {[0, 1, 2].map((f) =>
          [-4, -2, 0, 2, 4].map((x) => (
            <group key={`${f}${x}`}>
              <B s={[1.2, 1.7, 0.1]} p={[x, 2.4 + f * 3.3, 4.53]} c={pal.window} emissive={pal.window} glow={pal.windowGlow} shadow={false} />
              <B s={[0.1, 1.7, 1.1]} p={[6.03, 2.4 + f * 3.3, x * 0.8]} c={pal.window} emissive={pal.window} glow={pal.windowGlow} shadow={false} />
            </group>
          )),
        )}
        <B s={[2.6, 2.6, 0.2]} p={[0, 1.3, 4.6]} c={pal.accent} />
      </group>

      {/* gatehouse and barrier */}
      <group position={[GATE_X + 5.5, 0, 13]}>
        <B s={[3.2, 3, 3.2]} p={[0, 1.5, 0]} c={pal.wall} />
        <B s={[3.6, 0.3, 3.6]} p={[0, 3.15, 0]} c={pal.accent} />
        <B s={[0.1, 1.1, 2.2]} p={[-1.62, 1.9, 0]} c={pal.window} emissive={pal.window} glow={pal.windowGlow} shadow={false} />
      </group>
      <Barrier pal={pal} />

      {/* fence */}
      {Array.from({ length: 30 }, (_, i) => -49 + i * 2.9).map((x) => (
        <B key={x} s={[0.12, 1.6, 0.12]} p={[x, 0.8, -32]} c={pal.chassis} />
      ))}
      <B s={[86, 0.08, 0.08]} p={[-6, 1.5, -32]} c={pal.chassis} shadow={false} />
      <B s={[0.08, 0.08, 45]} p={[-49.5, 1.5, -9.5]} c={pal.chassis} shadow={false} />
      <B s={[0.08, 0.08, 45]} p={[37.5, 1.5, -9.5]} c={pal.chassis} shadow={false} />

      {/* drop yard */}
      <ParkedTrailer x={-43} z={-2} r={0} pal={pal} />
      <ParkedTrailer x={-38.5} z={-2} r={0} pal={pal} />
      <ParkedTrailer x={-34} z={-1} r={0.04} pal={pal} />

      {/* staged pallets beside the warehouse */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[21 + (i % 2) * 2, 0, -14 + Math.floor(i / 2) * 2]}>
          <B s={[1.2, 0.15, 0.8]} p={[0, 0.08, 0]} c={pal.wood} />
          <B s={[1.1, 1.1, 0.75]} p={[0, 0.7, 0]} c={i % 2 ? pal.booked : pal.wood} />
        </group>
      ))}

      {[-20, -6, 8, 22].map((x) => <Lamp key={x} x={x} z={13.6} pal={pal} />)}
      {trees.map(([x, z, s]) => <Tree key={`${x}${z}`} x={x} z={z} s={s} pal={pal} />)}
    </group>
  );
}
