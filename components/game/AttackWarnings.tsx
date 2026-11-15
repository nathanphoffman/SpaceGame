import type { FleetViewDto } from "@/lib/api/adapters/schemas";
import type { FleetSpottedEvent } from "@/lib/api/gameEvents";
import { formatDuration } from "@/lib/api/fleetOrders";

type Props = {
	fleets: FleetViewDto[];
	gameTime: number;
	spotted: Record<string, FleetSpottedEvent>;
};

/** Enemy fleets still on their way. The strength hint only arrives with the FleetSpotted event. */
export function AttackWarnings({ fleets, gameTime, spotted }: Props) {
	const incoming = fleets.filter((fleet) => fleet.side === "Enemy" && fleet.arriveAt > gameTime);

	if (incoming.length === 0) return null;

	return (
		<section className="panel" role="alert" aria-label="Incoming attacks">
			<h3>Incoming attacks</h3>
			<ul>
				{incoming.map((fleet) => (
					<li key={fleet.id}>
						{`Enemy fleet heading for ${fleet.to}, arrives in ${formatDuration(fleet.arriveAt - gameTime)}`}
						{spotted[fleet.id] && ` (strength: ${spotted[fleet.id].strengthHint})`}
					</li>
				))}

			</ul>
		</section>
	);
}
