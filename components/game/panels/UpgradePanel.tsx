"use client";

import { buildBuildingBody, DEFENSE, MINING, SHIPYARD } from "@/lib/api/game/commands";
import { BuildingIcon } from "@/components/game/shell/BuildingIcon";
import { CommandButtons, type CommandOption } from "@/components/game/commands/CommandButtons";
import type { HoldingDto } from "@/lib/api/adapters/schemas";

type Upgrade = { building: typeof SHIPYARD | typeof DEFENSE | typeof MINING; level: (holding: HoldingDto) => number; effect: string };

const UPGRADES: Upgrade[] = [
	{ building: DEFENSE, level: (holding) => holding.defenseLevel, effect: "each defending ship rerolls a miss once per level" },
	{ building: SHIPYARD, level: (holding) => holding.shipyardLevel, effect: "builds ships faster" },
	{ building: MINING, level: (holding) => holding.miningLevel, effect: "more output from every mine here" },
];

/** The first Defense or Shipyard is a build; every later one is an upgrade. Mining is always an upgrade. */
function labelOf(upgrade: Upgrade, level: number): string {
	if (level === 0 && upgrade.building !== MINING) return `Build ${upgrade.building}`;

	return `Upgrade ${upgrade.building} (level ${level})`;
}

/** The three upgrades of one planet. They go through the planet's queue like everything else. */
export function UpgradePanel({ gameId, planetId, holding }: { gameId: string; planetId: string; holding: HoldingDto }) {
	const options: CommandOption[] = UPGRADES.map((upgrade) => ({
		label: labelOf(upgrade, upgrade.level(holding)),
		icon: <BuildingIcon building={upgrade.building} />,
		body: buildBuildingBody(planetId, upgrade.building),
	}));

	return (
		<section className="panel" aria-label="Upgrades">
			<h3>Upgrades</h3>
			<CommandButtons gameId={gameId} options={options} />
			<ul className="dim">
				{UPGRADES.map((upgrade) => (
					<li key={upgrade.building}>{`${upgrade.building}: ${upgrade.effect}`}</li>
				))}
			</ul>
		</section>
	);
}
