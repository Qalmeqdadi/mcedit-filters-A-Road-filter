// Story effects: envelopes and RFQ arcs, berth beacons, the trust ledger, network lanes and risk markers.
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CARRIERS, ESC_EVENTS, type Party } from "../data";
import { selectedCarrier, useStore } from "../store";
import { targets } from "./anchors";
import { BERTHS, JEA_BERTH, PLACES, SITES } from "./geo";
import type { Palette } from "./palette";

const v3 = (p: [number, number], y: number) => new THREE.Vector3(p[0], y, p[1]);

function arc(a: THREE.Vector3, b: THREE.Vector3, lift: number) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += lift;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

/** A small envelope that travels along a curve on a loop. */
function Envelope({ c, period, offset = 0, color = "#ffffff", back = false }: { c: THREE.Curve<THREE.Vector3>; period: number; offset?: number; color?: string; back?: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    let t = ((clock.getElapsedTime() / period + offset) % 1 + 1) % 1;
    if (back) t = 1 - t;
    ref.current.position.copy(c.getPointAt(t));
    ref.current.rotation.y = clock.getElapsedTime() * 2;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.6, 0.25, 1.1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  );
}

function Beacon({ p, color, pulse = false, h = 9 }: { p: [number, number]; color: string; pulse?: boolean; h?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = pulse ? 0.18 + (Math.sin(clock.getElapsedTime() * 4) + 1) * 0.12 : 0.32;
  });
  return (
    <mesh ref={ref} position={[p[0], h / 2 + 1, p[1]]}>
      <cylinderGeometry args={[0.9, 1.5, h, 16, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Ring({ p, color, r = 4, y = 0.2 }: { p: [number, number] | string; color: string; r?: number; y?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const wp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const k = (clock.getElapsedTime() * 0.7) % 1;
    ref.current.scale.setScalar(0.6 + k * 0.9);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
    if (typeof p === "string") {
      // follow a moving label target, such as a ship
      const t = targets.get(p);
      if (!t) return;
      if (t instanceof THREE.Vector3) wp.copy(t);
      else t.getWorldPosition(wp);
      ref.current.position.set(wp.x, y, wp.z);
    }
  });
  const pos: [number, number, number] = typeof p === "string" ? [0, -50, 0] : [p[0], y, p[1]];
  return (
    <mesh ref={ref} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.82, r, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------- quote walkthrough

const DESK_TOP = v3(SITES.desk.p, 17);

function QuoteFx({ pal }: { pal: Palette }) {
  const st = useStore();
  const { view, step } = st;
  const emailArc = useMemo(() => arc(v3(SITES.noor.p, 5), DESK_TOP, 14), []);
  const rfqArcs = useMemo(() => Object.fromEntries(CARRIERS.map((c) => [c.id, arc(DESK_TOP, v3(BERTHS[c.id], 4.5), 55)])), []);
  if (view !== "flow") return null;
  const sel = selectedCarrier(st);
  return (
    <group>
      {step === 1 && !st.filled && (
        <>
          <Line points={emailArc.getPoints(40)} color={pal.teal} lineWidth={2} dashed dashSize={1} gapSize={0.8} />
          <Envelope c={emailArc} period={st.filling ? 1.2 : 2.6} />
        </>
      )}
      {step === 2 &&
        CARRIERS.map((c, i) => {
          const got = st.rfqGot.includes(c.id);
          return (
            <group key={c.id}>
              <Line points={rfqArcs[c.id].getPoints(60)} color={got ? pal.teal : pal.ink} lineWidth={got ? 2.2 : 1.2} dashed={!got} dashSize={2} gapSize={1.6} transparent opacity={got ? 0.9 : 0.35} />
              {!got && <Envelope c={rfqArcs[c.id]} period={3} offset={i / 6} />}
              <Beacon p={BERTHS[c.id]} color={got ? pal.teal : "#9aa7ab"} pulse={!got} />
            </group>
          );
        })}
      {(step === 3 || step === 4) &&
        CARRIERS.map((c) => {
          const color = step === 4 ? (!c.fit ? pal.red : c.id === sel.id ? pal.signal : pal.teal) : ["OL", "MC", "BH"].includes(c.id) ? pal.signal : pal.teal;
          const h = step === 4 && c.fit ? 6 + (c.id === sel.id ? 6 : 0) : 6;
          return <Beacon key={c.id} p={BERTHS[c.id]} color={color} pulse={step === 4 && c.id === sel.id} h={h} />;
        })}
      {step === 4 && <Ring p={BERTHS[sel.id]} color={pal.signal} r={5} />}
      {step === 5 && st.sent && !st.approved && (
        <>
          <Line points={emailArc.getPoints(40)} color={pal.signal} lineWidth={2} dashed dashSize={1} gapSize={0.8} />
          <Envelope c={emailArc} period={1.8} color={pal.signal} back />
        </>
      )}
      {step === 5 && st.approved && <Ring p={SITES.noor.p} color={pal.teal} r={8} y={1.4} />}
    </group>
  );
}

// ---------------------------------------------------------------- trust layer

const PARTY_SITE: Record<Party, () => THREE.Vector3> = {
  shipper: () => v3(SITES.noor.p, 5),
  forwarder: () => v3(SITES.desk.p, 15),
  carrier: () => v3(JEA_BERTH, 3.5),
  customs: () => v3(SITES.customs.p, 7),
  bank: () => v3(SITES.bank.p, 5),
};
const LEDGER = new THREE.Vector3(-66, 26, -12);

function TrustFx({ pal }: { pal: Palette }) {
  const esc = useStore((s) => s.esc);
  const crystal = useRef<THREE.Mesh>(null!);
  const cur = esc > 0 ? ESC_EVENTS[esc - 1][2] : null;
  useFrame(({ clock }) => {
    crystal.current.rotation.y = clock.getElapsedTime() * 0.6;
    crystal.current.position.y = LEDGER.y + Math.sin(clock.getElapsedTime() * 1.5) * 0.6;
  });
  return (
    <group>
      <mesh ref={crystal} position={LEDGER}>
        <octahedronGeometry args={[3.2, 0]} />
        <meshStandardMaterial color={pal.signal} emissive={pal.signal} emissiveIntensity={0.5} flatShading />
      </mesh>
      {(Object.keys(PARTY_SITE) as Party[]).map((k) => (
        <Line key={k} points={[LEDGER, PARTY_SITE[k]()]} color={k === cur ? pal.signal : pal.ink} lineWidth={k === cur ? 3 : 1.2} dashed={k !== cur} dashSize={1} gapSize={0.8} transparent opacity={k === cur ? 1 : 0.45} />
      ))}
      {cur && <Ring p={[PARTY_SITE[cur]().x, PARTY_SITE[cur]().z]} color={pal.signal} r={6} y={1.5} />}
    </group>
  );
}

// ---------------------------------------------------------------- network scale

const NET_LANES: [number, number][][] = [
  [[-52, -17], [-46, 6], [-60, 34], [-120, 60], [-220, 70]],
  [[-52, -17], [-40, 10], [-20, 40], [-10, 80], [-30, 140]],
  [[-27, -14], [-40, 20], [-90, 60], [-200, 90]],
  [[116, -26], [140, 0], [180, 20], [260, 30]],
  [[116, -26], [124, 10], [110, 60], [90, 120]],
  [[64, 41], [90, 50], [140, 70], [220, 100]],
  [[-112, -6], [-150, -30], [-240, -60]],
];

function NetFx({ pal }: { pal: Palette }) {
  const curves = useMemo(() => NET_LANES.map((pts) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.4, z)))), []);
  return (
    <group>
      {curves.map((c, i) => (
        <group key={i}>
          <Line points={c.getPoints(50)} color={pal.signal} lineWidth={2.4} transparent opacity={0.8} />
          <Envelope c={c} period={7 + i} offset={i / 7} color={pal.signal} />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- risk markers

function Typhoon({ pal }: { pal: Palette }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    ref.current.rotation.y += dt * 1.4;
  });
  return (
    <group ref={ref} position={[110, 3, -6]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (i * Math.PI * 2) / 3]} position={[0, i * 0.4, 0]}>
          <torusGeometry args={[4 + i * 1.6, 0.35, 6, 32, Math.PI * 1.2]} />
          <meshStandardMaterial color={pal.wall} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}

export function Fx({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  const alerts = useStore((s) => s.alerts);
  return (
    <group>
      <QuoteFx pal={pal} />
      {view === "trust" && <TrustFx pal={pal} />}
      {view === "net" && <NetFx pal={pal} />}
      {view === "opt" && (
        <>
          <Typhoon pal={pal} />
          <Ring p={PLACES.PKG.p} color={pal.signal} r={7} />
        </>
      )}
      {view === "ship" && (
        <>
          {!alerts.a1 && <Ring p="ship:SHP-2291" color={pal.signal} r={6} />}
          {!alerts.a2 && <Ring p="ship:SHP-2284" color={pal.red} r={6} />}
        </>
      )}
      {view === "p_jobs" && <Ring p={SITES.customs.p} color={pal.purple} r={7} y={1.4} />}
      {(view === "sh_home" || view === "sh_docs") && <Ring p={SITES.noor.p} color={pal.teal} r={9} y={1.4} />}
      {(view === "c_home" || view === "c_cap" || view === "c_perf") && <Ring p={SITES.olTerm.p} color="#1F5F8B" r={8} y={1.4} />}
    </group>
  );
}
