// Everything that floats or drives: lane traffic, carrier ships at the Shanghai berths,
// Oceanlink's vessels, the booked voyage, the feeder, trucks, train and plane.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARRIERS, SAILINGS } from "../data";
import { selectedCarrier, useStore } from "../store";
import { targets } from "./anchors";
import { BERTHS, JEA_BERTH, OL_BERTHS, RAIL, ROADS, ROUTES, curve, routeCurve, routeFor } from "./geo";
import type { Palette } from "./palette";
import { SHIP_SLOTS, Ship, Truck } from "./Props";

/** Registers an object as a label target for as long as it is mounted. */
export function useTarget(id: string, ref: React.RefObject<THREE.Object3D | null>) {
  useEffect(() => {
    if (ref.current) targets.set(id, ref.current);
    return () => {
      targets.delete(id);
    };
  }, [id, ref]);
}

function place(g: THREE.Object3D, c: THREE.Curve<THREE.Vector3>, t: number, y = 0) {
  const u = THREE.MathUtils.clamp(t, 0, 1);
  const p = c.getPointAt(u);
  const tan = c.getTangentAt(Math.min(u, 0.999));
  g.position.set(p.x, y, p.z);
  g.rotation.y = Math.atan2(tan.x, tan.z);
}

// ---------------------------------------------------------------- lane traffic

export const TRAFFIC = [
  { id: "SHP-2301", route: "direct", t: 0.22, color: "#1F5F8B", seed: 1 },
  { id: "SHP-2291", route: "klang", t: 0.4, color: "#2D6FB0", seed: 2 },
  { id: "SHP-2264", route: "direct", t: 0.66, color: "#0F7C6E", seed: 3 },
  { id: "T-PC", route: "direct", t: 0.86, color: "#0F7C6E", seed: 4 },
  { id: "SHP-2298", route: "nsa", t: 0.45, color: "#2D6FB0", seed: 5 },
  { id: "SHP-2284", route: "maa", t: 0.58, color: "#7A4E9A", seed: 6 },
];

function Traffic({ pal }: { pal: Palette }) {
  return (
    <>
      {TRAFFIC.map((s) => (
        <TrafficShip key={s.id} s={s} pal={pal} />
      ))}
    </>
  );
}

function TrafficShip({ s, pal }: { s: (typeof TRAFFIC)[number]; pal: Palette }) {
  const ref = useRef<THREE.Group>(null);
  useTarget(`ship:${s.id}`, ref);
  const c = routeCurve(s.route);
  useFrame(({ clock }) => {
    // a slow drift keeps the water alive without moving labels away from what they describe
    if (ref.current) place(ref.current, c, s.t + Math.sin(clock.getElapsedTime() * 0.05 + s.seed) * 0.012);
  });
  return <Ship ref={ref} color={s.color} pal={pal} load={20 + s.seed * 2} seed={s.seed} />;
}

// ---------------------------------------------------------------- Shanghai berths

function Berthed({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  const step = useStore((s) => s.step);
  const approved = useStore((s) => s.approved);
  const st = useStore();
  const sel = selectedCarrier(st);
  return (
    <>
      {CARRIERS.map((c, i) => {
        const sailing = approved && c.id === sel.id && ((view === "flow" && step === 6) || view === "sh_home");
        const dim = view === "flow" && step >= 4 && !c.fit;
        return <BerthShip key={c.id} id={c.id} color={c.color} dim={dim} hidden={sailing} pal={pal} seed={i + 2} />;
      })}
    </>
  );
}

function BerthShip({ id, color, dim, hidden, pal, seed }: { id: string; color: string; dim: boolean; hidden: boolean; pal: Palette; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useTarget(`berth:${id}`, ref);
  const [x, z] = BERTHS[id];
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.getElapsedTime() * 0.8 + seed) * 0.06;
  });
  return <Ship ref={ref} position={[x, 0, z]} color={color} dim={dim} visible={!hidden} pal={pal} load={14 + (seed % 3) * 4} seed={seed} />;
}

function OLVessels({ pal }: { pal: Palette }) {
  const cap = useStore((s) => s.cap);
  return (
    <>
      {SAILINGS.map((s, i) => {
        const sold = Math.max(0, Math.min(1, 1 - cap[s.k] / s.total));
        const load = Math.round(SHIP_SLOTS * sold);
        return <OLShip key={s.k} k={s.k} load={load} ghost={SHIP_SLOTS - load} pal={pal} seed={i + 7} />;
      })}
    </>
  );
}

function OLShip({ k, load, ghost, pal, seed }: { k: string; load: number; ghost: number; pal: Palette; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useTarget(`ol:${k}`, ref);
  const [x, z] = OL_BERTHS[k];
  return <Ship ref={ref} position={[x, 0, z]} color="#1F5F8B" load={load} ghost={ghost} pal={pal} seed={seed} />;
}

// ---------------------------------------------------------------- the booked voyage

export const VOYAGE_SECONDS = 30;

function Voyage({ pal }: { pal: Palette }) {
  const st = useStore();
  const show = st.approved && ((st.view === "flow" && st.step === 6) || st.view === "sh_home");
  const c = selectedCarrier(st);
  const ref = useRef<THREE.Group>(null);
  const truck = useRef<THREE.Group>(null);
  useTarget("voyage", ref);
  const curveR = routeCurve(routeFor(c.via));
  const road = useMemo(() => curve(ROADS.noor, 1.25), []);
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now();
  }, [show, c.id]);
  useFrame(() => {
    if (!ref.current || !truck.current) return;
    const k = ((performance.now() - start.current) / 1000 / (VOYAGE_SECONDS + 6)) % 1;
    const sea = Math.min(1, k * ((VOYAGE_SECONDS + 6) / VOYAGE_SECONDS));
    place(ref.current, curveR, sea);
    const land = Math.max(0, (k - VOYAGE_SECONDS / (VOYAGE_SECONDS + 6)) / (6 / (VOYAGE_SECONDS + 6)));
    truck.current.visible = land > 0;
    if (land > 0) place(truck.current, road, land, 1.25);
  });
  return (
    <group visible={show}>
      <Ship ref={ref} color={c.color} pal={pal} load={26} seed={3} />
      <Truck ref={truck} color={pal.teal} pal={pal} />
    </group>
  );
}

// ---------------------------------------------------------------- ground and air

function Shuttle({ pts, color, pal, period, offset = 0, y = 1.25, id }: { pts: [number, number][]; color: string; pal: Palette; period: number; offset?: number; y?: number; id?: string }) {
  const ref = useRef<THREE.Group>(null);
  const c = useMemo(() => curve(pts, y), [pts, y]);
  useTarget(id ?? `truck:${offset}`, ref);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const k = ((clock.getElapsedTime() / period + offset) % 2 + 2) % 2;
    const t = k < 1 ? k : 2 - k;
    place(ref.current, c, t, y);
    if (k >= 1) ref.current.rotation.y += Math.PI;
  });
  return <Truck ref={ref} color={color} pal={pal} />;
}

function Train({ pal }: { pal: Palette }) {
  const ref = useRef<THREE.Group>(null);
  const c = useMemo(() => curve(RAIL, 1.3), []);
  useTarget("train", ref);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() / 18) % 1;
    place(ref.current, c, t, 1.3);
  });
  return (
    <group ref={ref}>
      {[0, -2.4, -4.8, -7.2].map((z, i) => (
        <mesh key={z} position={[0, 0.6, z]} castShadow>
          <boxGeometry args={[1, 1, 2.2]} />
          <meshStandardMaterial color={i === 0 ? pal.rail : "#c9b8e4"} />
        </mesh>
      ))}
    </group>
  );
}

function Plane({ pal }: { pal: Palette }) {
  const ref = useRef<THREE.Group>(null);
  useTarget("plane", ref);
  const arc = useMemo(
    () => new THREE.QuadraticBezierCurve3(new THREE.Vector3(116, 4, -42), new THREE.Vector3(0, 46, -40), new THREE.Vector3(-112, 4, -6)),
    [],
  );
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() / 14) % 1;
    const p = arc.getPointAt(t);
    const tan = arc.getTangentAt(t);
    ref.current.position.copy(p);
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan.normalize());
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.9, 5]} />
        <meshStandardMaterial color={pal.wall} />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[6, 0.15, 1.2]} />
        <meshStandardMaterial color={pal.wall} />
      </mesh>
      <mesh position={[0, 0.7, -2.1]}>
        <boxGeometry args={[0.15, 1.2, 0.9]} />
        <meshStandardMaterial color="#0F7C6E" />
      </mesh>
    </group>
  );
}

function Feeder({ pal }: { pal: Palette }) {
  const ref = useRef<THREE.Group>(null);
  const c = useMemo(() => curve(ROUTES.dmm, 0), []);
  useTarget("feeder", ref);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const k = ((clock.getElapsedTime() / 16) % 2 + 2) % 2;
    place(ref.current, c, k < 1 ? k : 2 - k);
    if (k >= 1) ref.current.rotation.y += Math.PI;
  });
  return <Ship ref={ref} color="#2E8FB5" pal={pal} load={12} seed={9} scale={0.7} />;
}

/** Oceanlink's vessel alongside at Jebel Ali, for the trust layer. */
function AtJebelAli({ pal }: { pal: Palette }) {
  const ref = useRef<THREE.Group>(null);
  useTarget("jea:ship", ref);
  return <Ship ref={ref} position={[JEA_BERTH[0], 0, JEA_BERTH[1]]} rotation={[0, -Math.PI / 2 + 0.32, 0]} color="#1F5F8B" pal={pal} load={24} seed={4} />;
}

export function Fleet({ pal }: { pal: Palette }) {
  const view = useStore((s) => s.view);
  return (
    <group>
      <Traffic pal={pal} />
      <Berthed pal={pal} />
      <OLVessels pal={pal} />
      <Voyage pal={pal} />
      <Shuttle pts={ROADS.noor} color={pal.teal} pal={pal} period={9} />
      <Shuttle pts={ROADS.noor} color={pal.signal} pal={pal} period={9} offset={1} />
      {view === "multi" && (
        <>
          <Train pal={pal} />
          <Plane pal={pal} />
          <Feeder pal={pal} />
          <Shuttle pts={ROADS.ruh} color="#A0662B" pal={pal} period={12} offset={0.3} id="truck:ruh" />
          <Shuttle pts={ROADS.ruh} color="#A0662B" pal={pal} period={12} offset={1.2} id="truck:ruh2" />
        </>
      )}
      {view === "trust" && <AtJebelAli pal={pal} />}
    </group>
  );
}

