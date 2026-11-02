import { FLEET_STATUS, type FleetDTO, type GameState } from "@/lib/defs";

// find a planet by id; every fleet refers to planets that are loaded
const planetOf = (game: GameState, planetId: number) =>
	game.planets.find((planet) => planet.id === planetId)!;

/** fleets currently in the air (not guarding a planet) */
export const flyingFleets = (game: GameState) =>
	game.fleets.filter(
		(fleet) =>
			fleet.status === FLEET_STATUS.outbound ||
			fleet.status === FLEET_STATUS.returning,
	);

export const isCrossSystem = (game: GameState, fleet: FleetDTO) =>
	planetOf(game, fleet.originId).systemId !==
	planetOf(game, fleet.targetId).systemId;

/** flight progress 0..1 and the planets it is currently travelling between */
export function flightOf(game: GameState, fleet: FleetDTO, nowMs: number) {
	const origin = planetOf(game, fleet.originId);
	const target = planetOf(game, fleet.targetId);
	const [from, destination, departure, arrival] =
		fleet.status === FLEET_STATUS.outbound
			? [origin, target, fleet.departAt, fleet.arriveAt]
			: [target, origin, fleet.arriveAt, fleet.returnAt];

	return {
		from,
		to: destination,
		k: Math.min(1, Math.max(0, (nowMs - departure) / (arrival - departure))),
	};
}
