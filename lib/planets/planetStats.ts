import { BODY_BY_SEED } from "@/lib/data/catalog";
import { parseComposition } from "@/lib/data/realBodies";
import { ELEMENTS, type Element } from "@/lib/defs";
import {
	EARTH_EQUILIBRIUM_K,
	PERCENT,
	STEFAN_BOLTZMANN_POWER,
	SUN_TEMP_K,
} from "./constants";

import { mulberry32 } from "./noise";
import { planetParams } from "./planetParams";
import type { PlanetKind, PlanetParams, PlanetStats } from "./types";

// Planets are made of the nine game elements (see ELEMENTS in defs.ts). Titanium, Uranium and
// Helium-3 are rare; very occasionally a planet is made of just one of them.

// common elements a world of each kind is likely to be made of, with rough relative abundance
const ELEMENT_POOL: Record<PlanetKind, [string, number][]> = {
	rocky: [
		["O", 10],
		["Si", 8],
		["Fe", 8],
		["Al", 5],
		["C", 3],
		["H", 2],
	],
	moon: [
		["O", 9],
		["Si", 8],
		["Fe", 6],
		["Al", 5],
		["C", 0.5],
		["H", 0.3],
	],
	desert: [
		["O", 9],
		["Si", 8],
		["Fe", 7],
		["Al", 5],
		["C", 1],
		["H", 0.5],
	],
	ice: [
		["H", 10],
		["O", 10],
		["C", 4],
		["Si", 2],
		["Fe", 1.5],
		["Al", 0.5],
	],
	gas: [
		["H", 14],
		["C", 2],
		["O", 1.5],
		["Fe", 0.2],
		["Si", 0.2],
	],
};

// chance that a world has a trace of each rare element at all (Helium-3 is mostly a gas giant thing)
const RARE_CHANCE: Record<PlanetKind, Record<string, number>> = {
	rocky: { Ti: 0.04, U: 0.012, He: 0.001 },
	moon: { Ti: 0.1, U: 0.02, He: 0.002 },
	desert: { Ti: 0.06, U: 0.015, He: 0.001 },
	ice: { Ti: 0.03, U: 0.008, He: 0.012 },
	gas: { Ti: 0.004, U: 0.003, He: 0.16 },
};

// game radius -> kilometres (Earth 12,742, Mars 6,779, Moon 3,474, Jupiter 139,820)
const KM_PER_RADIUS_UNIT: Record<PlanetKind, number> = {
	rocky: 11000,
	desert: 10500,
	ice: 10000,
	moon: 5000,
	gas: 95000,
};

const RARE = new Set(["Ti", "U", "He"]);
const WHOLE_PLANET_RARE_CHANCE = 1 / 300; // a world that is entirely one rare element
const TITANIUM_SHARE_OF_JACKPOTS = 0.7;
const EARTH_DIAMETER_KM = 12742;
const SEED_MULTIPLIER = 2246822519;
const SEED_OFFSET = 97;
const WARM_UP_DRAWS = 4;
const MIN_SHARE = 8; // every element gets at least this percent so its symbol always fits on the bar
const RARE_SHARE_FACTOR = 0.3; // rare elements only ever make up a small share
const DICE_SIDES = 6;
const GAS_ROUNDING_KM = 100; // made-up gas giants are sized to the nearest 100 km, other planets to the nearest 10
const ROCK_ROUNDING_KM = 10;
const SIZE_SPREAD = { min: 0.92, range: 0.16 }; // a made-up planet is up to 8% smaller or bigger than its look suggests
const SHARE_WEIGHT = { min: 0.3, range: 1.4 }; // each element's abundance is scaled by a random factor in this range
const TENTHS = 10; // percentages are rounded to a tenth
const LUMINOSITY_ROOT = 0.25; // temperature falls with the fourth root of luminosity

const statsCache = new Map<number, PlanetStats>();

/** a real planet's size is exact; a made-up one is sized from its look, with a little random spread */
function diameterOf(params: PlanetParams, random: () => number) {
	const round = params.kind === "gas" ? GAS_ROUNDING_KM : ROCK_ROUNDING_KM;

	return (
		Math.round(
			(params.radius *
				KM_PER_RADIUS_UNIT[params.kind] *
				(SIZE_SPREAD.min + random() * SIZE_SPREAD.range)) /
				round,
		) * round
	);
}

/** pick `count` elements from the pool, each time weighted by how common it is, without picking one twice */
function pickElements(kind: PlanetKind, count: number, random: () => number) {
	const pool = [...ELEMENT_POOL[kind]];
	const picked: [string, number][] = [];

	for (let pick = 0; pick < count && pool.length; pick++) {
		// add up the weights of the elements, so one random roll can be mapped onto them
		let roll = random() * pool.reduce((total, [, weight]) => total + weight, 0);
		const chosen = pool.findIndex(([, weight]) => (roll -= weight) < 0);
		picked.push(pool.splice(chosen < 0 ? 0 : chosen, 1)[0]);
	}

	return picked;
}

/** turn the picked elements into percentages that add up to exactly 100, biggest first */
function composeShares(picked: [string, number][], random: () => number) {
	const rawAmounts = picked.map(
		([symbol, weight]) =>
			weight *
			(SHARE_WEIGHT.min + random() * SHARE_WEIGHT.range) *
			(RARE.has(symbol) ? RARE_SHARE_FACTOR : 1),
	);

	// add up the raw amounts so each can be turned into a percentage
	const total = rawAmounts.reduce((sum, value) => sum + value, 0);
	const shares = rawAmounts.map(
		(value) =>
			Math.round(
				(MIN_SHARE + (value / total) * (PERCENT - MIN_SHARE * picked.length)) *
					TENTHS,
			) / TENTHS,
	);

	shares[0] =
		Math.round(
			(shares[0] + (PERCENT - shares.reduce((sum, value) => sum + value, 0))) * // fold rounding leftovers into the first share
				TENTHS,
		) / TENTHS; // sum to exactly 100

	return picked
		.map(([symbol], index) => ({
			symbol,
			name: ELEMENTS[symbol as Element].name,
			pct: shares[index],
		}))
		.sort((first, second) => second.pct - first.pct);
}

function buildStats(seed: number, params: PlanetParams): PlanetStats {
	const real = BODY_BY_SEED.get(seed);

	if (real?.composition) {
		return {
			diameterKm: real.diameterKm,
			earths: real.diameterKm / EARTH_DIAMETER_KM,
			composition: parseComposition(real.composition),
		};
	}

	const random = mulberry32(seed * SEED_MULTIPLIER + SEED_OFFSET);

	for (let draw = 0; draw < WARM_UP_DRAWS; draw++) random();

	const diameterKm = real ? real.diameterKm : diameterOf(params, random);
	const earths = diameterKm / EARTH_DIAMETER_KM;

	if (random() < WHOLE_PLANET_RARE_CHANCE) {
		// very rarely the whole planet is one rare element: a jackpot world
		const symbol =
			params.kind === "gas"
				? "He"
				: random() < TITANIUM_SHARE_OF_JACKPOTS
					? "Ti" // pick the element symbol by planet type
					: "U"; // gas giants hold helium; other planets titanium or uranium

		return {
			diameterKm,
			earths,
			composition: [
				{ symbol, name: ELEMENTS[symbol as Element].name, pct: PERCENT },
			],
		};
	}

	// 1d6 predominant elements; each share is its natural abundance times a random factor,
	// so a gas giant is still mostly H/He but the exact ratios differ world to world
	const dice = Math.max(2, 1 + Math.floor(random() * DICE_SIDES)); // a d6, but never a single-element planet (that is the rare jackpot case)
	const rare = Object.entries(RARE_CHANCE[params.kind])
		.filter(([, chance]) => random() < chance)
		.map(([symbol]) => symbol);
	const picked = pickElements(
		params.kind,
		Math.max(1, dice - rare.length),
		random,
	);

	for (const symbol of rare) picked.push([symbol, 1]);

	return { diameterKm, earths, composition: composeShares(picked, random) };
}

/** size and make-up of a planet, worked out once per seed */
export function planetStats(seed: number): PlanetStats {
	const cached = statsCache.get(seed);

	if (cached) return cached;

	const stats = buildStats(seed, planetParams(seed));
	statsCache.set(seed, stats);

	return stats;
}

/** Rough equilibrium temperature (Kelvin) at `orbitAU` from a star. */
export function equilibriumTempK(
	star: { radius: number; temp: number },
	orbitAU: number,
) {
	const luminosity =
		star.radius *
		star.radius *
		(star.temp / SUN_TEMP_K) ** STEFAN_BOLTZMANN_POWER; // solar units

	return (
		(EARTH_EQUILIBRIUM_K * luminosity ** LUMINOSITY_ROOT) / Math.sqrt(orbitAU)
	);
}
