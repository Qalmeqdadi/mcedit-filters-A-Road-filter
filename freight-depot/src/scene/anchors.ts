// Dock tags are plain DOM laid over the canvas; the render loop moves them to follow each rig.
import * as THREE from "three";

export const rigGroups = new Map<string, THREE.Object3D>();
export const tagEls = new Map<string, HTMLElement>();
export const TAG_ANCHOR = new THREE.Vector3(0, 6.4, -3);
