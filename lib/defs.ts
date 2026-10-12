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
// size is the on-screen icon scale (1 = cruiser). speed and health (1-10) are shown in the UI; combat currently only uses attack and cargo.
export const SHIPS = {
  scout: { name: "Scout", icon: "/icons/scout.svg", size: 0.5, cost: { Fe: 20, Si: 10 } as Res, time: 5, attack: 1, cargo: 10, speed: 10, health: 1, desc: "Cheap and very fast, with long-range sensors and almost no weapons. Good for looking at a system before you commit a fleet." },
  fighter: { name: "Fighter", icon: "/icons/fighter.svg", size: 0.55, cost: { Fe: 50, Si: 20 } as Res, time: 8, attack: 5, cargo: 50, speed: 8, health: 2, desc: "Small, cheap and everywhere. Weak alone, but a big swarm of them adds up." },
  interceptor: { name: "Interceptor", icon: "/icons/interceptor.svg", size: 0.6, cost: { Fe: 70, Si: 30 } as Res, time: 10, attack: 8, cargo: 20, speed: 9, health: 2, desc: "A fast fighter built to hunt down small ships. Hits hard for its size but has little armor." },
  raider: { name: "Raider", icon: "/icons/raider.svg", size: 0.65, cost: { Fe: 120, Si: 70 } as Res, time: 16, attack: 12, cargo: 80, speed: 8, health: 2, desc: "A stealthy hit-and-run ship. Fast, with room to carry off loot after an attack." },
  corvette: { name: "Corvette", icon: "/icons/corvette.svg", size: 0.7, cost: { Fe: 90, Si: 40 } as Res, time: 12, attack: 8, cargo: 40, speed: 8, health: 3, desc: "A small, cheap escort. Handy for filling out a fleet without spending much." },
  frigate: { name: "Frigate", icon: "/icons/frigate.svg", size: 0.8, cost: { Fe: 140, Si: 70 } as Res, time: 18, attack: 14, cargo: 80, speed: 7, health: 4, desc: "The general-purpose warship. Balanced speed, firepower and armor at a fair price." },
  destroyer: { name: "Destroyer", icon: "/icons/destroyer.svg", size: 0.9, cost: { Fe: 170, Si: 90 } as Res, time: 22, attack: 20, cargo: 100, speed: 6, health: 5, desc: "A sturdy escort with turrets built to shoot down smaller ships before they reach the big ones." },
  cruiser: { name: "Cruiser", icon: "/icons/cruiser.svg", size: 1, cost: { Fe: 200, Si: 100 } as Res, time: 25, attack: 25, cargo: 200, speed: 5, health: 7, desc: "The all-rounder. Tough, well armed and with a decent cargo hold." },
  gunship: { name: "Gunship", icon: "/icons/gunship.svg", size: 1.05, cost: { Fe: 350, Si: 150, Al: 50 } as Res, time: 35, attack: 40, cargo: 100, speed: 3, health: 6, desc: "Slow and heavily armed, built to batter planets and stations from orbit." },
  battlecruiser: { name: "Battlecruiser", icon: "/icons/battlecruiser.svg", size: 1.15, cost: { Fe: 450, Si: 220, Al: 100 } as Res, time: 45, attack: 50, cargo: 250, speed: 5, health: 5, desc: "Cruiser speed with near-dreadnought guns. The trade-off is thin armor, so protect it." },
  carrier: { name: "Carrier", icon: "/icons/carrier.svg", size: 1.3, cost: { Fe: 700, Si: 400, Al: 150 } as Res, time: 60, attack: 15, cargo: 600, speed: 4, health: 8, desc: "A huge hull with hangar bays for smaller craft. Weak guns of its own, so keep it behind the fleet." },
  dreadnought: { name: "Dreadnought", icon: "/icons/dreadnought.svg", size: 1.45, cost: { Fe: 1200, Si: 600, Al: 300, Ti: 100 } as Res, time: 90, attack: 100, cargo: 400, speed: 3, health: 9, desc: "The heavy frontline ship. Slow and expensive, but very hard to kill and devastating up close." },
  titan: { name: "Titan", icon: "/icons/titan.svg", size: 1.6, cost: { Fe: 3000, Si: 1500, Al: 800, Ti: 400 } as Res, time: 180, attack: 250, cargo: 1000, speed: 2, health: 10, desc: "A late-game flagship. Enormous firepower and armor, and one of the most expensive things you can build." },
  miner: { name: "Miner", icon: "/icons/miner.svg", size: 0.8, cost: { Fe: 120, Si: 60 } as Res, time: 20, attack: 0, cargo: 150, speed: 4, health: 3, desc: "An unarmed mining ship that gathers resources. Keep it away from fights." },
  hauler: { name: "Hauler", icon: "/icons/hauler.svg", size: 1.05, cost: { Fe: 250, Si: 100 } as Res, time: 30, attack: 0, cargo: 1000, speed: 4, health: 4, desc: "An unarmed freighter with a very large cargo hold, for moving resources between planets." },
  troop_transport: { name: "Troop Transport", icon: "/icons/troop_transport.svg", size: 0.9, cost: { Fe: 200, Si: 100 } as Res, time: 30, attack: 2, cargo: 300, speed: 5, health: 4, desc: "Carries ground troops for invading enemy planets. Needs an escort to get there." },
  support_ship: { name: "Support Ship", icon: "/icons/support_ship.svg", size: 0.9, cost: { Fe: 200, Si: 120, Al: 40 } as Res, time: 30, attack: 3, cargo: 100, speed: 5, health: 4, desc: "A repair vessel that patches up friendly ships. Best kept inside a fleet." },
  colony_ship: { name: "Colony Ship", icon: "/icons/colony_ship.svg", size: 0.95, cost: { Fe: 500, Si: 300 } as Res, time: 40, attack: 0, cargo: 100, speed: 3, health: 4, desc: "Carries settlers to found a new colony on an empty planet." },
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

/** x, y: light-years from Sol in the galactic plane */
export type SystemDTO = { id: number; name: string; x: number; y: number; seed: number };

type Placed = { systemId: number; orbit: number };
const SECONDS_PER_LY = 4;
/** Seconds to fly between two planets: short inside a system, longer between stars. */
export const flightSeconds = (a: Placed, b: Placed, systems: { id: number; x: number; y: number }[]) => {
  if (a.systemId === b.systemId) return Math.max(5, Math.round(5 + Math.abs(a.orbit - b.orbit) * 6));
  const sa = systems.find((s) => s.id === a.systemId)!;
  const sb = systems.find((s) => s.id === b.systemId)!;
  return Math.round(15 + Math.hypot(sa.x - sb.x, sa.y - sb.y) * SECONDS_PER_LY + (Math.min(a.orbit, 12) + Math.min(b.orbit, 12)) * 3);
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
  shared: boolean; // safe haven: everyone can have a base here and it can't be attacked
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
