// World labels are DOM laid over the canvas. Each label names a target; the render loop
// projects that target every frame and moves the label element.
import * as THREE from "three";

export type Target = THREE.Object3D | THREE.Vector3;
export const targets = new Map<string, Target>();
export const labelEls = new Map<string, HTMLElement>();
const tmp = new THREE.Vector3();

export function worldPos(t: Target, out: THREE.Vector3) {
  if (t instanceof THREE.Vector3) return out.copy(t);
  if (!t.visible) return null;
  t.getWorldPosition(out);
  return out;
}

export function project(camera: THREE.Camera, w: number, h: number) {
  for (const [id, el] of labelEls) {
    const t = targets.get(el.dataset.target ?? id);
    const lift = Number(el.dataset.lift ?? 0);
    const p = t ? worldPos(t, tmp) : null;
    if (!p) {
      el.style.visibility = "hidden";
      continue;
    }
    p.y += lift;
    p.project(camera);
    if (p.z > 1) {
      el.style.visibility = "hidden";
      continue;
    }
    el.style.visibility = "visible";
    el.style.transform = `translate(-50%, -100%) translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
  }
}
