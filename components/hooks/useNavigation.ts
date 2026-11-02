import { useState } from "react";
import { PLANET_KIND, type PlanetDTO, type SystemDTO } from "@/lib/defs";
import { CENTER } from "@/lib/galaxy/sector";

/** what the player is looking at, and the ways to change it */
export function useNavigation() {
	const [sector, setSector] = useState<[number, number]>([CENTER, CENTER]); // the sector shown on the local map
	const [atGalaxy, setAtGalaxy] = useState(false); // true = showing the grid of sectors instead of one sector
	const [systemId, setSystemId] = useState<number | null>(null); // system shown on the solar map
	const [planetId, setPlanetId] = useState<number | null>(null); // your selected base
	const [targetId, setTargetId] = useState<number | null>(null); // the planet fleets would be sent to
	const [viewId, setViewId] = useState<number | null>(null); // the planet whose details are shown
	const [view3d, setView3d] = useState(true); // solar system shown in 3D (true) or as the flat map

	const selectPlanet = (planet: PlanetDTO) => {
		setViewId(planet.id);

		if (planet.kind === PLANET_KIND.player) setPlanetId(planet.id);
		else setTargetId(planet.id);
	};

	/** picking one of your planets also moves the maps to its system and sector */
	const goToBase = (id: number, home: SystemDTO) => {
		setPlanetId(id);
		setViewId(id);
		setSystemId(home.id);
		setSector([home.sectorX, home.sectorY]);
		setAtGalaxy(false);
	};

	const openSector = (sx: number, sy: number) => {
		setSector([sx, sy]);
		setAtGalaxy(false);
	};

	const view = { sx: sector[0], sy: sector[1], system: systemId ?? undefined };

	return {
		view,
		sector,
		atGalaxy,
		systemId,
		planetId,
		targetId,
		viewId,
		view3d,
		selectPlanet,
		goToBase,
		openSector,
		setSystemId,
		setAtGalaxy,
		setViewId,
		setView3d,
	};
}

export type Navigation = ReturnType<typeof useNavigation>;
