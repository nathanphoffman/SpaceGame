/**
 * Where each star of one sector goes on the local map, as % of the (square) map box. Real light-year
 * positions are scaled so the whole sector fits; stars that would overlap (Alpha Centauri and Proxima
 * are 0.2 ly apart) are then nudged apart.
 */
export function mapPositions(systems: { id: number; x: number; y: number }[], centre: { x: number; y: number }, halfWidthLy: number) {
  const scale = 44 / halfWidthLy; // sector edge sits 6% in from the map edge
  const pts = systems.map((s) => ({ id: s.id, x: 50 + (s.x - centre.x) * scale, y: 50 - (s.y - centre.y) * scale })); // north is up

  const MIN_GAP = 3.4;

  for (let iter = 0; iter < 60; iter++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy);

        if (d >= MIN_GAP) continue;
        const push = (MIN_GAP - d) / 2;
        const [ux, uy] = d > 0.001 ? [dx / d, dy / d] : [1, 0];
        pts[i].x -= ux * push; pts[i].y -= uy * push;
        pts[j].x += ux * push; pts[j].y += uy * push;
      }
    }
  }

  const clamp = (v: number) => Math.min(96, Math.max(4, v));

  return new Map(pts.map((point) => [point.id, { x: clamp(point.x), y: clamp(point.y) }]));
}
