import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type Fly = { t: number; dur: number; fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 };

const FLY_SECONDS = 1.1;

/** starts slow, ends gentle: 1 - (1 - t)^3 */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Plans a smooth move from where the camera is now to `pos`, looking at `target`. */
export function startFly(camera: THREE.Camera, controls: OrbitControls, pos: THREE.Vector3, target: THREE.Vector3): Fly {
  return { t: 0, dur: FLY_SECONDS, fromPos: camera.position.clone(), toPos: pos, fromTarget: controls.target.clone(), toTarget: target };
}

/** Moves the camera `dt` seconds along the flight. Returns null once it has arrived. */
export function stepFly(fly: Fly, deltaSeconds: number, camera: THREE.Camera, controls: OrbitControls): Fly | null {
  fly.t += deltaSeconds / fly.dur;
  const k = ease(Math.min(1, fly.t));
  camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
  controls.target.lerpVectors(fly.fromTarget, fly.toTarget, k);

  return fly.t >= 1 ? null : fly;
}

const MIN_NEAR = 1e-8;
const NEAR_SHARE = 0.02; // the near plane sits this fraction of the way to what we are looking at
const FAR_PER_NEAR = 3e8; // depth range the logarithmic depth buffer can handle
const MAX_FAR = 4000;
const MIN_FAR = 200;

/** True-scale systems span many orders of magnitude, so the clip planes track how close we are to what we are looking at. */
export function fitClipPlanes(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const dist = camera.position.distanceTo(controls.target);
  const near = Math.max(dist * NEAR_SHARE, MIN_NEAR);
  camera.near = near;
  camera.far = Math.min(MAX_FAR, Math.max(MIN_FAR, near * FAR_PER_NEAR));
  camera.updateProjectionMatrix();
}
