import type { FleetDTO, GameState } from "./defs";

const planetOf = (game: GameState, id: number) => game.planets.find((p) => p.id === id)!;

/** fleets currently in the air (not guarding a planet) */
export const flyingFleets = (game: GameState) => game.fleets.filter((f) => f.status === "outbound" || f.status === "returning");

export const isCrossSystem = (game: GameState, f: FleetDTO) =>
  planetOf(game, f.originId).systemId !== planetOf(game, f.targetId).systemId;

/** flight progress 0..1 and the planets it is currently travelling between */
export function flightOf(game: GameState, f: FleetDTO, now: number) {
  const o = planetOf(game, f.originId);
  const t = planetOf(game, f.targetId);
  const [from, to, a, b] = f.status === "outbound" ? [o, t, f.departAt, f.arriveAt] : [t, o, f.arriveAt, f.returnAt];
  return { from, to, k: Math.min(1, Math.max(0, (now - a) / (b - a))) };
}
