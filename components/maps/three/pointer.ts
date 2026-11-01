import * as THREE from "three";

/** something the mouse can pick: a point in the scene with a screen-space click radius */
export type Pickable = { id: number; object: THREE.Object3D; radiusPx: number };

const DRAG_PIXELS = 5;
const scratch = new THREE.Vector3();

/** The pickable closest to the pointer, if the pointer is inside its click radius. */
export function pickAt(event: MouseEvent, element: HTMLElement, pickables: Pickable[], camera: THREE.Camera): number | null {
  const r = element.getBoundingClientRect();
  const mx = event.clientX - r.left, my = event.clientY - r.top;
  let best: number | null = null, bestD = Infinity;

  for (const p of pickables) {
    p.object.getWorldPosition(scratch).project(camera);

    if (scratch.z > 1) continue; // behind the camera
    const d = Math.hypot((scratch.x * 0.5 + 0.5) * r.width - mx, (-scratch.y * 0.5 + 0.5) * r.height - my);

    if (d < p.radiusPx && d < bestD) { best = p.id; bestD = d; }
  }

  return best;
}

/** Click (not drag) and hover-cursor handling on `el`. Returns a function that removes the listeners. */
export function bindPointer(el: HTMLElement, pick: (e: MouseEvent) => number | null, onClick: (id: number | null) => void) {
  let hover: number | null = null;

  const onDown = (down: PointerEvent) => { // a click only counts if the pointer barely moved between press and release, otherwise it was a drag
    if (down.button !== 0) return;
    const start = { x: down.clientX, y: down.clientY };

    const up = (e: PointerEvent) => {
      window.removeEventListener("pointerup", up);

      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= DRAG_PIXELS) onClick(pick(e));
    };

    window.addEventListener("pointerup", up);
  };

  const onMove = (e: PointerEvent) => {
    if (e.buttons) return;
    const id = pick(e);

    if (id === hover) return;
    hover = id;
    el.style.cursor = id != null ? "pointer" : "";
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);

  return () => { el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); };
}
