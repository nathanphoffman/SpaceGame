"use client";

import { type BuildingName, buildBuildingBody, ELEMENTS, type ElementName } from "@/lib/api/commands";
import { CommandButtons } from "./CommandButtons";
import { ShipyardPanel, UpgradePanel } from "./ShipyardPanel";
import type { PlanetInfoDto } from "@/lib/api/adapters/schemas";

type BuildOption = { label: string; building: BuildingName; element?: ElementName };

const BUILD_OPTIONS: BuildOption[] = [
	...ELEMENTS.map((element): BuildOption => ({ label: `Mine ${element}`, building: "Mine", element })),
	{ label: "Shipyard", building: "Shipyard" },
	{ label: "Defense", building: "Defense" },
];

function RichnessList({ richness }: { richness: Record<string, number> }) {
	const entries = Object.entries(richness);

	if (entries.length === 0) return <p className="dim">No ore here.</p>;

	return (
		<ul>
			{entries.map(([element, value]) => (
				<li key={element}>{`${element}: ${value}`}</li>
			))}
		</ul>
	);
}

/** Build buttons for one planet, one per building option. */
function BuildButtons({ gameId, planetId }: { gameId: string; planetId: string }) {
	const options = BUILD_OPTIONS.map((option) => ({
		label: option.label,
		body: buildBuildingBody(planetId, option.building, option.element),
	}));

	return <CommandButtons gameId={gameId} options={options} />;
}

/** Details of the picked planet: name, richness, whether it is a shared objective, and the build orders. */
export function PlanetDetails({ gameId, planet }: { gameId: string; planet: PlanetInfoDto }) {
	return (
		<section className="panel" aria-label="Planet">
			<h2>{planet.name}</h2>
			{planet.isObjective && <p className="good">Objective planet</p>}
			<RichnessList richness={planet.richness} />
			<BuildButtons gameId={gameId} planetId={planet.id} />
			<ShipyardPanel gameId={gameId} planetId={planet.id} />
			<UpgradePanel gameId={gameId} />
		</section>
	);
}
