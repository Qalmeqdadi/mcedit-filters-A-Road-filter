// Sea, land masses, coasts, roads, rail and planting.
import { Line } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { LAND, PLACES, RAIL, ROADS, ROUTES, curve } from "./geo";
import type { Palette } from "./palette";
import { B, Bank, Crane, CustomsHouse, Terminal, Tower, Town, Warehouse, Yard } from "./Props";
import { SITES } from "./geo";

const LAND_H = 1.2;

function landGeometry(pts: [number, number][], grow = 0) {
  // shape lives in x / -z so that after rotating onto the ground it lines up with world x / z
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const shape = new THREE.Shape(
    pts.map(([x, z]) => {
      const dx = x - cx, dz = z - cz;
      const d = Math.hypot(dx, dz) || 1;
      return new THREE.Vector2(x + (dx / d) * grow, -(z + (dz / d) * grow));
    }),
  );
  const g = new THREE.ExtrudeGeometry(shape, { depth: LAND_H, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.4, bevelSegments: 1, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function Lands({ pal }: { pal: Palette }) {
  const geos = useMemo(() => LAND.map((l) => ({ ...l, g: landGeometry(l.pts), shelf: landGeometry(l.pts, 2.4) })), []);
  return (
    <group>
      {geos.map((l) => (
        <group key={l.id}>
          <mesh geometry={l.shelf} position={[0, -0.9, 0]} receiveShadow>
            <meshStandardMaterial color={pal.coast} roughness={1} />
          </mesh>
          <mesh geometry={l.g} receiveShadow castShadow>
            <meshStandardMaterial color={l.tone === "sand" ? pal.sand : pal.green} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const ribbon = (pts: [number, number][], y: number) => curve(pts, y).getPoints(60);

/** Shipping lanes drawn on the water: solid for China, dashed for West India, dotted for East India. */
function Lanes({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  const show = view === "dash" || view === "ship" || view === "net" || view === "analytics" || view === "sh_home";
  const op = show ? 0.75 : 0.22;
  return (
    <group>
      <Line points={ribbon(ROUTES.direct, 0.15)} color={pal.lane} lineWidth={2} transparent opacity={op} />
      <Line points={ribbon(ROUTES.nsa, 0.15)} color={pal.lane} lineWidth={2} dashed dashSize={1.6} gapSize={1.2} transparent opacity={op} />
      <Line points={ribbon(ROUTES.maa, 0.15)} color={pal.lane} lineWidth={2} dashed dashSize={0.5} gapSize={1.1} transparent opacity={op} />
    </group>
  );
}

const TREE_SPOTS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const zones: [number, number, number, number, number][] = [
    [-30, -60, 20, 40, 26], [52, -60, 20, 34, 18], [100, -80, 60, 30, 18], [-140, -100, 50, 30, 12], [40, 46, 26, 10, 8], [0, 22, 6, 8, 4],
  ];
  for (const [x, z, w, d, n] of zones) for (let i = 0; i < n; i++) out.push([x + rnd() * w, z + rnd() * d, 0.7 + rnd() * 0.6]);
  return out;
})();

function Trees({ pal }: { pal: Palette }) {
  const crowns = useRef<THREE.InstancedMesh>(null!);
  const trunks = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    TREE_SPOTS.forEach(([x, z, s], i) => {
      o.position.set(x, LAND_H + 1.0 * s, z);
      o.scale.setScalar(s);
      o.updateMatrix();
      trunks.current.setMatrixAt(i, o.matrix);
      o.position.set(x, LAND_H + 2.4 * s, z);
      o.updateMatrix();
      crowns.current.setMatrixAt(i, o.matrix);
    });
    crowns.current.instanceMatrix.needsUpdate = true;
    trunks.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_SPOTS.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.24, 2, 5]} />
        <meshStandardMaterial color={pal.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, TREE_SPOTS.length]} castShadow>
        <icosahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color={pal.tree} flatShading roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const at = (p: [number, number], y = LAND_H): [number, number, number] => [p[0], y, p[1]];

export function Terrain({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  const desk = useStore((s) => s.view === "flow" || s.view === "dash" || s.view === "setup");
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
        <planeGeometry args={[700, 500]} />
        <meshStandardMaterial color={pal.sea} roughness={0.9} />
      </mesh>
      <Lands pal={pal} />
      <Lanes pal={pal} />

      {/* roads and rail */}
      {Object.entries(ROADS).map(([k, pts]) => (
        <Line key={k} points={ribbon(pts, LAND_H + 0.05)} color={pal.road} lineWidth={5} />
      ))}
      <Line points={ribbon(RAIL, LAND_H + 0.08)} color={pal.rail} lineWidth={view === "multi" ? 4 : 2} dashed dashSize={0.8} gapSize={0.5} transparent opacity={view === "multi" ? 1 : 0.5} />

      {/* Jebel Ali port */}
      <B s={[3, 0.6, 14]} p={[-52.5, LAND_H - 0.1, -17]} c={pal.wallShade} r={[0, -0.32, 0]} />
      <Crane p={[-52.2, LAND_H, -21]} r={Math.PI / 2 - 0.32} pal={pal} />
      <Crane p={[-51, LAND_H, -14.5]} r={Math.PI / 2 - 0.32} pal={pal} />
      <Yard p={[-64, LAND_H, -21]} cols={4} rows={7} seed={2} />
      <Town p={at([-74, -12])} n={16} spread={12} seed={3} pal={pal} />
      <Town p={at([-62, 6])} n={10} spread={10} seed={5} pal={pal} />
      <Tower p={at(SITES.desk.p)} pal={pal} active={desk} />
      <Warehouse p={at(SITES.noor.p)} pal={pal} accent={pal.teal} />
      <CustomsHouse p={at(SITES.customs.p)} pal={pal} />
      <Bank p={at(SITES.bank.p)} pal={pal} />

      {/* Shanghai: multi-carrier quay and the Oceanlink terminal */}
      <B s={[80, 0.6, 3]} p={[132, LAND_H - 0.1, -34.5]} c={pal.wallShade} />
      {[101.8, 116.8, 131.8, 146, 153.8, 161.2].map((x) => <Crane key={x} p={[x, LAND_H, -35.5]} pal={pal} />)}
      <Yard p={[100, LAND_H, -44]} cols={10} rows={4} seed={6} />
      <Yard p={[124, LAND_H, -44]} cols={6} rows={4} seed={9} />
      <Terminal p={at(SITES.olTerm.p)} pal={pal} />
      <Town p={at([118, -58])} n={30} spread={30} seed={8} pal={pal} />

      {/* other ports and cities */}
      <Town p={at(PLACES.NSA.p)} n={8} spread={7} seed={11} pal={pal} />
      <Town p={at(PLACES.MAA.p)} n={7} spread={6} seed={12} pal={pal} />
      <Town p={at([60, 30])} n={8} spread={5} seed={13} pal={pal} />
      <Town p={at(PLACES.PKG.p)} n={5} spread={5} seed={14} pal={pal} />
      <Town p={at(PLACES.DMM.p)} n={8} spread={7} seed={15} pal={pal} />
      <Town p={at(PLACES.RUH.p)} n={22} spread={14} seed={16} pal={pal} />
      <Crane p={[-64.5, LAND_H, -47]} r={Math.PI / 2} pal={pal} />

      <Trees pal={pal} />
    </group>
  );
}
