"use client";

import { queueShipBody, SHIP_TYPES, startUpgradeBody, UPGRADE_TYPES } from "@/lib/api/commands";
import { CommandButtons, type CommandOption } from "./CommandButtons";

/** Buttons to queue one ship of each type at the picked planet. */
export function ShipyardPanel({ gameId, planetId }: { gameId: string; planetId: string }) {
	const options: CommandOption[] = SHIP_TYPES.map((ship) => ({ label: `Build ${ship}`, body: queueShipBody(planetId, ship) }));

	return (
		<section className="panel" aria-label="Shipyard">
			<h3>Shipyard</h3>
			<CommandButtons gameId={gameId} options={options} />
		</section>
	);
}

/** Buttons to start each of the four team upgrades, with the current level when the server sends it. */
export function UpgradePanel({ gameId, levels = {} }: { gameId: string; levels?: Record<string, number> }) {
	const options: CommandOption[] = UPGRADE_TYPES.map((upgrade) => ({
		label: `Upgrade ${upgrade} (level ${levels[upgrade] ?? 0})`,
		body: startUpgradeBody(upgrade),
	}));

	return (
		<section className="panel" aria-label="Upgrades">
			<h3>Upgrades</h3>
			<CommandButtons gameId={gameId} options={options} />
		</section>
	);
}
