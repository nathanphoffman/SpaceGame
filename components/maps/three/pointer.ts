import * as THREE from "three";

/** something the mouse can pick: a point in the scene with a screen-space click radius */
export type Pickable = { id: number; object: THREE.Object3D; radiusPx: number };

export const POINTER_EVENT = {
	down: "pointerdown",
	move: "pointermove",
	up: "pointerup",
} as const;

const DRAG_PIXELS = 5;
const HALF = 0.5; // normalised device coordinates run -1..1; this maps them to 0..1
const scratch = new THREE.Vector3();

/** The pickable closest to the pointer, if the pointer is inside its click radius. */
export function pickAt(
	event: MouseEvent,
	element: HTMLElement,
	pickables: Pickable[],
	camera: THREE.Camera,
): number | null {
	const bounds = element.getBoundingClientRect();
	const pointerX = event.clientX - bounds.left,
		pointerY = event.clientY - bounds.top;
	let best: number | null = null,
		bestD = Infinity;

	for (const pickable of pickables) {
		pickable.object.getWorldPosition(scratch).project(camera);

		if (scratch.z > 1) continue; // behind the camera
		const gap = Math.hypot(
			(scratch.x * HALF + HALF) * bounds.width - pointerX,
			(-scratch.y * HALF + HALF) * bounds.height - pointerY,
		);

		if (gap < pickable.radiusPx && gap < bestD) {
			best = pickable.id;
			bestD = gap;
		}
	}

	return best;
}

/** Click (not drag) and hover-cursor handling on `el`. Returns a function that removes the listeners. */
export function bindPointer(
	el: HTMLElement,
	pick: (event: MouseEvent) => number | null,
	onClick: (pickedId: number | null) => void,
) {
	let hover: number | null = null;

	const onDown = (down: PointerEvent) => { // callback run for each event or item
		// a click only counts if the pointer barely moved between press and release, otherwise it was a drag

		if (down.button !== 0) return;
		const start = { x: down.clientX, y: down.clientY };

		const up = (event: PointerEvent) => {
			window.removeEventListener(POINTER_EVENT.up, up);

			if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= DRAG_PIXELS)
				onClick(pick(event));
		};

		window.addEventListener(POINTER_EVENT.up, up);
	};

	// hover only: while a button is held the drag handler owns the pointer
	const onMove = (event: PointerEvent) => {
		if (event.buttons) return;
		const id = pick(event);

		if (id === hover) return;
		hover = id;
		el.style.cursor = id != null ? "pointer" : "";
	};

	el.addEventListener(POINTER_EVENT.down, onDown);
	el.addEventListener(POINTER_EVENT.move, onMove);

	return () => {
		el.removeEventListener(POINTER_EVENT.down, onDown);
		el.removeEventListener(POINTER_EVENT.move, onMove);
	};
}
