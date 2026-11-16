import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYSTEMS } from "@/lib/data/catalog";
import { describePlanet, planetName } from "@/lib/planets/names";
import { fbm, mulberry32, noise3 } from "@/lib/planets/noise";
import { planetParams } from "@/lib/planets/planetParams";
import { equilibriumTempK, planetStats } from "@/lib/planets/planetStats";
import { starParams } from "@/lib/planets/starParams";

const SEEDS = Array.from({ length: 40 }, (_, index) => index * 997 + 1);

describe("noise", () => {
	it("repeats the same numbers for the same seed", () => {
		const first = mulberry32(5),
			second = mulberry32(5);
		expect([first(), first(), first()]).toEqual([second(), second(), second()]);
	});

	it("keeps noise between 0 and 1", () => {
		for (let step = 0; step < 50; step++) {
			expect(
				noise3(step * 0.37, step * 0.11, step * 0.73, 4),
			).toBeGreaterThanOrEqual(0);

			expect(
				noise3(step * 0.37, step * 0.11, step * 0.73, 4),
			).toBeLessThanOrEqual(1);

			expect(fbm(step * 0.3, step * 0.2, step * 0.1, 9)).toBeLessThanOrEqual(1);
		}
	});
});

describe("planet generation", () => {
	it("gives the same planet for the same seed", () => {
		for (const seed of SEEDS)
			expect(planetParams(seed)).toEqual(planetParams(seed));
	});

	it("keeps planets within their size and bumpiness limits", () => {
		for (const seed of SEEDS) {
			const params = planetParams(seed);
			expect(params.radius).toBeGreaterThan(0.4);
			expect(params.radius).toBeLessThan(1.5);
			expect(params.bump).toBeGreaterThanOrEqual(0);
			expect(params.bands).toHaveLength(4);
		}
	});

	it("makes compositions that add up to 100", () => {
		for (const seed of SEEDS) {
			const total = planetStats(seed).composition.reduce(
				(sum, part) => sum + part.pct,
				0,
			);

			expect(total).toBeCloseTo(100, 0);
		}
	});

	it("knows Earth's real size and make-up", () => {
		const body = SYSTEMS.find((system) => system.name === "Sol")!.bodies.find(
			(candidate) => candidate.name === "Earth",
		)!;

		const earth = planetStats(body.seed);
		expect(earth.diameterKm).toBe(12742);
		expect(earth.earths).toBe(1);
		expect(earth.composition[0].symbol).toBe("Fe");
	});

	it("describes planets in words and names them", () => {
		expect(describePlanet(planetParams(7)).type.length).toBeGreaterThan(0);
		expect(planetName(7)).toBe(planetName(7));
		expect(planetName(7)[0]).toBe(planetName(7)[0].toUpperCase());
	});
});

describe("stars", () => {
	it("makes hotter stars bluer and bigger giants brighter", () => {
		for (const seed of SEEDS) {
			const star = starParams(seed);
			expect(star.temp).toBeGreaterThan(0);
			expect(star.radius).toBeGreaterThan(0);
			expect(star.color.every((channel) => channel >= 0 && channel <= 1)).toBe(
				true,
			);
		}
	});

	it("warms planets nearer the star more", () => {
		const sun = { radius: 1, temp: 5772 };
		expect(equilibriumTempK(sun, 0.5)).toBeGreaterThan(
			equilibriumTempK(sun, 2),
		);

		expect(equilibriumTempK(sun, 1)).toBeCloseTo(278, 0);
	});
});

describe("generated worlds never change", () => {
	// recorded from the generator when it was first written: if these differ, every saved game's planets would look different
	const recorded = JSON.parse(
		readFileSync(new URL("../fixtures/planets.json", import.meta.url), "utf8"),
	);

	it("keeps every planet, composition and star exactly as recorded", () => {
		recorded.seeds.forEach((seed: number, index: number) => {
			expect(JSON.parse(JSON.stringify(planetParams(seed)))).toEqual(
				recorded.params[index],
			);

			expect(JSON.parse(JSON.stringify(planetStats(seed)))).toEqual(
				recorded.stats[index],
			);

			expect(JSON.parse(JSON.stringify(starParams(seed)))).toEqual(
				recorded.stars[index],
			);
		});
	});
});
