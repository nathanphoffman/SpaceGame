import type * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type CameraFlight = {
	t: number;
	dur: number;
	fromPos: THREE.Vector3;
	toPos: THREE.Vector3;
	fromTarget: THREE.Vector3;
	toTarget: THREE.Vector3;
};

const FLY_SECONDS = 1.1;

/** starts slow, ends gentle: 1 - (1 - t)^3 */
const EASE_POWER = 3;

const ease = (progress: number) => 1 - (1 - progress) ** EASE_POWER;

/** Plans a smooth move from where the camera is now to `pos`, looking at `target`. */
export function startFly(
	camera: THREE.Camera,
	controls: OrbitControls,
	pos: THREE.Vector3,
	target: THREE.Vector3,
): CameraFlight {
	return {
		t: 0,
		dur: FLY_SECONDS,
		fromPos: camera.position.clone(),
		toPos: pos,
		fromTarget: controls.target.clone(),
		toTarget: target,
	};
}

/** Moves the camera `dt` seconds along the flight. Returns null once it has arrived. */
export function stepFly(
	flight: CameraFlight,
	deltaSeconds: number,
	camera: THREE.Camera,
	controls: OrbitControls,
): CameraFlight | null {
	flight.t += deltaSeconds / flight.dur;
	const eased = ease(Math.min(1, flight.t));
	camera.position.lerpVectors(flight.fromPos, flight.toPos, eased);
	controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);

	return flight.t >= 1 ? null : flight;
}
