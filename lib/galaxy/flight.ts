import { type FleetDTO, type GameState, FLEET_STATUS } from "@/lib/defs";

// find a planet by id; every fleet refers to planets that are loaded
const planetOf = (game: GameState, id: number) => game.planets.find((planet) => planet.id === id)!;

/** fleets currently in the air (not guarding a planet) */
export const flyingFleets = (game: GameState) => game.fleets.filter((fleet) => fleet.status === FLEET_STATUS.outbound || fleet.status === FLEET_STATUS.returning);

export const isCrossSystem = (game: GameState, fleet: FleetDTO) =>
  planetOf(game, fleet.originId).systemId !== planetOf(game, fleet.targetId).systemId;

/** flight progress 0..1 and the planets it is currently travelling between */
export function flightOf(game: GameState, fleet: FleetDTO, nowMs: number) {
  const o = planetOf(game, fleet.originId);
  const t = planetOf(game, fleet.targetId);
  const [from, to, a, b] = fleet.status === FLEET_STATUS.outbound ? [o, t, fleet.departAt, fleet.arriveAt] : [t, o, fleet.arriveAt, fleet.returnAt];

  return { from, to, k: Math.min(1, Math.max(0, (nowMs - a) / (b - a))) };
}
