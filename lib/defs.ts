// Shared between server and client: game rules and API types.

// ---- elements ----
// Six common building blocks and three rare ones. Planets are made of these; mines extract them.
export const ELEMENTS = {
  Fe: { name: "Iron", color: "#b5533c", rare: false },
  Si: { name: "Silicon", color: "#c9a06a", rare: false },
  Al: { name: "Aluminium", color: "#a9b4c2", rare: false },
  C: { name: "Carbon", color: "#8a8a8a", rare: false },
  O: { name: "Oxygen", color: "#ee6fb0", rare: false },
  H: { name: "Hydrogen", color: "#7fb2e5", rare: false },
  Ti: { name: "Titanium", color: "#c9a0dc", rare: true },
  U: { name: "Uranium", color: "#7fd04f", rare: true },
  He: { name: "Helium-3", color: "#5fd0c8", rare: true },
} as const;
export type Element = keyof typeof ELEMENTS;
/** display order: common first, then rare */
export const ELEMENT_ORDER = Object.keys(ELEMENTS) as Element[];

/** A bundle of resources, keyed by element symbol. */
export type Res = Record<string, number>;

// ---- buildings ----
// A planet can build a mine for each element it is made of, plus a shipyard.
export const MINE_PREFIX = "mine_";
export const mineType = (el: string) => `${MINE_PREFIX}${el}`;
export const mineElement = (type: string): Element | null => {
  const el = type.startsWith(MINE_PREFIX) ? type.slice(MINE_PREFIX.length) : null;
  return el && el in ELEMENTS ? (el as Element) : null;
};

const MINE_COST_MULT: Partial<Record<Element, number>> = { Al: 1.2, Ti: 3, U: 5, He: 8 };
const GAS_MINES = new Set(["H", "O", "He"]);
const GEM_MINES = new Set(["Si", "C"]);

export type BuildingInfo = { name: string; icon: string; cost: Res; time: number; desc: string };

export function buildingInfo(type: string): BuildingInfo | null {
  if (type === "shipyard") {
    return { name: "Shipyard", icon: "/icons/shipyard.svg", cost: { Fe: 200, Si: 100 }, time: 20, desc: "Builds ships faster per level" };
  }
  const el = mineElement(type);
  if (!el) return null;
  const m = MINE_COST_MULT[el] ?? 1;
  return {
    name: `${ELEMENTS[el].name} Mine`,
    icon: GAS_MINES.has(el) ? "/icons/gas_mine.svg" : GEM_MINES.has(el) ? "/icons/crystal_mine.svg" : "/icons/metal_mine.svg",
    cost: { Fe: Math.round(60 * m), Si: Math.round(15 * m) },
    time: Math.round(10 * Math.sqrt(m)),
    desc: `Extracts ${ELEMENTS[el].name}`,
  };
}

export const MAX_BUILDING_LEVEL = 10;

const ROMAN: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
/** 1 -> "I", 9 -> "IX", 10 -> "X" (0 has no roman numeral, so it shows as "0") */
export const toRoman = (n: number) => {
  if (n <= 0) return "0";
  let out = "";
  for (const [v, sym] of ROMAN) while (n >= v) { out += sym; n -= v; }
  return out;
};

export const buildCost = (type: string, level: number): Res => {
  const base = buildingInfo(type)!.cost;
  return Object.fromEntries(Object.entries(base).map(([el, n]) => [el, Math.round(n * 1.6 ** level)]));
};
export const buildSeconds = (type: string, level: number) => Math.round(buildingInfo(type)!.time * 1.5 ** level);

// ---- ships ----
export const SHIPS = {
  fighter: { name: "Fighter", icon: "/icons/fighter.svg", cost: { Fe: 50, Si: 20 } as Res, time: 8, attack: 5, cargo: 50 },
  cruiser: { name: "Cruiser", icon: "/icons/cruiser.svg", cost: { Fe: 200, Si: 100 } as Res, time: 25, attack: 25, cargo: 200 },
  colony_ship: { name: "Colony Ship", icon: "/icons/colony_ship.svg", cost: { Fe: 500, Si: 300 } as Res, time: 40, attack: 0, cargo: 100 },
} as const;
export type ShipType = keyof typeof SHIPS;

export const shipSeconds = (t: ShipType, shipyardLevel: number) =>
  Math.max(2, Math.round(SHIPS[t].time / (1 + 0.25 * shipyardLevel)));

// ---- production ----
/** every base trickles a little iron and silicon so nothing can soft-lock */
export const BASE_INCOME: Res = { Fe: 0.2, Si: 0.1 };
/** richer deposits (bigger share of the planet) produce more per level */
export const mineRate = (level: number, sharePct: number) => 0.4 * level * 1.1 ** level * (0.5 + sharePct / 25);

/** resources per second for a planet, given its buildings and its composition */
export function productionRates(buildings: Record<string, number>, composition: { symbol: string; pct: number }[]): Res {
  const out: Res = { ...BASE_INCOME };
  for (const [type, level] of Object.entries(buildings)) {
    const el = mineElement(type);
    if (!el || !(level > 0)) continue;
    const pct = composition.find((c) => c.symbol === el)?.pct ?? 0;
    out[el] = (out[el] ?? 0) + mineRate(level, pct);
  }
  return out;
}

export type SystemDTO = { id: number; name: string; x: number; y: number; seed: number };

type Placed = { systemId: number; orbit: number };
/** Seconds to fly between two planets: short inside a system, longer across the galaxy. */
export const flightSeconds = (a: Placed, b: Placed, systems: { id: number; x: number; y: number }[]) => {
  if (a.systemId === b.systemId) return Math.max(5, Math.round(5 + Math.abs(a.orbit - b.orbit) * 6));
  const sa = systems.find((s) => s.id === a.systemId)!;
  const sb = systems.find((s) => s.id === b.systemId)!;
  return Math.round(15 + Math.hypot(sa.x - sb.x, sa.y - sb.y) + (a.orbit + b.orbit) * 3);
};

export type PlanetDTO = {
  id: number;
  name: string;
  systemId: number;
  orbit: number; // distance from the star in AU
  kind: "player" | "npc" | "empty";
  resources: Res;
  buildings: Record<string, number>;
  ships: Record<string, number>;
  defense: number;
  seed: number;
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
  status: "outbound" | "stationed" | "returning" | "done";
  report: string;
};
export type GameState = { now: number; systems: SystemDTO[]; planets: PlanetDTO[]; queue: QueueDTO[]; fleets: FleetDTO[] };
