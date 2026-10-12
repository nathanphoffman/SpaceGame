// Shared between server and client: game rules and API types.

export type Res = { metal: number; crystal: number };

export const BUILDINGS = {
  metal_mine: { name: "Metal Mine", icon: "/icons/metal_mine.svg", cost: { metal: 60, crystal: 15 }, time: 10, desc: "Produces metal" },
  crystal_mine: { name: "Crystal Mine", icon: "/icons/crystal_mine.svg", cost: { metal: 48, crystal: 24 }, time: 12, desc: "Produces crystal" },
  shipyard: { name: "Shipyard", icon: "/icons/shipyard.svg", cost: { metal: 200, crystal: 100 }, time: 20, desc: "Builds ships faster per level" },
} as const;

export const SHIPS = {
  fighter: { name: "Fighter", icon: "/icons/fighter.svg", cost: { metal: 50, crystal: 20 }, time: 8, attack: 5, cargo: 50 },
  cruiser: { name: "Cruiser", icon: "/icons/cruiser.svg", cost: { metal: 200, crystal: 100 }, time: 25, attack: 25, cargo: 200 },
  colony_ship: { name: "Colony Ship", icon: "/icons/colony_ship.svg", cost: { metal: 500, crystal: 300 }, time: 40, attack: 0, cargo: 100 },
} as const;

export type BuildingType = keyof typeof BUILDINGS;
export type ShipType = keyof typeof SHIPS;

export const buildCost = (t: BuildingType, level: number): Res => ({
  metal: Math.round(BUILDINGS[t].cost.metal * 1.6 ** level),
  crystal: Math.round(BUILDINGS[t].cost.crystal * 1.6 ** level),
});
export const buildSeconds = (t: BuildingType, level: number) => Math.round(BUILDINGS[t].time * 1.5 ** level);
export const shipSeconds = (t: ShipType, shipyardLevel: number) =>
  Math.max(2, Math.round(SHIPS[t].time / (1 + 0.25 * shipyardLevel)));

// resources per second
export const rates = (b: Record<string, number>): Res => {
  const m = b.metal_mine ?? 0;
  const c = b.crystal_mine ?? 0;
  return { metal: 0.2 + 0.4 * m * 1.1 ** m, crystal: 0.1 + 0.25 * c * 1.1 ** c };
};

export const flightSeconds = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.max(5, Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 1.2));

export type PlanetDTO = {
  id: number;
  name: string;
  x: number;
  y: number;
  kind: "player" | "npc" | "empty";
  metal: number;
  crystal: number;
  buildings: Record<string, number>;
  ships: Record<string, number>;
  defense: number;
};
export type QueueDTO = { id: string; planetId: number; kind: "building" | "ship"; type: string; startAt: number; finishAt: number };
export type FleetDTO = {
  id: string;
  originId: number;
  targetId: number;
  mission: "attack" | "colonize";
  ships: Record<string, number>;
  loot: Res;
  departAt: number;
  arriveAt: number;
  returnAt: number;
  status: "outbound" | "returning" | "done";
  report: string;
};
export type GameState = { now: number; planets: PlanetDTO[]; queue: QueueDTO[]; fleets: FleetDTO[] };
