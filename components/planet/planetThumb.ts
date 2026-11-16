import { planetExtent } from "@/components/planet/planetColors";
import { renderPlanetPixels } from "@/components/planet/softThumb";
import { planetParams } from "@/lib/planets/planetParams";

// Every planet is drawn once, on the CPU, into a small PNG, so the solar map can show many planets without a GPU or a WebGL context.
const cache = new Map<number, string>();
const SIZE = 96;
const FRAME_MARGIN = 1.05; // the planet fills this share of the frame (the rest is a margin for rings and atmosphere)

/** draws the planet once, looking at it from straight ahead, and returns the picture as a data URL */
function renderThumb(seed: number) {
	const params = planetParams(seed);
	const canvas = document.createElement("canvas");
	canvas.width = SIZE;
	canvas.height = SIZE;
	const pixels = renderPlanetPixels(params, seed, SIZE, planetExtent(params) * FRAME_MARGIN);
	canvas.getContext("2d")?.putImageData(new ImageData(pixels, SIZE, SIZE), 0, 0);

	return canvas.toDataURL("image/png");
}

export function planetThumb(seed: number): string {
	const cached = cache.get(seed);

	if (cached) return cached;

	const url = renderThumb(seed);
	cache.set(seed, url);

	return url;
}

/** Display width (px) so the planet body is `bodyPx` across, with room for rings/atmosphere. */
export function thumbDisplaySize(seed: number, bodyPx: number) {
	const p = planetParams(seed);

	return bodyPx * ((planetExtent(p) * FRAME_MARGIN) / p.radius);
}
