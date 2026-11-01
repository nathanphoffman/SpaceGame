import type { FleetDTO, GameState } from "./defs";

const planetOf = (game: GameState, id: number) => game.planets.find((p) => p.id === id)!;

/** fleets currently in the air (not guarding a planet) */
export const flyingFleets = (game: GameState) => game.fleets.filter((fleet) => fleet.status === "outbound" || fleet.status === "returning");

export const isCrossSystem = (game: GameState, fleet: FleetDTO) =>
  planetOf(game, fleet.originId).systemId !== planetOf(game, fleet.targetId).systemId;

/** flight progress 0..1 and the planets it is currently travelling between */
export function flightOf(game: GameState, fleet: FleetDTO, now: number) {
  const o = planetOf(game, fleet.originId);
  const t = planetOf(game, fleet.targetId);
  const [from, to, a, b] = fleet.status === "outbound" ? [o, t, fleet.departAt, fleet.arriveAt] : [t, o, fleet.arriveAt, fleet.returnAt];
  return { from, to, k: Math.min(1, Math.max(0, (now - a) / (b - a))) };
}
