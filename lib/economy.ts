import {
	buildingInfo,
	ELEMENTS,
	type Element,
	mineType,
	type PlanetDTO,
	type Resources,
} from "@/lib/defs";

/** how many of an element the planet holds `seconds` after the last server update, counting what its mines produce meanwhile */
export const stockAfter =
	(planet: PlanetDTO, rate: Resources, seconds: number) => (element: string) =>
		(planet.resources[element] ?? 0) + (rate[element] ?? 0) * seconds;

/** why something can't be bought right now (undefined = it can), used for the disabled-button tooltips */
export function shortfallText(
	cost: Resources,
	stock: (element: string) => number,
) {
	const missing = Object.entries(cost)
		.filter(([element, needed]) => stock(element) < needed)
		.map(
			([element, needed]) =>
				`${Math.ceil(needed - stock(element))} more ${ELEMENTS[element as Element]?.name ?? element}`,
		);

	return missing.length
		? `Not enough resources: need ${missing.join(" and ")}`
		: undefined;
}

/** what this planet can build: a shipyard, a mine for each element it is made of, and any mines it already has */
export function buildableTypes(
	planet: PlanetDTO,
	composition: { symbol: string }[],
) {
	const mines = composition.map((part) => mineType(part.symbol));
	const existing = Object.keys(planet.buildings).filter((type) =>
		buildingInfo(type),
	);

	return Array.from(new Set(["shipyard", ...mines, ...existing]));
}
