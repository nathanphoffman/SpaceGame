import { BODY_BY_SEED } from "@/lib/data/catalog";
import { applyLook } from "@/lib/data/realBodies";
import type { BodySpec } from "@/lib/data/types";
import { mulberry32 } from "./noise";
import type { PlanetKind, PlanetParams, RGB } from "./types";

// Deterministic planet generation: the same seed always gives the same world.
// Pure functions only (no three.js) so it can be used on the server or in scripts.
// The random numbers must be drawn in the same order as always, or every existing world would change its look.

type Range = (low: number, high: number) => number;
type Jitter = (color: RGB, amount?: number) => RGB;

const KIND_ROLLS: [number, PlanetKind][] = [[0.25, "rocky"], [0.5, "moon"], [0.7, "gas"], [0.85, "ice"]]; // 25% rocky, 25% moon, 20% gas, 15% ice, the rest desert
const BUMP_MAX: Record<PlanetKind, number> = { moon: 0.08, rocky: 0.13, desert: 0.12, ice: 0.06, gas: 0 };
const CRATER_MAX: Record<PlanetKind, number> = { moon: 80, rocky: 20, desert: 30, ice: 25, gas: 0 };
const ATMOSPHERE_CHANCE: Record<PlanetKind, number> = { rocky: 0.8, ice: 0.4, desert: 0.5, moon: 0, gas: 1 };
const RING_CHANCE: Record<PlanetKind, number> = { gas: 0.65, ice: 0.25, rocky: 0.1, desert: 0.1, moon: 0.05 };
const ATMOSPHERE_COLOR: Record<PlanetKind, RGB> = { rocky: [0.4, 0.65, 1], ice: [0.7, 0.85, 1], desert: [1, 0.7, 0.45], moon: [1, 1, 1], gas: [0.9, 0.8, 0.6] };
const PALETTES: Record<PlanetKind, { low: RGB; high: RGB }> = {
  rocky: { low: [0.2, 0.48, 0.2], high: [0.55, 0.45, 0.35] },
  moon: { low: [0.34, 0.34, 0.35], high: [0.7, 0.69, 0.67] },
  desert: { low: [0.55, 0.3, 0.15], high: [0.88, 0.68, 0.42] },
  ice: { low: [0.6, 0.75, 0.86], high: [0.96, 0.98, 1] },
  gas: { low: [0.7, 0.55, 0.35], high: [0.9, 0.8, 0.6] },
};

const SEED_MULTIPLIER = 7919;
const SEED_OFFSET = 17;
const DEFAULT_JITTER = 0.08;
const OCEAN_COLOR: RGB = [0.1, 0.25, 0.5];
const RING_COLOR: RGB = [0.75, 0.7, 0.62];
const MAX_RING_RADIUS_SHARE = 1.9; // rings reach at most this many planet radii
const MAX_NOISE_OFFSET = 1000;

// the first kind whose roll limit is above the roll; anything above the last limit is a desert
const kindFromRoll = (roll: number): PlanetKind => KIND_ROLLS.find(([limit]) => roll < limit)?.[1] ?? "desert";

/** every kind's radius is drawn (to keep the random sequence fixed) and the planet's own kind is used */
function radiusFor(kind: PlanetKind, range: Range) {
  return { moon: range(0.45, 0.8), rocky: range(0.7, 1.15), desert: range(0.7, 1.1), ice: range(0.65, 1.1), gas: range(1.1, 1.45) }[kind];
}

/** craters are spread over the sphere at random; a few are big and deep */
function makeCraters(count: number, random: () => number) {
  return Array.from({ length: count }, () => {
    const height = random() * 2 - 1, angle = random() * Math.PI * 2, ring = Math.sqrt(1 - height * height);
    const big = Math.pow(random(), 2.5);

    return { dir: [ring * Math.cos(angle), height, ring * Math.sin(angle)] as RGB, size: 0.05 + big * 0.28, depth: 0.02 + big * 0.05 };
  });
}

/** four gas-giant band colours: a base tone and three variations */
function makeBands(jitter: Jitter): RGB[] {
  const base = jitter([0.72, 0.58, 0.4], 0.15);

  return [base, jitter([0.9, 0.82, 0.65], 0.12), jitter([0.55, 0.4, 0.3], 0.12), jitter([0.8, 0.7, 0.55], 0.12)];
}

function makeRings(radius: number, inner: number, range: Range, jitter: Jitter, random: () => number) {
  return {
    inner,
    outer: Math.min(inner + radius * range(0.4, 0.8), radius * MAX_RING_RADIUS_SHARE),
    tilt: range(-0.5, 0.5),
    color: jitter(RING_COLOR, 0.1),
    seed: Math.floor(random() * MAX_NOISE_OFFSET),
  };
}

export function planetParams(seed: number): PlanetParams {
  const real: BodySpec | undefined = BODY_BY_SEED.get(seed); // real bodies pin kind, size and (if known) look to the data
  const random = mulberry32(seed * SEED_MULTIPLIER + SEED_OFFSET);

  const range: Range = (low, high) => low + (high - low) * random();

  // nudge each colour channel by up to +-amount at random and keep it within 0..1
  const jitter: Jitter = (color, amount = DEFAULT_JITTER) => color.map((channel) => Math.min(1, Math.max(0, channel + (random() - 0.5) * amount * 2))) as RGB;

  const roll = random(); // always drawn, even for real bodies, so their other values stay the same
  const kind = real?.kind ?? kindFromRoll(roll);
  const radius = radiusFor(kind, range);
  const bump = BUMP_MAX[kind] * Math.pow(random(), 0.8);
  const craterCount = real?.look?.craters ?? Math.floor(CRATER_MAX[kind] * Math.pow(random(), 1.2));
  const craters = makeCraters(craterCount, random);
  const bands = makeBands(jitter);
  const hasRings = random() < RING_CHANCE[kind];
  const inner = radius * range(1.25, 1.5);

  const params: PlanetParams = {
    kind,
    radius,
    bump,
    craters,
    seaLevel: kind === "rocky" ? range(0.4, 0.55) : -1,
    noiseScale: range(1.2, 2.6),
    noiseOffset: Math.floor(random() * MAX_NOISE_OFFSET),
    low: jitter(PALETTES[kind].low),
    high: jitter(PALETTES[kind].high),
    ocean: jitter(OCEAN_COLOR, 0.05),
    bands,
    bandFreq: range(5, 12),
    atmosphere: random() < ATMOSPHERE_CHANCE[kind] ? ATMOSPHERE_COLOR[kind] : null, // only some planets get an atmosphere
    rings: hasRings ? makeRings(radius, inner, range, jitter, random) : null,
    tilt: range(-0.45, 0.45),
    spin: range(0.08, 0.3),
  };

  return real ? applyLook(params, real) : params;
}
