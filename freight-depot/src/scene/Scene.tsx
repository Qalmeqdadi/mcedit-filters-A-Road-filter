import { MapControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useStore } from "../sim/store";
import { TAG_ANCHOR, rigGroups, tagEls } from "./anchors";
import { Depot } from "./Depot";
import { HIGHWAY } from "./layout";
import { PALETTES, type Palette, useTheme } from "./palette";
import { Rig } from "./Rig";

const TARGET = new THREE.Vector3(0, 0, -6);
const CAM_OFFSET = new THREE.Vector3(48, 52, 62);

const box = new THREE.BoxGeometry(1, 1, 1);

/** Other traffic on the E11, so the depot sits in a working landscape. */
function Traffic({ pal }: { pal: Palette }) {
  const refs = useRef<THREE.Group[]>([]);
  const lanes = [
    { z: HIGHWAY.laneOut, dir: 1, speed: 9, offset: 0, cab: pal.chassis },
    { z: HIGHWAY.laneOut, dir: 1, speed: 7.5, offset: 120, cab: pal.held },
    { z: HIGHWAY.laneIn, dir: -1, speed: 10, offset: 40, cab: pal.accentDeep },
    { z: HIGHWAY.laneIn, dir: -1, speed: 8, offset: 170, cab: pal.dg },
  ];
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    lanes.forEach((l, i) => {
      const g = refs.current[i];
      if (!g) return;
      const x = (((t * l.speed + l.offset) % 300) + 300) % 300 - 150;
      g.position.set(l.dir * x, 0, l.z);
      g.rotation.y = l.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  });
  return (
    <>
      {lanes.map((l, i) => (
        <group key={i} ref={(g) => { if (g) refs.current[i] = g; }}>
          <mesh geometry={box} scale={[2.4, 2.8, 12]} position={[0, 2.7, -2.5]} castShadow>
            <meshStandardMaterial color={pal.trailer} />
          </mesh>
          <mesh geometry={box} scale={[2.4, 2.4, 2.2]} position={[0, 2.1, 5]} castShadow>
            <meshStandardMaterial color={l.cab} />
          </mesh>
          <mesh geometry={box} scale={[1, 0.5, 18]} position={[0, 0.8, 0.5]}>
            <meshStandardMaterial color={pal.chassis} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Room taken by the floating panels on desktop, so the depot is framed in the space that is left. */
function chrome(w: number) {
  if (w <= 900) return { right: 0, top: 0, bottom: 0 };
  return { right: 416, top: w > 1380 ? 100 : 190, bottom: 170 };
}

const v = new THREE.Vector3();
function TagProjector() {
  const { camera, size } = useThree();
  useFrame(() => {
    for (const [id, el] of tagEls) {
      const g = rigGroups.get(id);
      if (!g || !g.visible) {
        el.style.visibility = "hidden";
        continue;
      }
      v.copy(TAG_ANCHOR);
      g.localToWorld(v);
      v.project(camera);
      el.style.visibility = "visible";
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
    }
  });
  return null;
}

function fitZoom(w: number, h: number) {
  const c = chrome(w);
  if (w <= 900) return Math.max(4, Math.min(w / 42, h / 34)); // phones: frame the six docks
  return Math.max(4, Math.min((w - c.right) / 82, (h - c.top - c.bottom) / 44));
}

function CameraRig() {
  const { camera, size } = useThree();
  const controls = useRef<MapControlsImpl>(null);
  const nonce = useStore((s) => s.viewNonce);
  const zoomDelta = useRef(0);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.position.copy(TARGET).add(CAM_OFFSET);
    cam.zoom = fitZoom(size.width, size.height);
    const c = chrome(size.width);
    if (c.right) cam.setViewOffset(size.width, size.height, c.right / 2, (c.bottom - c.top) / 2, size.width, size.height);
    else cam.clearViewOffset();
    cam.lookAt(TARGET);
    cam.updateProjectionMatrix();
    controls.current?.target.copy(TARGET);
    controls.current?.update();
  }, [nonce, camera, size.width]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onZoom = (e: Event) => {
      zoomDelta.current += (e as CustomEvent<number>).detail;
    };
    window.addEventListener("fo-zoom", onZoom);
    return () => window.removeEventListener("fo-zoom", onZoom);
  }, []);

  useFrame(() => {
    if (zoomDelta.current !== 0) {
      const cam = camera as THREE.OrthographicCamera;
      cam.zoom = THREE.MathUtils.clamp(cam.zoom * Math.pow(1.25, zoomDelta.current), 2.5, 40);
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
      minZoom={2.5}
      maxZoom={40}
      minPolarAngle={0.45}
      maxPolarAngle={1.1}
      target={TARGET}
    />
  );
}

export function Scene() {
  const theme = useTheme();
  const pal = PALETTES[theme];
  const departures = useStore((s) => s.world.departures);
  const atDepot = departures.filter((d) => d.dock !== null && d.status !== "planned");

  return (
    <Canvas
      shadows
      orthographic
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [TARGET.x + CAM_OFFSET.x, CAM_OFFSET.y, TARGET.z + CAM_OFFSET.z], zoom: 10, near: -400, far: 600 }}
      onPointerMissed={() => useStore.getState().setHover(null)}
    >
      <color attach="background" args={[pal.sky]} />
      <fog attach="fog" args={[pal.sky, 140, 260]} />
      <CameraRig />
      <TagProjector />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, pal.hemi]} />
      <ambientLight intensity={pal.ambient} />
      <directionalLight
        position={[30, 60, 25]}
        intensity={pal.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
      <Depot pal={pal} />
      <Traffic pal={pal} />
      {atDepot.map((d) => (
        <Rig key={d.id} d={d} pal={pal} />
      ))}
    </Canvas>
  );
}
