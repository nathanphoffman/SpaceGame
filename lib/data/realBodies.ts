import type { BodySpec } from "@/lib/data/types";
import { ELEMENTS, type Element } from "@/lib/defs";
import type { PlanetKind, PlanetParams } from "@/lib/planets/types";

const GAS_RADIUS = {
	min: 1.0,
	max: 1.45,
	fromKm: 40000,
	perKm: 0.45,
	perKmDivisor: 100000,
}; // gas giants grow from 1.0 at 40,000 km

const ROCK_RADIUS = {
	min: 0.35,
	max: 1.25,
	base: 0.45,
	perDoubling: 0.32,
	referenceKm: 3000,
}; // other worlds grow with each doubling of diameter

/** on-screen size (game units, ~0.35 .. 1.45) from a real diameter */
export function bodyRadius(kind: PlanetKind, kilometres: number) {
	if (kind === "gas")

		return Math.min(
			GAS_RADIUS.max,
			Math.max(
				GAS_RADIUS.min,
				GAS_RADIUS.min +
					(GAS_RADIUS.perKm * (kilometres - GAS_RADIUS.fromKm)) /
						GAS_RADIUS.perKmDivisor,
			),
		);

	return Math.min(
		ROCK_RADIUS.max,
		Math.max(
			ROCK_RADIUS.min,
			ROCK_RADIUS.base +
				ROCK_RADIUS.perDoubling *
					Math.log2(kilometres / ROCK_RADIUS.referenceKm),
		),
	);
}

/** "Fe30 O28 Si18" -> composition list, biggest share first */
export function parseComposition(text: string) {
	return text
		.split(/\s+/) // split on any run of whitespace
		.map((token) => {
			// split the composition text like "Fe30 O28" on spaces
			// split a token such as Fe30 into its element letters and its percentage
			const [, symbol, percent] = /^([A-Za-z]+)([\d.]+)$/.exec(token)!;

			return {
				symbol,
				name: ELEMENTS[symbol as Element].name,
				pct: Number(percent),
			};
		})
		.sort((first, second) => second.pct - first.pct);
}

/** Pin a seeded random world to what we know about a real one. Bodies with a `look` are fully specified. */
export function applyLook(params: PlanetParams, body: BodySpec): PlanetParams {
	const radius = body.radius;
	const L = body.look;

	if (!L) return { ...params, radius };

	return {
		...params,
		radius,
		label: L.label,
		low: L.low ?? params.low,
		high: L.high ?? params.high,
		ocean: L.ocean ?? params.ocean,
		bands: L.bands ?? params.bands,
		atmosphere: L.atmosphere ?? null,
		seaLevel: L.seaLevel ?? -1,
		bump: L.bump ?? params.bump,
		rings: L.rings
			? {
					inner: radius * L.rings.inner,
					outer: radius * L.rings.outer,
					tilt: L.rings.tilt,
					color: L.rings.color,
					seed: params.noiseOffset,
				}

			: null,
	};
}
