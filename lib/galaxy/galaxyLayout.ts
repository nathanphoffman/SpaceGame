const MAP_CENTRE = 50; // the map box is 0..100 %
const MAP_HALF_SPAN = 44;
const MAP_MIN = 4; // stars are kept this far from the edge
const MAP_MAX = 96;
const MIN_GAP = 3.4; // stars closer than this (in %) are pushed apart
const NUDGE_PASSES = 60;
const SAME_SPOT = 0.001; // closer than this, stars have no direction to be pushed in

/**
 * Where each star of one sector goes on the local map, as % of the (square) map box. Real light-year
 * positions are scaled so the whole sector fits; stars that would overlap (Alpha Centauri and Proxima
 * are 0.2 ly apart) are then nudged apart.
 */
export function mapPositions(systems: { id: number; x: number; y: number }[], centre: { x: number; y: number }, halfWidthLy: number) {
  const scale = MAP_HALF_SPAN / halfWidthLy; // sector edge sits 6% in from the map edge
  const pts = systems.map((s) => ({ id: s.id, x: MAP_CENTRE + (s.x - centre.x) * scale, y: MAP_CENTRE - (s.y - centre.y) * scale })); // north is up

  for (let pass = 0; pass < NUDGE_PASSES; pass++) {
    for (let index = 0; index < pts.length; index++) {
      for (let j = index + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[index].x, dy = pts[j].y - pts[index].y;
        const d = Math.hypot(dx, dy);

        if (d >= MIN_GAP) continue;
        const push = (MIN_GAP - d) / 2;
        const [ux, uy] = d > SAME_SPOT ? [dx / d, dy / d] : [1, 0];
        pts[index].x -= ux * push; pts[index].y -= uy * push;
        pts[j].x += ux * push; pts[j].y += uy * push;
      }
    }
  }

  const clamp = (value: number) => Math.min(MAP_MAX, Math.max(MAP_MIN, value));

  return new Map(pts.map((point) => [point.id, { x: clamp(point.x), y: clamp(point.y) }]));
}
