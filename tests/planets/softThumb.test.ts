import { describe, expect, it } from "vitest";
import { planetExtent } from "@/components/planet/planetColors";
import { renderPlanetPixels } from "@/components/planet/softThumb";
import { planetParams } from "@/lib/planets/planetParams";

const SIZE = 64;
const FRAME_MARGIN = 1.05;
const CHANNELS = 4;
const ALPHA = 3;
const SEEDS = Array.from({ length: 60 }, (_, index) => index * 7919 + 13);

const draw = (seed: number) => {
	const params = planetParams(seed);

	return { params, pixels: renderPlanetPixels(params, seed, SIZE, planetExtent(params) * FRAME_MARGIN) };
};

const alphaAt = (pixels: Uint8ClampedArray, column: number, row: number) => pixels[(row * SIZE + column) * CHANNELS + ALPHA];

describe("software planet thumbnails", () => {
	it("draws the same picture for the same seed", () => {
		expect(draw(42).pixels).toEqual(draw(42).pixels);
	});

	it("is solid in the middle and clear in the corners", () => {
		for (const seed of SEEDS) {
			const { pixels } = draw(seed);
			expect(alphaAt(pixels, SIZE / 2, SIZE / 2)).toBe(255);
			expect(alphaAt(pixels, 0, 0)).toBe(0);
			expect(alphaAt(pixels, SIZE - 1, SIZE - 1)).toBe(0);
		}
	});

	it("draws a ringed planet wider than its body", () => {
		const ringed = SEEDS.map(draw).find(({ params }) => params.rings);
		expect(ringed).toBeDefined();
		const body = Math.round(((ringed!.params.radius / (planetExtent(ringed!.params) * FRAME_MARGIN)) * SIZE) / 2);
		const edgeBeyondBody = Array.from({ length: SIZE }, (_, column) => alphaAt(ringed!.pixels, column, SIZE / 2));
		const beyond = edgeBeyondBody.slice(0, SIZE / 2 - body - 1).some((alpha) => alpha > 0);
		expect(beyond || ringed!.pixels.some((value, index) => index % CHANNELS === ALPHA && value > 0 && value < 255)).toBe(true);
	});

	it("shades the sun side lighter than the far side", () => {
		const { pixels } = draw(SEEDS[3]);

		const brightness = (column: number, row: number) => {
			const at = (row * SIZE + column) * CHANNELS;

			return pixels[at] + pixels[at + 1] + pixels[at + 2];
		};

		expect(brightness(SIZE / 2 + 8, SIZE / 2 - 6)).toBeGreaterThanOrEqual(brightness(SIZE / 2 - 8, SIZE / 2 + 6));
	});

	it("works for every kind of planet the generator makes", () => {
		const kinds = new Set(SEEDS.map((seed) => planetParams(seed).kind));
		expect(kinds.size).toBeGreaterThan(1);

		for (const seed of SEEDS) expect(draw(seed).pixels.length).toBe(SIZE * SIZE * CHANNELS);
	});
});
