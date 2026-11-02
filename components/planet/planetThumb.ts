import * as THREE from "three";
import {
	createPlanetGroup,
	planetExtent,
} from "@/components/planet/planetMesh";

import { disposeScene, lightScene } from "@/components/planet/sceneParts";
import { planetParams } from "@/lib/planets/planetParams";

// One shared offscreen renderer renders every planet once to a PNG, so the solar map
// can show many small planets without a WebGL context each.
let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<number, string>();
const SIZE = 192;
const CAMERA = { near: 0.1, far: 100 };
const DEGREES_PER_RADIAN_HALF_TURN = 180;
const SPIN_DIVISOR = 100;

const FIELD_OF_VIEW = 40;
const FRAME_MARGIN = 1.05; // the planet fills this share of the frame (the rest is a margin for rings and atmosphere)
const THUMB_DETAIL = 0.5;
const SPIN_STEPS = 628; // seed % this / 100 gives a turn of up to two pi, so each planet shows a different side

/** renders the planet once, looking at it from straight ahead, and returns the picture as a data URL */
function renderThumb(seed: number) {
	renderer ??= new THREE.WebGLRenderer({
		antialias: true,
		alpha: true,
		preserveDrawingBuffer: true,
	});

	renderer.setSize(SIZE, SIZE, false);
	renderer.setClearColor(0x000000, 0);

	const params = planetParams(seed);
	const scene = new THREE.Scene();
	const half = planetExtent(params) * FRAME_MARGIN; // world units from centre to frame edge
	const camera = new THREE.PerspectiveCamera(
		FIELD_OF_VIEW,
		1,
		CAMERA.near,
		CAMERA.far,
	);

	camera.position.set(
		0,
		0,
		half /
			Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / DEGREES_PER_RADIAN_HALF_TURN),
	);

	camera.lookAt(0, 0, 0);
	lightScene(scene);

	const { group, planet } = createPlanetGroup(params, THUMB_DETAIL);
	planet.rotation.y = (seed % SPIN_STEPS) / SPIN_DIVISOR;
	scene.add(group);
	renderer.render(scene, camera);
	const dataUrl = renderer.domElement.toDataURL("image/png");
	disposeScene(scene);

	return dataUrl;
}

export function planetThumb(seed: number): string {
	const cached = cache.get(seed);

	if (cached) return cached;

	const url = renderThumb(seed);
	cache.set(seed, url);

	return url;
}

/** Display width (px) so the planet body is `bodyPx` across, with room for rings/atmosphere. */
export function thumbDisplaySize(seed: number, bodyPx: number) {
	const p = planetParams(seed);

	return bodyPx * ((planetExtent(p) * FRAME_MARGIN) / p.radius);
}
