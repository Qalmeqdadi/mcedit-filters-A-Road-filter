// Depot geometry in metres. x runs along the dock face, z runs from the warehouse (back) to the highway (front).
import * as THREE from "three";

export const DOCK_X = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
export const WAREHOUSE = { x0: -18, x1: 18, z0: -30, z1: -16, h: 7.5 };
export const RIG_LEN = 19.6;
export const DOCK_Z = -16 + RIG_LEN / 2; // rig centre when backed onto the dock
export const APRON = { x0: -24, x1: 34, z0: -16, z1: 14 };
export const GATE_X = 30;
export const HIGHWAY = { z0: 18.5, z1: 28, laneOut: 21, laneIn: 25.5 };

const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);

export function departPath(dock: number) {
  const x = DOCK_X[dock - 1];
  return new THREE.CatmullRomCurve3(
    [v(x, DOCK_Z), v(x, 2), v(x + 1.5, 7.5), v(x + 7, 9.5), v(GATE_X - 5, 9.5), v(GATE_X, 13), v(GATE_X + 0.6, 17.5),
      v(GATE_X + 6, HIGHWAY.laneOut), v(GATE_X + 20, HIGHWAY.laneOut), v(140, HIGHWAY.laneOut)],
    false, "centripetal",
  );
}

/** Forward leg: highway, gate, along the apron past the dock. */
export function arriveForward(dock: number) {
  const x = DOCK_X[dock - 1];
  return new THREE.CatmullRomCurve3(
    [v(140, HIGHWAY.laneIn), v(GATE_X + 18, HIGHWAY.laneIn), v(GATE_X + 4, HIGHWAY.laneIn - 1), v(GATE_X - 1, 18),
      v(GATE_X - 2, 13.5), v(GATE_X - 7, 11), v(x + 2, 11), v(x - 8, 11)],
    false, "centripetal",
  );
}

/** Reverse leg: back the trailer onto the dock. */
export function arriveReverse(dock: number) {
  const x = DOCK_X[dock - 1];
  return new THREE.CatmullRomCurve3([v(x - 8, 11), v(x - 2.5, 10), v(x, 5), v(x, 0), v(x, DOCK_Z)], false, "centripetal");
}
