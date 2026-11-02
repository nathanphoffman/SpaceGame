import { BODY_BY_SEED } from "@/lib/data/catalog";
import { applyLook } from "@/lib/data/realBodies";
import type { BodySpec } from "@/lib/data/types";
import { mulberry32 } from "./noise";
import type { PlanetKind, PlanetParams, RgbColor } from "./types";

// Deterministic planet generation: the same seed always gives the same world.
// Pure functions only (no three.js) so it can be used on the server or in scripts.
// The random numbers must be drawn in the same order as always, or every existing world would change its look.

type Range = (low: number, high: number) => number;
type Jitter = (color: RgbColor, amount?: number) => RgbColor;

const KIND_ROLLS: [number, PlanetKind][] = [
	[0.25, "rocky"],
	[0.5, "moon"],
	[0.7, "gas"],
	[0.85, "ice"],
]; // 25% rocky, 25% moon, 20% gas, 15% ice, the rest desert

const BUMP_MAX: Record<PlanetKind, number> = {
	moon: 0.08,
	rocky: 0.13,
	desert: 0.12,
	ice: 0.06,
	gas: 0,
};

const CRATER_MAX: Record<PlanetKind, number> = {
	moon: 80,
	rocky: 20,
	desert: 30,
	ice: 25,
	gas: 0,
};

const ATMOSPHERE_CHANCE: Record<PlanetKind, number> = {
	rocky: 0.8,
	ice: 0.4,
	desert: 0.5,
	moon: 0,
	gas: 1,
};

const RING_CHANCE: Record<PlanetKind, number> = {
	gas: 0.65,
	ice: 0.25,
	rocky: 0.1,
	desert: 0.1,
	moon: 0.05,
};

const ATMOSPHERE_COLOR: Record<PlanetKind, RgbColor> = {
	rocky: [0.4, 0.65, 1],
	ice: [0.7, 0.85, 1],
	desert: [1, 0.7, 0.45],
	moon: [1, 1, 1],
	gas: [0.9, 0.8, 0.6],
};

const PALETTES: Record<PlanetKind, { low: RgbColor; high: RgbColor }> = {
	rocky: { low: [0.2, 0.48, 0.2], high: [0.55, 0.45, 0.35] },
	moon: { low: [0.34, 0.34, 0.35], high: [0.7, 0.69, 0.67] },
	desert: { low: [0.55, 0.3, 0.15], high: [0.88, 0.68, 0.42] },
	ice: { low: [0.6, 0.75, 0.86], high: [0.96, 0.98, 1] },
	gas: { low: [0.7, 0.55, 0.35], high: [0.9, 0.8, 0.6] },
};

const SEED_MULTIPLIER = 7919;
const SEED_OFFSET = 17;
const DEFAULT_JITTER = 0.08;
const HALF = 0.5;
const OCEAN_COLOR: RgbColor = [0.1, 0.25, 0.5];
const OCEAN_JITTER = 0.05;
const RING_COLOR: RgbColor = [0.75, 0.7, 0.62];
const RING_JITTER = 0.1;
const MAX_RING_RADIUS_SHARE = 1.9; // rings reach at most this many planet radii
const RING_INNER_RANGE: [number, number] = [1.25, 1.5]; // where the rings start, in planet radii
const RING_WIDTH_RANGE: [number, number] = [0.4, 0.8]; // how wide the rings are, in planet radii
const RING_TILT_RANGE: [number, number] = [-0.5, 0.5];
const MAX_NOISE_OFFSET = 1000;
const TILT_RANGE: [number, number] = [-0.45, 0.45]; // axial tilt in radians
const SPIN_RANGE: [number, number] = [0.08, 0.3]; // radians per second
const SEA_LEVEL_RANGE: [number, number] = [0.4, 0.55]; // only rocky worlds have oceans
const NOISE_SCALE_RANGE: [number, number] = [1.2, 2.6];
const BAND_FREQUENCY_RANGE: [number, number] = [5, 12];
const BUMP_EXPONENT = 0.8; // below 1 makes bumpy worlds more common
const CRATER_COUNT_EXPONENT = 1.2;
const CRATER_SIZE_EXPONENT = 2.5; // above 1 makes big craters rare
const CRATER_MIN_SIZE = 0.05;
const CRATER_SIZE_SPREAD = 0.28;
const CRATER_MIN_DEPTH = 0.02;
const CRATER_DEPTH_SPREAD = 0.05;
const NO_OCEAN = -1;

// the radius range of each kind of planet, in the order the random numbers are drawn (all five are always drawn)
const RADIUS_RANGES: Record<PlanetKind, [number, number]> = {
	moon: [0.45, 0.8],
	rocky: [0.7, 1.15],
	desert: [0.7, 1.1],
	ice: [0.65, 1.1],
	gas: [1.1, 1.45],
};

// gas-giant band colours: a base tone and three variations, each with how far the colour may drift
const BAND_COLORS: { color: RgbColor; jitter: number }[] = [
	{ color: [0.72, 0.58, 0.4], jitter: 0.15 },
	{ color: [0.9, 0.82, 0.65], jitter: 0.12 },
	{ color: [0.55, 0.4, 0.3], jitter: 0.12 },
	{ color: [0.8, 0.7, 0.55], jitter: 0.12 },
];

// the first kind whose roll limit is above the roll; anything above the last limit is a desert
const kindFromRoll = (roll: number): PlanetKind =>
	KIND_ROLLS.find(([limit]) => roll < limit)?.[1] ?? "desert";

/** every kind's radius is drawn (to keep the random sequence fixed) and the planet's own kind is used */
function radiusFor(kind: PlanetKind, range: Range) {
	const radii = Object.fromEntries(
		Object.entries(RADIUS_RANGES).map(([name, [low, high]]) => [
			name,
			range(low, high),
		]),
	);

	return radii[kind];
}

/** craters are spread over the sphere at random; a few are big and deep */
function makeCraters(count: number, random: () => number) {
	return Array.from({ length: count }, () => {
		const height = random() * 2 - 1,
			angle = random() * Math.PI * 2,
			ring = Math.sqrt(1 - height * height);
		const bigness = random() ** CRATER_SIZE_EXPONENT;

		return {
			dir: [ring * Math.cos(angle), height, ring * Math.sin(angle)] as RgbColor,
			size: CRATER_MIN_SIZE + bigness * CRATER_SIZE_SPREAD,
			depth: CRATER_MIN_DEPTH + bigness * CRATER_DEPTH_SPREAD,
		};
	});
}

/** four gas-giant band colours: a base tone and three variations */
function makeBands(jitter: Jitter): RgbColor[] {
	return BAND_COLORS.map((band) => jitter(band.color, band.jitter));
}

function makeRings(
	radius: number,
	inner: number,
	range: Range,
	jitter: Jitter,
	random: () => number,
) {
	return {
		inner,
		outer: Math.min(
			inner + radius * range(...RING_WIDTH_RANGE),
			radius * MAX_RING_RADIUS_SHARE,
		),
		tilt: range(...RING_TILT_RANGE),
		color: jitter(RING_COLOR, RING_JITTER),
		seed: Math.floor(random() * MAX_NOISE_OFFSET),
	};
}

export function planetParams(seed: number): PlanetParams {
	const real: BodySpec | undefined = BODY_BY_SEED.get(seed); // real bodies pin kind, size and (if known) look to the data
	const random = mulberry32(seed * SEED_MULTIPLIER + SEED_OFFSET);

	const range: Range = (low, high) => low + (high - low) * random();

	// nudge each colour channel by up to +-amount at random and keep it within 0..1
	const jitter: Jitter = (color, amount = DEFAULT_JITTER) =>
		color.map((channel) =>
			Math.min(1, Math.max(0, channel + (random() - HALF) * amount * 2)),
		) as RgbColor;

	const roll = random(); // always drawn, even for real bodies, so their other values stay the same
	const kind = real?.kind ?? kindFromRoll(roll);
	const radius = radiusFor(kind, range);
	const bump = BUMP_MAX[kind] * random() ** BUMP_EXPONENT;
	const craterCount =
		real?.look?.craters ??
		Math.floor(CRATER_MAX[kind] * random() ** CRATER_COUNT_EXPONENT);
	const craters = makeCraters(craterCount, random);
	const bands = makeBands(jitter);
	const hasRings = random() < RING_CHANCE[kind];
	const inner = radius * range(...RING_INNER_RANGE);

	const params: PlanetParams = {
		kind,
		radius,
		bump,
		craters,
		seaLevel: kind === "rocky" ? range(...SEA_LEVEL_RANGE) : NO_OCEAN,
		noiseScale: range(...NOISE_SCALE_RANGE),
		noiseOffset: Math.floor(random() * MAX_NOISE_OFFSET),
		low: jitter(PALETTES[kind].low),
		high: jitter(PALETTES[kind].high),
		ocean: jitter(OCEAN_COLOR, OCEAN_JITTER),
		bands,
		bandFreq: range(...BAND_FREQUENCY_RANGE),
		atmosphere:
			random() < ATMOSPHERE_CHANCE[kind] ? ATMOSPHERE_COLOR[kind] : null, // only some planets get an atmosphere
		rings: hasRings ? makeRings(radius, inner, range, jitter, random) : null,
		tilt: range(...TILT_RANGE),
		spin: range(...SPIN_RANGE),
	};

	return real ? applyLook(params, real) : params;
}
