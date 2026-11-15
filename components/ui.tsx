import { type FleetDTO, MISSION, SHIPS, type ShipType } from "@/lib/defs";

/** orbit distance: more decimals for the tight orbits of red-dwarf planets */
const AU_DECIMALS = [
	[0.1, 3],
	[10, 2],
]; // [orbit below this, decimals shown]; further out one decimal is enough

const FAR_AU_DECIMALS = 1;

export const fmtAU = (distanceAU: number) =>
	`${distanceAU.toFixed(AU_DECIMALS.find(([limit]) => distanceAU < limit)?.[1] ?? FAR_AU_DECIMALS)} AU`;

export const SHIP_TYPES = Object.keys(SHIPS) as ShipType[];

/** icon shown for a fleet on the maps and in the fleet list */
export const fleetIcon = (fleet: FleetDTO) =>
	fleet.mission === MISSION.colonize
		? SHIPS.colony_ship.icon
		: SHIPS.fighter.icon;
