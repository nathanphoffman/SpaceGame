/**
 * Where each star goes on the galaxy map, as % of the map box. Real light-year positions are scaled
 * uniformly to fit, then stars that would overlap (Alpha Centauri and Proxima are 0.2 ly apart) are nudged apart.
 */
export function mapPositions(systems: { id: number; x: number; y: number }[], aspect = 1.6) {
  const W = 100 * aspect; // map width in "percent of height" units, so distances stay isotropic
  const xs = systems.map((s) => s.x), ys = systems.map((s) => s.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min((0.86 * W) / Math.max(1, maxX - minX), 84 / Math.max(1, maxY - minY));
  const pts = systems.map((s) => ({
    id: s.id,
    x: W / 2 + (s.x - (minX + maxX) / 2) * scale,
    y: 50 - (s.y - (minY + maxY) / 2) * scale, // north (+y) is up
  }));

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
  return new Map(pts.map((p) => [p.id, { x: clamp((p.x / W) * 100), y: clamp(p.y) }]));
}
