import {
	ATMOSPHERE_OPACITY,
	ATMOSPHERE_SCALE,
	gasVertexColor,
	ringVertexColor,
	rockyVertex,
} from "@/components/planet/planetColors";

import type { PlanetParams, RgbColor } from "@/lib/planets/types";

// A small software renderer for planet thumbnails: it shades a sphere pixel by pixel on the CPU with the same colour
// functions as the 3D planet, so it needs no GPU and works in any browser.

type Rgba = [number, number, number, number];
type Vec3 = [number, number, number];

const CHANNELS = 4;
const BYTE_MAX = 255;
const GAMMA = 2.2; // colours are linear in the 3D scene and encoded for the screen, so they are encoded here too
const SUN: Vec3 = normalize([5, 3, 5]); // the same sun direction as the 3D scene
const AMBIENT_LIGHT = 0.11;
const SUN_LIGHT = 0.83;
const SPIN_STEPS = 628; // seed % this / 100 turns each planet to show a different side
const SPIN_DIVISOR = 100;
const HALF_EDGE_PIXEL = 0.5;
const EDGE_RING_TILT_LIMIT = 1e-3; // a ring seen exactly edge-on is invisible

function normalize([x, y, z]: Vec3): Vec3 {
	const length = Math.hypot(x, y, z);

	return [x / length, y / length, z / length];
}

/** the same point turned by `angle` around the z axis (the planet's axial tilt) */
function aroundZ([x, y, z]: Vec3, angle: number): Vec3 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);

	return [x * cos - y * sin, x * sin + y * cos, z];
}

/** the same point turned by `angle` around the y axis (the planet's spin) */
function aroundY([x, y, z]: Vec3, angle: number): Vec3 {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);

	return [x * cos + z * sin, y, -x * sin + z * cos];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** `top` painted over `bottom`, both with straight (not premultiplied) alpha */
function over(bottom: Rgba, top: Rgba): Rgba {
	const alpha = top[3] + bottom[3] * (1 - top[3]);

	if (alpha === 0) return [0, 0, 0, 0];

	const mix = (channel: number) =>
		(top[channel] * top[3] + bottom[channel] * bottom[3] * (1 - top[3])) / alpha;

	return [mix(0), mix(1), mix(2), alpha];
}

/** how much of a pixel a shape edge covers, so the silhouette is smooth: `inside` is the distance past the edge in pixels */
const coverage = (inside: number) => clamp01(inside + HALF_EDGE_PIXEL);

/** the lit colour of the planet surface where the view-space normal is `normal` */
function surfaceColor(params: PlanetParams, normal: Vec3, spin: number): RgbColor {
	const local = aroundY(aroundZ(normal, -params.tilt), -spin);
	const color =
		params.kind === "gas"
			? gasVertexColor(params, ...local)
			: rockyVertex(params, local).color;

	const sun = Math.max(0, normal[0] * SUN[0] + normal[1] * SUN[1] + normal[2] * SUN[2]);
	const light = AMBIENT_LIGHT + SUN_LIGHT * sun;

	return [color[0] * light, color[1] * light, color[2] * light];
}

/** a linear colour with an alpha, ready to be composited */
const encoded = (color: RgbColor, alpha: number): Rgba => [
	clamp01(color[0]) ** (1 / GAMMA),
	clamp01(color[1]) ** (1 / GAMMA),
	clamp01(color[2]) ** (1 / GAMMA),
	alpha,
];

type Ring = NonNullable<PlanetParams["rings"]>;

/** the ring pixel at group-local point (x, y) and how far in front of the planet's centre plane it is (`depth`), or null */
function ringAt(rings: Ring, x: number, y: number): { color: Rgba; depth: number } | null {
	const sin = Math.sin(rings.tilt);

	if (Math.abs(sin) < EDGE_RING_TILT_LIMIT) return null;

	const depth = (-y * Math.cos(rings.tilt)) / sin;
	const distance = Math.hypot(x, y, depth);

	if (distance < rings.inner || distance > rings.outer) return null;

	const [red, green, blue, alpha] = ringVertexColor(rings, distance);

	return { color: encoded([red, green, blue], alpha), depth };
}

/** one pixel of the thumbnail: back to front, atmosphere, ring behind the planet, the planet, ring in front */
function pixelAt(params: PlanetParams, x: number, y: number, pixelWorld: number, spin: number): Rgba {
	const [gx, gy] = aroundZ([x, y, 0], -params.tilt);
	const flat = Math.hypot(gx, gy);
	const radius = params.radius;
	const planetCover = coverage((radius - flat) / pixelWorld);
	const depth = Math.sqrt(Math.max(0, radius * radius - flat * flat));
	const ring = params.rings ? ringAt(params.rings, gx, gy) : null;
	let pixel: Rgba = [0, 0, 0, 0];

	if (params.atmosphere && planetCover < 1) {
		const shell = coverage((radius * ATMOSPHERE_SCALE - flat) / pixelWorld);
		pixel = over(pixel, encoded(params.atmosphere, ATMOSPHERE_OPACITY * shell));
	}

	if (ring && (planetCover === 0 || ring.depth < depth)) pixel = over(pixel, ring.color);

	if (planetCover > 0) {
		const normal: Vec3 = [x / radius, y / radius, depth / radius];
		pixel = over(pixel, encoded(surfaceColor(params, normal, spin), planetCover));
	}

	if (ring && planetCover > 0 && ring.depth >= depth) pixel = over(pixel, ring.color);

	return pixel;
}

/**
 * RGBA bytes of a `size` x `size` picture of the planet. `halfFrame` is the world distance from the picture's centre to its edge.
 * Pure and deterministic: the same seed always gives the same pixels.
 */
export function renderPlanetPixels(params: PlanetParams, seed: number, size: number, halfFrame: number): Uint8ClampedArray<ArrayBuffer> {
	const pixels = new Uint8ClampedArray(new ArrayBuffer(size * size * CHANNELS));
	const spin = (seed % SPIN_STEPS) / SPIN_DIVISOR;
	const pixelWorld = (halfFrame * 2) / size;

	for (let row = 0; row < size; row++) {
		for (let column = 0; column < size; column++) {
			const x = ((column + HALF_EDGE_PIXEL) / size * 2 - 1) * halfFrame;
			const y = (1 - (row + HALF_EDGE_PIXEL) / size * 2) * halfFrame;
			const [red, green, blue, alpha] = pixelAt(params, x, y, pixelWorld, spin);
			pixels.set([red * BYTE_MAX, green * BYTE_MAX, blue * BYTE_MAX, alpha * BYTE_MAX], (row * size + column) * CHANNELS);
		}
	}

	return pixels;
}
