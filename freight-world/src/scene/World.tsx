import { MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStore, type View } from "../store";
import { project } from "./anchors";
import { FitBay } from "./FitBay";
import { Fleet } from "./Fleet";
import { Fx } from "./Fx";
import { FOCUS, type Focus } from "./geo";
import { PALETTES, useTheme } from "./palette";
import { Terrain } from "./Terrain";

const OFFSET = new THREE.Vector3(30, 95, 85);

export function focusFor(view: View, step: number): Focus {
  if (view === "flow") return [FOCUS.fitBay, FOCUS.shanghai, FOCUS.shanghai, FOCUS.shanghai, FOCUS.dubai, FOCUS.world][step - 1];
  const map: Partial<Record<View, Focus>> = {
    dash: FOCUS.world, carriers: FOCUS.shanghai, analytics: FOCUS.world, setup: FOCUS.dubai,
    ship: FOCUS.world, multi: FOCUS.wide, opt: FOCUS.fitBay, trust: FOCUS.dubai, net: { c: [0, 0], w: 340 },
    c_home: FOCUS.olTerm, c_cap: FOCUS.olTerm, c_perf: FOCUS.olTerm, p_jobs: FOCUS.customs,
    sh_home: FOCUS.noor, sh_docs: FOCUS.noor,
  };
  return map[view] ?? FOCUS.world;
}

/** Room taken by the floating interface, so the focus lands in the open part of the screen. */
export function chrome(w: number, view: View) {
  if (w <= 900) return { left: 0, right: 0, top: 0, bottom: 0 };
  const panel = window.innerWidth > 1500 ? 520 : 460;
  return { left: 0, right: panel + 32, top: view === "dash" || view === "analytics" ? 130 : 16, bottom: 110 };
}

function Director() {
  const { camera, size } = useThree();
  const controls = useRef<React.ComponentRef<typeof MapControls>>(null);
  const view = useStore((s) => s.view);
  const step = useStore((s) => s.step);
  const nonce = useStore((s) => s.viewNonce);
  const goal = useRef({ target: new THREE.Vector3(), zoom: 4, t: 0 });
  const zoomDelta = useRef(0);

  // fly to the screen's focus whenever the screen changes
  useEffect(() => {
    const f = focusFor(view, step);
    const c = chrome(size.width, view);
    const usable = Math.max(240, size.width - c.left - c.right);
    goal.current = { target: new THREE.Vector3(f.c[0], 0, f.c[1]), zoom: Math.max(1.6, Math.min(usable / f.w, (size.height - c.top - c.bottom) / (f.w * 0.62))), t: 1 };
    const cam = camera as THREE.OrthographicCamera;
    if (c.right || c.left) cam.setViewOffset(size.width, size.height, (c.right - c.left) / 2, (c.bottom - c.top) / 2, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [view, step, nonce, size.width, size.height, camera]);

  useEffect(() => {
    const on = (e: Event) => {
      zoomDelta.current += (e as CustomEvent<number>).detail;
    };
    window.addEventListener("fw-zoom", on);
    return () => window.removeEventListener("fw-zoom", on);
  }, []);

  useFrame((_, dt) => {
    const cam = camera as THREE.OrthographicCamera;
    const ctl = controls.current;
    if (!ctl) return;
    const g = goal.current;
    if (g.t > 0) {
      const k = 1 - Math.pow(0.02, dt);
      ctl.target.lerp(g.target, k);
      cam.zoom += (g.zoom - cam.zoom) * k;
      cam.position.copy(ctl.target).add(OFFSET);
      cam.updateProjectionMatrix();
      if (ctl.target.distanceTo(g.target) < 0.05 && Math.abs(cam.zoom - g.zoom) < 0.01) g.t = 0;
      ctl.update();
    }
    if (zoomDelta.current) {
      cam.zoom = THREE.MathUtils.clamp(cam.zoom * Math.pow(1.3, zoomDelta.current), 1.2, 40);
      cam.updateProjectionMatrix();
      zoomDelta.current = 0;
    }
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning={false}
      minZoom={1.2}
      maxZoom={40}
      minPolarAngle={0.35}
      maxPolarAngle={1.05}
      onStart={() => {
        goal.current.t = 0;
      }}
    />
  );
}

function Projector() {
  const { camera, size } = useThree();
  useFrame(() => project(camera, size.width, size.height));
  return null;
}

export function World() {
  const theme = useTheme();
  const pal = PALETTES[theme];
  return (
    <Canvas
      shadows
      orthographic
      dpr={[1, 2]}
      camera={{ position: [32 + OFFSET.x, OFFSET.y, -2 + OFFSET.z], zoom: 4, near: -600, far: 900 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[pal.sea]} />
      <Director />
      <Projector />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemi]} />
      <directionalLight
        position={[60, 140, 70]}
        intensity={pal.sun}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-bias={-0.0005}
      />
      <Terrain pal={pal} />
      <Fleet pal={pal} />
      <Fx pal={pal} />
      <FitBay pal={pal} />
    </Canvas>
  );
}
