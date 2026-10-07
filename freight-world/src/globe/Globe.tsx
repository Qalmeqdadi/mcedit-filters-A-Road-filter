// The global map: a globe that unrolls into a flat map, with every lane, hub and shipment the
// current lens may see. Drag to turn or pan, scroll or pinch to zoom, click a hub or a shipment.
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { Mode } from "@fo/network/modes";
import { hub } from "@fo/network/hubs";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { DEFAULT_LENS, LENSES } from "../live/engine";
import { chrome } from "../scene/World";
import { useTheme, type Theme } from "../scene/palette";
import { useStore, type View } from "../store";
import { GLOBE_COLORS, PILOT_BOX, drawWorld } from "./texture";
import { FAMILY_COLORS, KIND_FAMILY, useMapModel, type MapModel } from "./model";
import { frame, pathFor, type LL, type Path } from "./routes";
import { G, R, REGIONS, facing, flyTo, flyToFit, globeLabels, place, placeRel, wrapLon } from "./state";

const D = Math.PI / 180;
const COLS = 256;
const ROWS = 128;
const FOV = 30;
const BG: Record<Theme, string> = { light: "#e3eae8", dark: "#071217" };

let group: THREE.Group | null = null;

// ── Camera, input and the morph ──────────────────────────────────────────────

function Controller({ model }: { model: MapModel }) {
  const { camera, gl, size } = useThree();
  const view = useStore((s) => s.view);
  const nonce = useStore((s) => s.viewNonce);
  const lens = useStore((s) => s.lens);
  const vel = useRef({ lon: 0, lat: 0 });
  const zoomBy = useRef(0);

  // Leave room for the panel, so what we fly to lands in the open part of the screen.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const c = chrome(size.width, view as View);
    if (c.right || c.left) cam.setViewOffset(size.width, size.height, (c.right - c.left) / 2, (c.bottom - c.top) / 2, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, view]);

  // Each lens opens on what that person works with.
  useEffect(() => {
    const L = LENSES[lens];
    const pts: LL[] = [];
    if (L.persona === "shp") model.shipments.forEach((s) => s.paths.forEach((p) => pts.push(p.points[0]!, p.points[p.points.length - 1]!)));
    else if (L.persona === "car") model.lanes.forEach((l) => pts.push(l.path.points[0]!, l.path.points[l.path.points.length - 1]!));
    else if (L.persona === "par") model.view.jobs.forEach((j) => pts.push([hub(j.hub).lat, hub(j.hub).lon]));
    if (pts.length && lens !== DEFAULT_LENS.fwd) {
      const f = frame(pts);
      flyToFit(f.center, f.radius);
    } else flyTo(REGIONS.world.at[0], REGIONS.world.at[1], REGIONS.world.dist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, nonce]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const perPixel = () => (2 * Math.max(0.15, G.dist - R) * Math.tan((FOV / 2) * D)) / el.clientHeight / R / D;
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      G.goal.active = false;
      G.touched = performance.now();
      vel.current = { lon: 0, lat: 0 };
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const before = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        p.x = e.clientX;
        p.y = e.clientY;
        const after = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch && before) G.dist = clampDist(G.dist * (before / after));
        pinch = after;
        G.stamp++;
        return;
      }
      const k = perPixel();
      const dLon = -(e.clientX - p.x) * k;
      const dLat = (e.clientY - p.y) * k;
      p.x = e.clientX;
      p.y = e.clientY;
      G.lon0 = wrapLon(G.lon0 + dLon);
      G.lat0 = Math.max(-60, Math.min(72, G.lat0 + dLat));
      vel.current = { lon: dLon, lat: dLat };
      G.touched = performance.now();
      G.stamp++;
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      G.goal.active = false;
      G.touched = performance.now();
      G.dist = clampDist(G.dist * Math.pow(1.0015, e.deltaY));
      G.stamp++;
    };
    const zoom = (e: Event) => {
      zoomBy.current += (e as CustomEvent<number>).detail;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("fw-zoom", zoom);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("fw-zoom", zoom);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const before = `${G.lon0}|${G.t}`;
    const flat = useStore.getState().flat ? 1 : 0;
    if (G.t !== flat) {
      G.t += (flat - G.t) * (1 - Math.pow(0.002, dt));
      if (Math.abs(G.t - flat) < 0.002) G.t = flat;
    }
    if (zoomBy.current) {
      G.goal = { lon0: G.lon0, lat0: G.lat0, dist: clampDist(G.dist * Math.pow(0.72, zoomBy.current)), active: true };
      zoomBy.current = 0;
    }
    const g = G.goal;
    if (g.active) {
      const k = 1 - Math.pow(0.03, dt);
      G.lon0 = wrapLon(G.lon0 + wrapLon(g.lon0 - G.lon0) * k);
      G.lat0 += (g.lat0 - G.lat0) * k;
      G.dist += (g.dist - G.dist) * k;
      if (Math.abs(wrapLon(g.lon0 - G.lon0)) < 0.05 && Math.abs(g.lat0 - G.lat0) < 0.05 && Math.abs(g.dist - G.dist) < 0.003) g.active = false;
    } else {
      // a flick keeps turning a little; an idle globe turns slowly on its own
      const v = vel.current;
      const idle = performance.now() - G.touched > 6000;
      if (Math.abs(v.lon) > 0.001 || Math.abs(v.lat) > 0.001) {
        G.lon0 = wrapLon(G.lon0 + v.lon);
        G.lat0 = Math.max(-60, Math.min(72, G.lat0 + v.lat));
        v.lon *= Math.pow(0.02, dt);
        v.lat *= Math.pow(0.02, dt);
      } else if (idle && G.t === 0 && G.dist > 3.6 && !useStore.getState().pick && !useStore.getState().enquiry) G.lon0 = wrapLon(G.lon0 + dt * 2.5);
    }
    if (`${G.lon0}|${G.t}` !== before) G.stamp++;
    camera.position.set(0, 0, G.dist);
    camera.lookAt(0, 0, 0);
    if (group) {
      group.rotation.x = G.lat0 * D * (1 - G.t);
      group.position.y = -G.lat0 * D * R * G.t;
    }
  });
  return null;
}

const clampDist = (d: number) => Math.max(1.12, Math.min(G.t > 0.5 ? 10 : 8, d));

// ── The earth itself ─────────────────────────────────────────────────────────

function Earth({ theme }: { theme: Theme }) {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(drawWorld(theme, 4096));
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, COLS, ROWS), []);
  const lastT = useRef(-1);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    tex.offset.x = G.lon0 / 360;
    if (lastT.current === G.t) return;
    lastT.current = G.t;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let iy = 0; iy <= ROWS; iy++) {
      for (let ix = 0; ix <= COLS; ix++) {
        placeRel(90 - (180 * iy) / ROWS, -180 + (360 * ix) / COLS, 0, v);
        pos.setXYZ(iy * (COLS + 1) + ix, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <mesh geometry={geo} renderOrder={0}>
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

/** The pilot region again at high resolution, laid just above the globe for close-ups. */
function Detail({ theme }: { theme: Theme }) {
  const [w0, s0, e0, n0] = PILOT_BOX;
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(drawWorld(theme, 3200, PILOT_BOX));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [theme]);
  useEffect(() => () => tex.dispose(), [tex]);
  const COLS_D = 80, ROWS_D = 60;
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1, COLS_D, ROWS_D), []);
  const mesh = useRef<THREE.Mesh>(null);
  const stamp = useRef(-1);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    // Only when close, and never across the seam of the flat map.
    const crosses = G.t > 0.01 && Math.abs(wrapLon(w0 - G.lon0) - wrapLon(e0 - G.lon0)) > 180 - (e0 - w0);
    m.visible = G.dist < 2.6 && !crosses;
    if (!m.visible || stamp.current === G.stamp) return;
    stamp.current = G.stamp;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let iy = 0; iy <= ROWS_D; iy++) {
      for (let ix = 0; ix <= COLS_D; ix++) {
        place(n0 - ((n0 - s0) * iy) / ROWS_D, w0 + ((e0 - w0) * ix) / COLS_D, 0.0004, v);
        pos.setXYZ(iy * (COLS_D + 1) + ix, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <mesh ref={mesh} geometry={geo} renderOrder={1}>
      <meshBasicMaterial map={tex} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  );
}

function Halo({ theme }: { theme: Theme }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(theme === "dark" ? "#4db9ae" : "#8fb3bd") }, opacity: { value: 1 } },
        vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 color; uniform float opacity; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(-dot(vN, vV) * 2.2, 0.0, 1.0), 1.6); gl_FragColor = vec4(color, f * opacity); }",
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: theme === "dark" ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [theme],
  );
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    mat.uniforms.opacity!.value = Math.max(0, 1 - G.t * 3) * (theme === "dark" ? 0.9 : 0.55);
    if (mesh.current) mesh.current.visible = G.t < 0.34;
  });
  return (
    <mesh ref={mesh} material={mat}>
      <sphereGeometry args={[R * 1.12, 64, 48]} />
    </mesh>
  );
}

// ── Lanes ────────────────────────────────────────────────────────────────────

interface Stroke {
  path: Path;
  color: THREE.Color;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

/** Builds segment pairs for paths, splitting where a path crosses the seam of the flat map. */
function fill(strokes: Stroke[], geo: LineSegmentsGeometry) {
  const pos: number[] = [];
  const col: number[] = [];
  for (const s of strokes) {
    const { points, alt } = s.path;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      if (G.t > 0.01 && Math.abs(wrapLon(a[1] - G.lon0) - wrapLon(b[1] - G.lon0)) > 180) continue;
      place(a[0], a[1], alt[i - 1]!, tmpA);
      place(b[0], b[1], alt[i]!, tmpB);
      pos.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
      col.push(s.color.r, s.color.g, s.color.b, s.color.r, s.color.g, s.color.b);
    }
  }
  if (!pos.length) pos.push(0, 0, 0, 0, 0, 0), col.push(0, 0, 0, 0, 0, 0);
  geo.setPositions(pos);
  geo.setColors(col);
}

function Strokes({ strokes, width, opacity = 1 }: { strokes: Stroke[]; width: number; opacity?: number }) {
  const { size } = useThree();
  const obj = useMemo(() => {
    const m = new LineMaterial({ linewidth: width, vertexColors: true, transparent: true, opacity, depthWrite: false });
    return new LineSegments2(new LineSegmentsGeometry(), m);
  }, [width, opacity]);
  const stamp = useRef(-1);
  useEffect(() => {
    stamp.current = -1;
  }, [strokes]);
  useEffect(
    () => () => {
      obj.geometry.dispose();
      (obj.material as LineMaterial).dispose();
    },
    [obj],
  );
  useFrame(() => {
    (obj.material as LineMaterial).resolution.set(size.width, size.height);
    if (stamp.current === G.stamp) return;
    stamp.current = G.stamp;
    fill(strokes, obj.geometry as LineSegmentsGeometry);
  });
  return <primitive object={obj} renderOrder={2} />;
}

function Lanes({ model, theme }: { model: MapModel; theme: Theme }) {
  const pick = useStore((s) => s.pick);
  const enquiry = useStore((s) => s.enquiry);
  const { base, hot } = useMemo(() => {
    const fam = FAMILY_COLORS[theme];
    const fade = new THREE.Color(GLOBE_COLORS[theme].sea);
    const hotIds = new Set<string>();
    if (pick?.kind === "lane") hotIds.add(pick.id);
    if (pick?.kind === "hub") model.lanes.filter((l) => [l.lane.from, ...l.lane.via, l.lane.to].includes(pick.id)).forEach((l) => hotIds.add(l.lane.id));
    if (enquiry) model.lanes.filter((l) => matchesEnquiry(l.lane.from, l.lane.to, enquiry.from, enquiry.to)).forEach((l) => hotIds.add(l.lane.id));
    const dim = hotIds.size > 0 || pick?.kind === "shipment";
    const base: Stroke[] = model.lanes.map((l) => ({ path: l.path, color: new THREE.Color(fam[l.family]).lerp(fade, dim && !hotIds.has(l.lane.id) ? 0.72 : 0) }));
    const hot: Stroke[] = model.lanes.filter((l) => hotIds.has(l.lane.id)).map((l) => ({ path: l.path, color: new THREE.Color(fam[l.family]) }));
    return { base, hot };
  }, [model, pick, enquiry, theme]);
  return (
    <>
      <Strokes strokes={base} width={1.8} opacity={0.9} />
      {hot.length > 0 && <Strokes strokes={hot} width={4.2} />}
    </>
  );
}

/** Lanes that could serve an enquiry: same city at both ends (any hub kind). */
export function matchesEnquiry(laneFrom: string, laneTo: string, from: string, to: string): boolean {
  const city = (c: string) => hub(c).city;
  return city(laneFrom) === city(from) && city(laneTo) === city(to);
}

function Enquiry({ theme }: { theme: Theme }) {
  const enquiry = useStore((s) => s.enquiry);
  const strokes = useMemo<Stroke[]>(() => {
    if (!enquiry) return [];
    const mode = (["ocean_fcl", "ocean_lcl", "air", "road", "rail"].includes(enquiry.mode ?? "") ? enquiry.mode : "air") as Mode;
    return [{ path: pathFor(mode === "ocean_fcl" || mode === "ocean_lcl" ? mode : "air", [enquiry.from, enquiry.to]), color: new THREE.Color(theme === "dark" ? "#f5c12e" : "#d99a00") }];
  }, [enquiry, theme]);
  return strokes.length ? <Strokes strokes={strokes} width={3} /> : null;
}

// ── Hubs and moving shipments ────────────────────────────────────────────────

const ball = new THREE.SphereGeometry(1, 12, 10);

function Hubs({ model, theme }: { model: MapModel; theme: Theme }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pick = useStore((s) => s.pick);
  const set = useStore((s) => s.set);
  const m = useMemo(() => new THREE.Object3D(), []);
  const stamp = useRef(-1);
  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const c = new THREE.Color();
    model.hubs.forEach((h, i) => im.setColorAt(i, c.set(FAMILY_COLORS[theme][KIND_FAMILY[h.kind]])));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    stamp.current = -1;
  }, [model, theme]);
  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const key = G.stamp + G.dist;
    if (key === stamp.current) return;
    stamp.current = key;
    const s = Math.max(0.0007, (G.dist - R * 0.97) * 0.0024);
    model.hubs.forEach((h, i) => {
      place(h.lat, h.lon, 0.003, m.position);
      m.scale.setScalar(pick?.id === h.code ? s * 1.9 : s);
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || e.instanceId === undefined) return;
    e.stopPropagation();
    const h = model.hubs[e.instanceId];
    if (h) {
      set({ pick: { kind: "hub", id: h.code } });
      flyTo(h.lat, h.lon, Math.min(G.dist, 1.7));
    }
  };
  return (
    <instancedMesh key={model.hubs.length} ref={mesh} args={[ball, undefined, model.hubs.length]} onClick={click} renderOrder={3}>
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function Movers({ model, theme }: { model: MapModel; theme: Theme }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const set = useStore((s) => s.set);
  const m = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const c = new THREE.Color();
    model.shipments.forEach((s, i) => im.setColorAt(i, c.set(s.s.exception ? (theme === "dark" ? "#ee8069" : "#b8402c") : FAMILY_COLORS[theme][s.family])));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [model, theme]);
  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const base = Math.max(0.0012, (G.dist - R * 0.97) * 0.0042);
    model.shipments.forEach((s, i) => {
      place(s.at[0], s.at[1], s.alt + 0.004, m.position);
      m.scale.setScalar(base * (1 + 0.18 * Math.sin(clock.elapsedTime * 3 + i)));
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || e.instanceId === undefined) return;
    e.stopPropagation();
    const s = model.shipments[e.instanceId];
    if (s) {
      set({ pick: { kind: "shipment", id: s.s.id } });
      flyTo(s.at[0], s.at[1], Math.min(G.dist, 2.2));
    }
  };
  if (!model.shipments.length) return null;
  return (
    <instancedMesh key={model.shipments.length} ref={mesh} args={[ball, undefined, model.shipments.length]} onClick={click} renderOrder={4}>
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function ShipmentTrails({ model, theme }: { model: MapModel; theme: Theme }) {
  const pick = useStore((s) => s.pick);
  const strokes = useMemo<Stroke[]>(() => {
    const fam = FAMILY_COLORS[theme];
    // Shippers and partners see no lanes, so their shipments draw their own legs.
    const always = model.lanes.length === 0;
    return model.shipments.filter((s) => always || (pick?.kind === "shipment" && pick.id === s.s.id)).flatMap((s) => s.paths.map((path) => ({ path, color: new THREE.Color(fam[path.family]) })));
  }, [model, pick, theme]);
  return strokes.length ? <Strokes strokes={strokes} width={pick?.kind === "shipment" ? 3.4 : 2.4} /> : null;
}

// ── Labels ───────────────────────────────────────────────────────────────────

function Projector() {
  const { camera, size } = useThree();
  const local = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const sizes = useMemo(() => new WeakMap<HTMLElement, [number, number]>(), []);
  useFrame(() => {
    if (!group) return;
    group.updateMatrixWorld();
    const shown: { el: HTMLElement; x: number; y: number; prio: number }[] = [];
    for (const el of globeLabels.values()) {
      const d = el.dataset;
      const max = d.maxdist ? Number(d.maxdist) : Infinity;
      const min = d.mindist ? Number(d.mindist) : 0;
      if (G.dist > max || G.dist < min) {
        el.style.visibility = "hidden";
        continue;
      }
      place(Number(d.lat), Number(d.lon), Number(d.alt ?? 0), local);
      if (!facing(local, group, tmp)) {
        el.style.visibility = "hidden";
        continue;
      }
      tmp.copy(local).applyMatrix4(group.matrixWorld).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.2 || Math.abs(tmp.y) > 1.2) {
        el.style.visibility = "hidden";
        continue;
      }
      shown.push({ el, x: ((tmp.x + 1) / 2) * size.width, y: ((1 - tmp.y) / 2) * size.height - 6, prio: Number(d.prio ?? 0) });
    }
    // Most important first; anything that would overlap a label already placed waits until there is room.
    shown.sort((a, b) => b.prio - a.prio);
    const placed: [number, number, number, number][] = [];
    for (const s of shown) {
      let wh = sizes.get(s.el);
      if (!wh || !wh[0]) {
        s.el.style.visibility = "hidden";
        s.el.style.transform = "translate(-9999px, 0)";
        wh = [s.el.offsetWidth, s.el.offsetHeight];
        sizes.set(s.el, wh);
      }
      const r: [number, number, number, number] = [s.x - wh[0] / 2 - 2, s.y - wh[1] - 2, s.x + wh[0] / 2 + 2, s.y + 2];
      if (placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1])) {
        s.el.style.visibility = "hidden";
        continue;
      }
      placed.push(r);
      s.el.style.visibility = "visible";
      s.el.style.transform = `translate(-50%, -100%) translate(${s.x}px, ${s.y}px)`;
    }
  });
  return null;
}

export function Globe() {
  const theme = useTheme();
  const model = useMapModel();
  const set = useStore((s) => s.set);
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: FOV, near: 0.01, far: 50, position: [0, 0, G.dist] }} gl={{ antialias: true }} onPointerMissed={(e) => e.type === "click" && useStore.getState().pick && set({ pick: null })}>
      <color attach="background" args={[BG[theme]]} />
      <Controller model={model} />
      <group
        ref={(g) => {
          group = g;
        }}
      >
        <Earth theme={theme} />
        <Detail theme={theme} />
        <Halo theme={theme} />
        <Lanes model={model} theme={theme} />
        <ShipmentTrails model={model} theme={theme} />
        <Enquiry theme={theme} />
        <Hubs model={model} theme={theme} />
        <Movers model={model} theme={theme} />
      </group>
      <Projector />
    </Canvas>
  );
}
