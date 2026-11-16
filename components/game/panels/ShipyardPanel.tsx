"use client";

import { isAutoOn, queueShipBody, SHIP_TYPES, toggleAutoBody } from "@/lib/api/game/commands";
import type { AutoOrderDto } from "@/lib/api/adapters/schemas";
import { ShipIcon } from "@/components/game/shell/ShipIcon";
import { CommandButtons, type CommandOption } from "@/components/game/commands/CommandButtons";

/** Buttons to queue one ship of each type at the picked planet. */
export function ShipyardPanel({ gameId, planetId, auto = [] }: { gameId: string; planetId: string; auto?: AutoOrderDto[] }) {
	const options: CommandOption[] = SHIP_TYPES.map((ship) => ({
		label: `Build ${ship}`,
		icon: <ShipIcon ship={ship} />,
		body: queueShipBody(planetId, ship),
		auto: { on: isAutoOn(auto, { ship }), toggle: toggleAutoBody(planetId, { ship }) },
	}));

	return (
		<section className="panel" aria-label="Shipyard">
			<h3>Shipyard</h3>
			<CommandButtons gameId={gameId} options={options} />
		</section>
	);
}
