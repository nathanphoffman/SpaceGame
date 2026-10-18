import { useCallback, useEffect, useRef, useState } from "react";

const MAX_ZOOM = 12;
type View = { z: number; cx: number; cy: number }; // zoom, and the map point (in %) shown at the centre

const keepInside = (v: View): View => {
  const half = 50 / v.z;
  return { z: v.z, cx: Math.min(100 - half, Math.max(half, v.cx)), cy: Math.min(100 - half, Math.max(half, v.cy)) };
};

/** Scroll-wheel zoom (toward the cursor), drag to pan, and zoom buttons for a map whose points are in 0..100 %. */
export function useMapZoom() {
  const [v, setV] = useState<View>({ z: 1, cx: 50, cy: 50 });
  const ref = useRef<HTMLDivElement>(null);
  const moved = useRef(false); // true if the last press was a drag, so it shouldn't count as a click on a star

  /** zoom by `factor`, keeping the point under (u, w) (% of the map box) where it is */
  const zoomAt = useCallback((factor: number, u = 50, w = 50) => {
    setV((cur) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, cur.z * factor));
      const wx = cur.cx + (u - 50) / cur.z, wy = cur.cy + (w - 50) / cur.z;
      return keepInside({ z, cx: wx - (u - 50) / z, cy: wy - (w - 50) / z });
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // needs a non-passive listener, otherwise the page scrolls as well
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    moved.current = false;
    const r = ref.current!.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let last = start;
    const move = (m: PointerEvent) => {
      if (Math.hypot(m.clientX - start.x, m.clientY - start.y) > 4) moved.current = true;
      if (!moved.current) return;
      const dx = ((m.clientX - last.x) / r.width) * 100, dy = ((m.clientY - last.y) / r.height) * 100;
      last = { x: m.clientX, y: m.clientY };
      setV((cur) => keepInside({ ...cur, cx: cur.cx - dx / cur.z, cy: cur.cy - dy / cur.z }));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return {
    zoom: v.z,
    ref,
    moved,
    onPointerDown,
    zoomIn: () => zoomAt(1.6),
    zoomOut: () => zoomAt(1 / 1.6),
    reset: () => setV({ z: 1, cx: 50, cy: 50 }),
    /** map % position -> where it is drawn now */
    project: (p: { x: number; y: number }) => ({ x: 50 + (p.x - v.cx) * v.z, y: 50 + (p.y - v.cy) * v.z }),
  };
}
