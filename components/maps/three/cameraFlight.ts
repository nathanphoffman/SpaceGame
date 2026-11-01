import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type Fly = { t: number; dur: number; fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 };

const FLY_SECONDS = 1.1;

/** starts slow, ends gentle: 1 - (1 - t)^3 */
const EASE_POWER = 3;

const ease = (t: number) => 1 - Math.pow(1 - t, EASE_POWER);

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
