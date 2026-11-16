import { fleetIcon } from "@/components/ui";
import { FLEET_CLASS, FLEET_ENEMY_CLASS } from "@/lib/constants";
import type { FleetDTO } from "@/lib/defs";
import { countdownText, prepLeftMs } from "@/lib/galaxy/flight";

/** class for the fleet's span: enemy fleets get their own colour */
export const fleetClass = (fleet: FleetDTO) => (fleet.hostile ? FLEET_ENEMY_CLASS : FLEET_CLASS);

/** the fleet icon, with the prep countdown under it while it waits at its origin */
export default function FleetMark({ fleet, nowMs, angle }: { fleet: FleetDTO; nowMs: number; angle: number }) {
	const prep = prepLeftMs(fleet, nowMs);

	return (
		<>
			<img src={fleetIcon(fleet)} alt="" />
			{prep > 0 && (
				<small className="fleet-prep" style={{ transform: `rotate(${-angle}deg)` }}>
					{countdownText(prep)}
				</small>
			)}

		</>
	);
}
