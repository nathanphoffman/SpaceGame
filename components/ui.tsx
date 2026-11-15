import {
	ELEMENTS,
	type Element,
	type FleetDTO,
	MISSION,
	MS_PER_SECOND,
	type Resources,
	SECONDS_PER_MINUTE,
	SHIPS,
	type ShipType,
} from "@/lib/defs";

import Image from "next/image";
import { ICON_BOX_PX } from "@/components/iconBox";

export const fmtTime = (milliseconds: number) => {
	const seconds = Math.max(0, Math.ceil(milliseconds / MS_PER_SECOND));

	return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}`;
};

/** orbit distance: more decimals for the tight orbits of red-dwarf planets */
const AU_DECIMALS = [
	[0.1, 3],
	[10, 2],
]; // [orbit below this, decimals shown]; further out one decimal is enough

const FAR_AU_DECIMALS = 1;

export const fmtAU = (distanceAU: number) =>
	`${distanceAU.toFixed(AU_DECIMALS.find(([limit]) => distanceAU < limit)?.[1] ?? FAR_AU_DECIMALS)} AU`;

export const elementColor = (sym: string) =>
	ELEMENTS[sym as Element]?.color ?? "#777";

export const SHIP_TYPES = Object.keys(SHIPS) as ShipType[];

/** icon shown for a fleet on the maps and in the fleet list */
export const fleetIcon = (fleet: FleetDTO) =>
	fleet.mission === MISSION.colonize
		? SHIPS.colony_ship.icon
		: SHIPS.fighter.icon;

export const Icon = ({ src, big }: { src: string; big?: boolean }) => (
	<Image unoptimized width={ICON_BOX_PX} height={ICON_BOX_PX} src={src} alt="" className={big ? "ico big" : "ico"} />
);

/** a bundle of resources as coloured element symbols, e.g. "Fe 60  Si 15" */
export const Cost = ({ cost }: { cost: Resources }) => (
	<>
		{Object.entries(cost)
			.filter(([, amount]) => amount > 0)
			.map(([symbol, n]) => (
				<span
					key={symbol}
					className="cost"
					title={ELEMENTS[symbol as Element]?.name}
				>
					<b style={{ color: elementColor(symbol) }}>{symbol}</b>{" "}
					{Math.round(n)}
				</span>
			))}

	</>
);

// renders one icon and count per ship type; the inner map builds each entry
export const ShipList = ({ ships }: { ships: Record<string, number> }) => {
	// list the ship types present, skipping those with none
	const list = Object.entries(ships).filter(([, n]) => n > 0);

	if (list.length === 0) return <>—</>;

	// one icon and count per ship type
	return (
		<>
			{list.map(([t, n]) => (
				<span key={t}>
					<Icon src={SHIPS[t as ShipType].icon} /> ×{n}{" "}
				</span>
			))}

		</>
	);
};
