"use client";

import { type BuildingName, buildBuildingBody, ELEMENTS, type ElementName, isAutoOn, toggleAutoBody } from "@/lib/api/game/commands";
import { ElementIcon } from "@/components/game/shell/ElementIcon";
import { CommandButtons, type CommandOption } from "@/components/game/commands/CommandButtons";
import { ShipyardPanel } from "@/components/game/panels/ShipyardPanel";
import { UpgradePanel } from "@/components/game/panels/UpgradePanel";
import { HoldingSummary, QueueList } from "@/components/game/panels/QueuePanel";
import type { HoldingDto, PlanetInfoDto } from "@/lib/api/adapters/schemas";

type BuildOption = { label: string; building: BuildingName; element?: ElementName };

const BUILD_OPTIONS: BuildOption[] = [
	...ELEMENTS.map((element): BuildOption => ({ label: `Mine ${element}`, building: "Mine", element })),
];

function RichnessList({ richness }: { richness: Record<string, number> }) {
	const entries = Object.entries(richness);

	if (entries.length === 0) return <p className="dim">No ore here.</p>;

	return (
		<ul>
			{entries.map(([element, value]) => (
				<li key={element}>
					<ElementIcon element={element} size={20} /> {`${element}: ${value}`}
				</li>
			))}

		</ul>
	);
}

/** Build buttons for one planet, one per building option. */
function BuildButtons({ gameId, planetId, holding }: { gameId: string; planetId: string; holding: HoldingDto }) {
	const options = BUILD_OPTIONS.map((option): CommandOption => {
		const what = option.element ? { element: option.element } : undefined;

		return {
			label: option.label,
			icon: option.element && <ElementIcon element={option.element} size={20} />,
			body: buildBuildingBody(planetId, option.building, option.element),
			auto: what && { on: isAutoOn(holding.auto, what), toggle: toggleAutoBody(planetId, what) },
		};
	});

	return <CommandButtons gameId={gameId} options={options} />;
}

type BaseControlsProps = { gameId: string; planetId: string; holding: HoldingDto; gameTime: number };

/** Queue, build, ship and upgrade controls; only shown on a planet where the player has a base. */
function BaseControls({ gameId, planetId, holding, gameTime }: BaseControlsProps) {
	return (
		<>
			<QueueList gameId={gameId} planetId={planetId} holding={holding} gameTime={gameTime} />
			<BuildButtons gameId={gameId} planetId={planetId} holding={holding} />
			{holding.shipyardLevel > 0 && <ShipyardPanel gameId={gameId} planetId={planetId} auto={holding.auto} />}
			<p className="dim">Right-click a mine or ship button to put it on auto: it repeats whenever the planet is idle and you can pay.</p>
			<UpgradePanel gameId={gameId} planetId={planetId} holding={holding} />
		</>
	);
}

type PlanetDetailsProps = { gameId: string; planet: PlanetInfoDto; holding?: HoldingDto; gameTime?: number };

/** Details of the picked planet: name, owner, richness, buildings, ships, the queue and the build orders. */
export function PlanetDetails({ gameId, planet, holding, gameTime = 0 }: PlanetDetailsProps) {
	return (
		<section className="panel" aria-label="Planet">
			<h2>{planet.name}</h2>
			{planet.isObjective && <p className="good">Objective planet</p>}
			<RichnessList richness={planet.richness} />
			<HoldingSummary holding={holding} />
			{holding && <BaseControls gameId={gameId} planetId={planet.id} holding={holding} gameTime={gameTime} />}
		</section>
	);
}
