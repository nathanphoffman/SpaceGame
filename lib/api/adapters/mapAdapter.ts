import { type ControlKind, type FleetDTO, MS_PER_SECOND, FLEET_STATUS, MISSION, PLANET_KIND, type GameState, type PlanetDTO, type SystemDTO } from "@/lib/defs";
import { sectorOf } from "@/lib/galaxy/sector";
import type { FleetViewDto, GalaxyMapDto, PlayerViewDto } from "./schemas";

const STRONGEST_FIRST: ControlKind[] = ["Mine", "Ally", "Hostile"];

const FIRST_ORBIT_AU = 1; // the API has no orbit distance, so planets are spaced one AU apart in listed order
const HASH_MULTIPLIER = 31;
const HASH_MODULUS = 2147483647;

/** Small stable number from a string, used as the render seed so a planet always looks the same. */
export function seedOf(text: string): number {
	let hash = 0;

	for (const char of text) hash = (hash * HASH_MULTIPLIER + char.charCodeAt(0)) % HASH_MODULUS;

	return hash;
}

/** The old components use numeric ids; this keeps the API's string ids and the numbers in step. */
export type IdMap = { numberOf: (id: string) => number; idOf: (num: number) => string | undefined };

function makeIdMap(ids: string[]): IdMap {
	const numbers = new Map(ids.map((id, index) => [id, index]));

	// two lookups over the same list: id to number, and number back to id
	return { numberOf: (id) => numbers.get(id) ?? -1, idOf: (num) => ids[num] };
}

/** The control of a whole system: your own base shows first, then an ally's, then a known enemy planet. */
function systemControl(planetIds: string[], controls: Map<string, ControlKind>): ControlKind | undefined {
	const here = planetIds.map((id) => controls.get(id));

	return STRONGEST_FIRST.find((kind) => here.includes(kind));
}

function systemsOf(map: GalaxyMapDto, ids: IdMap, controls: Map<string, ControlKind>): SystemDTO[] {
	return map.systems.map((system) => {
		const [sectorX, sectorY] = sectorOf(system.x, system.y);

		return { id: ids.numberOf(system.id), name: system.name, x: system.x, y: system.y, seed: seedOf(system.id), sectorX, sectorY, control: systemControl(system.planets.map((planet) => planet.id), controls) };
	});
}

function planetsOf(map: GalaxyMapDto, ids: IdMap, controls: Map<string, ControlKind>): PlanetDTO[] {
	return map.systems.flatMap((system) => // callback: one rendered entry per item
		system.planets.map((planet, index) => ({
			id: ids.numberOf(planet.id),
			name: planet.name,
			systemId: ids.numberOf(system.id),
			orbit: FIRST_ORBIT_AU + index,
			kind: PLANET_KIND.empty,
			resources: {},
			buildings: {},
			ships: {},
			defense: 0,
			seed: seedOf(planet.id),
			control: controls.get(planet.id),
			shared: planet.isObjective,
		})),
	);
}

/** Fleet times become milliseconds on the server's clock; the map animation shifts them by a clock offset. */
function fleetOf(fleet: FleetViewDto, ids: IdMap): FleetDTO {
	return {
		id: fleet.id,
		originId: ids.numberOf(fleet.from),
		targetId: ids.numberOf(fleet.to),
		mission: MISSION.attack,
		ships: fleet.ships,
		loot: fleet.cargo,
		departAt: fleet.departAt * MS_PER_SECOND,
		arriveAt: fleet.arriveAt * MS_PER_SECOND,
		returnAt: fleet.arriveAt * MS_PER_SECOND,
		status: FLEET_STATUS.outbound,
		report: "",
		hostile: fleet.side === "Enemy",
	};
}

/** Build the GameState the existing map components take from the API's map and the player's view. */
export function toGameState(map: GalaxyMapDto, view: PlayerViewDto): { game: GameState; ids: IdMap } {
	const ids = makeIdMap(map.systems.flatMap((system) => [system.id, ...system.planets.map((planet) => planet.id)])); // planet ids may be strings, the map wants stable numbers
	const controls = new Map(view.territory.map((entry) => [entry.planet, entry.control]));
	const game: GameState = {
		nowMs: view.gameTime * MS_PER_SECOND,
		systems: systemsOf(map, ids, controls),
		planets: planetsOf(map, ids, controls),
		fleets: view.fleets.map((fleet) => fleetOf(fleet, ids)),
	};

	return { game, ids };
}
