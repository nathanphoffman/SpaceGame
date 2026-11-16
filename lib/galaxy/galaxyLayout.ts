const MAP_CENTRE = 50; // the map box is 0..100 %
const MAP_HALF_SPAN = 44;
const MAP_MIN = 4; // stars are kept this far from the edge
const MAP_MAX = 96;
const MIN_GAP = 3.4; // stars closer than this (in %) are pushed apart
const NUDGE_PASSES = 60;
const SAME_SPOT = 0.001; // closer than this, stars have no direction to be pushed in

type Point = { id: number; x: number; y: number };

/** Pushes every pair of stars that is closer than MIN_GAP apart, once. */
function nudgeApart(points: Point[]): void {
	for (let index = 0; index < points.length; index++) {
		for (let other = index + 1; other < points.length; other++) {
			pushPair(points[index], points[other]);
		}
	}
}

function pushPair(first: Point, second: Point): void {
	const deltaX = second.x - first.x;
	const deltaY = second.y - first.y;
	const gap = Math.hypot(deltaX, deltaY);

	if (gap >= MIN_GAP) return;
	const push = (MIN_GAP - gap) / 2;
	const [ux, uy] = gap > SAME_SPOT ? [deltaX / gap, deltaY / gap] : [1, 0];
	first.x -= ux * push;
	first.y -= uy * push;
	second.x += ux * push;
	second.y += uy * push;
}

/**
 * Where each star of one sector goes on the local map, as % of the (square) map box. Real light-year
 * positions are scaled so the whole sector fits; stars that would overlap (Alpha Centauri and Proxima
 * are 0.2 ly apart) are then nudged apart.
 */
export function mapPositions(
	systems: { id: number; x: number; y: number }[],
	centre: { x: number; y: number },
	halfWidthLy: number,
) {
	const scale = MAP_HALF_SPAN / halfWidthLy; // sector edge sits 6% in from the map edge
	const points = systems.map((s) => ({
		id: s.id,
		x: MAP_CENTRE + (s.x - centre.x) * scale,
		y: MAP_CENTRE - (s.y - centre.y) * scale,
	})); // north is up

	for (let pass = 0; pass < NUDGE_PASSES; pass++) nudgeApart(points);

	const clamp = (value: number) => Math.min(MAP_MAX, Math.max(MAP_MIN, value));

	return new Map(
		points.map((point) => [point.id, { x: clamp(point.x), y: clamp(point.y) }]),
	);
}
