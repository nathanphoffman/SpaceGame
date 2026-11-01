import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

const MAX_ZOOM = 12;
const BUTTON_ZOOM_STEP = 1.6;
const WHEEL_ZOOM_SPEED = 0.0015;
const DRAG_PIXELS = 4; // moving further than this between press and release makes it a drag, not a click
const CENTRE = 50; // the map is 0..100 %, so its middle is 50
const START_VIEW: View = { z: 1, cx: CENTRE, cy: CENTRE };

type View = { z: number; cx: number; cy: number }; // zoom, and the map point (in %) shown at the centre
type SetView = Dispatch<SetStateAction<View>>;

const keepInside = (view: View): View => {
  const half = CENTRE / view.z;

  return { z: view.z, cx: Math.min(100 - half, Math.max(half, view.cx)), cy: Math.min(100 - half, Math.max(half, view.cy)) };
};

/** zoom by `factor`, keeping the point under (u, w) (% of the map box) where it is */
function zoomedView(current: View, factor: number, u: number, w: number) {
  const z = Math.min(MAX_ZOOM, Math.max(1, current.z * factor));
  const pointX = current.cx + (u - CENTRE) / current.z, pointY = current.cy + (w - CENTRE) / current.z;

  return keepInside({ z, cx: pointX - (u - CENTRE) / z, cy: pointY - (w - CENTRE) / z });
}

/** scroll-wheel zoom toward the cursor; needs a non-passive listener, otherwise the page scrolls as well */
function useWheelZoom(box: RefObject<HTMLDivElement | null>, zoomAt: (factor: number, u: number, w: number) => void) {
  useEffect(() => {
    const element = box.current;

    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), ((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
    };

    element.addEventListener("wheel", onWheel, { passive: false });

    return () => element.removeEventListener("wheel", onWheel);
  }, [box, zoomAt]);
}

/** press on the map and drag to move it; `moved` tells click handlers that the press turned out to be a drag */
function startDrag(event: React.PointerEvent, box: RefObject<HTMLDivElement | null>, moved: RefObject<boolean>, setView: SetView) {
  if (event.button !== 0) return;

  moved.current = false;
  const rect = box.current!.getBoundingClientRect();
  const start = { x: event.clientX, y: event.clientY };
  let last = start;

  const move = (drag: PointerEvent) => { // while dragging, move the map by how far the pointer travelled since the last event
    if (Math.hypot(drag.clientX - start.x, drag.clientY - start.y) > DRAG_PIXELS) moved.current = true;

    if (!moved.current) return;

    const dx = ((drag.clientX - last.x) / rect.width) * 100, dy = ((drag.clientY - last.y) / rect.height) * 100;
    last = { x: drag.clientX, y: drag.clientY };
    setView((current) => keepInside({ ...current, cx: current.cx - dx / current.z, cy: current.cy - dy / current.z }));
  };

  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** Scroll-wheel zoom (toward the cursor), drag to pan, and zoom buttons for a map whose points are in 0..100 %. */
export function useMapZoom() {
  const [view, setView] = useState<View>(START_VIEW);
  const ref = useRef<HTMLDivElement>(null);
  const moved = useRef(false); // true if the last press was a drag, so it shouldn't count as a click on a star
  const zoomAt = useCallback((factor: number, u = CENTRE, w = CENTRE) => setView((current) => zoomedView(current, factor, u, w)), []);

  useWheelZoom(ref, zoomAt);

  return {
    zoom: view.z,
    ref,
    moved,
    onPointerDown: (event: React.PointerEvent) => startDrag(event, ref, moved, setView),
    zoomIn: () => zoomAt(BUTTON_ZOOM_STEP),
    zoomOut: () => zoomAt(1 / BUTTON_ZOOM_STEP),
    reset: () => setView(START_VIEW),
    /** map % position -> where it is drawn now */
    project: (point: { x: number; y: number }) => ({ x: CENTRE + (point.x - view.cx) * view.z, y: CENTRE + (point.y - view.cy) * view.z }),
  };
}
