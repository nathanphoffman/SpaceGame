"use client";

import { recallFleetCommand } from "@/lib/api/game/fleetOrders";
import type { FleetViewDto } from "@/lib/api/adapters/schemas";
import { CommandButtons } from "@/components/game/commands/CommandButtons";

/** Text for how far a scouting fleet can see, from the API's `sightHops`. */
export const scoutRangeHint = (hops: number) => `Sees systems within ${hops} ${hops === 1 ? "jump" : "jumps"}.`;

/** Our fleets that are in flight, each with a recall button. */
export function FleetList({ gameId, fleets, gameTime }: { gameId: string; fleets: FleetViewDto[]; gameTime: number }) {
	const flying = fleets.filter((fleet) => fleet.side === "Team" && fleet.arriveAt > gameTime);

	return (
		<section className="panel" aria-label="Fleets in flight">
			<h3>Fleets in flight</h3>
			{flying.length === 0 && <p className="dim">No fleets in flight.</p>}
			<ul>
				{flying.map((fleet) => (
					<li key={fleet.id}>
						{`${fleet.from} to ${fleet.to}, arrives in ${fleet.arriveAt - gameTime}s`}
						{fleet.sightHops > 0 && <span className="dim">{` ${scoutRangeHint(fleet.sightHops)}`}</span>}
						<CommandButtons gameId={gameId} options={[{ label: "Recall", body: recallFleetCommand(fleet.id) }]} />
					</li>
				))}

			</ul>
		</section>
	);
}
