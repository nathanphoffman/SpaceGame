// Shared between server and client: game rules and API types.
import { MAX_STAT_RATING } from "@/lib/constants";

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

/** A bundle of resources, keyed by element symbol. */
export type Resources = Record<string, number>;

// ---- buildings ----
// A planet can build a mine for each element it is made of, plus a shipyard.
const MINE_PREFIX = "mine_";

export const mineType = (element: string) => `${MINE_PREFIX}${element}`;

export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;

// ---- ships ----
// size is the on-screen icon scale (1 = cruiser). speed and health (1-10) are shown in the UI; combat currently only uses attack and cargo.
export const SHIPS = {
	scout: {
		name: "Scout",
		icon: "/icons/ships/support/scout.svg",
		size: 0.5,
		cost: { Fe: 20, Si: 10 } as Resources,
		time: 5,
		attack: 1,
		cargo: 10,
		speed: MAX_STAT_RATING,
		health: 1,
		desc: "Cheap and very fast, with long-range sensors and almost no weapons. Good for looking at a system before you commit a fleet.",
	},
	fighter: {
		name: "Fighter",
		icon: "/icons/ships/combat/fighter.svg",
		size: 0.55,
		cost: { Fe: 50, Si: 20 } as Resources,
		time: 8,
		attack: 5,
		cargo: 50,
		speed: 8,
		health: 2,
		desc: "Small, cheap and everywhere. Weak alone, but a big swarm of them adds up.",
	},
	interceptor: {
		name: "Interceptor",
		icon: "/icons/ships/combat/interceptor.svg",
		size: 0.6,
		cost: { Fe: 70, Si: 30 } as Resources,
		time: 10,
		attack: 8,
		cargo: 20,
		speed: 9,
		health: 2,
		desc: "A fast fighter built to hunt down small ships. Hits hard for its size but has little armor.",
	},
	raider: {
		name: "Raider",
		icon: "/icons/ships/combat/raider.svg",
		size: 0.65,
		cost: { Fe: 120, Si: 70 } as Resources,
		time: 16,
		attack: 12,
		cargo: 80,
		speed: 8,
		health: 2,
		desc: "A stealthy hit-and-run ship. Fast, with room to carry off loot after an attack.",
	},
	corvette: {
		name: "Corvette",
		icon: "/icons/ships/combat/corvette.svg",
		size: 0.7,
		cost: { Fe: 90, Si: 40 } as Resources,
		time: 12,
		attack: 8,
		cargo: 40,
		speed: 8,
		health: 3,
		desc: "A small, cheap escort. Handy for filling out a fleet without spending much.",
	},
	frigate: {
		name: "Frigate",
		icon: "/icons/ships/combat/frigate.svg",
		size: 0.8,
		cost: { Fe: 140, Si: 70 } as Resources,
		time: 18,
		attack: 14,
		cargo: 80,
		speed: 7,
		health: 4,
		desc: "The general-purpose warship. Balanced speed, firepower and armor at a fair price.",
	},
	destroyer: {
		name: "Destroyer",
		icon: "/icons/ships/combat/destroyer.svg",
		size: 0.9,
		cost: { Fe: 170, Si: 90 } as Resources,
		time: 22,
		attack: 20,
		cargo: 100,
		speed: 6,
		health: 5,
		desc: "A sturdy escort with turrets built to shoot down smaller ships before they reach the big ones.",
	},
	cruiser: {
		name: "Cruiser",
		icon: "/icons/ships/capital/cruiser.svg",
		size: 1,
		cost: { Fe: 200, Si: 100 } as Resources,
		time: 25,
		attack: 25,
		cargo: 200,
		speed: 5,
		health: 7,
		desc: "The all-rounder. Tough, well armed and with a decent cargo hold.",
	},
	gunship: {
		name: "Gunship",
		icon: "/icons/ships/capital/gunship.svg",
		size: 1.05,
		cost: { Fe: 350, Si: 150, Al: 50 } as Resources,
		time: 35,
		attack: 40,
		cargo: 100,
		speed: 3,
		health: 6,
		desc: "Slow and heavily armed, built to batter planets and stations from orbit.",
	},
	battlecruiser: {
		name: "Battlecruiser",
		icon: "/icons/ships/capital/battlecruiser.svg",
		size: 1.15,
		cost: { Fe: 450, Si: 220, Al: 100 } as Resources,
		time: 45,
		attack: 50,
		cargo: 250,
		speed: 5,
		health: 5,
		desc: "Cruiser speed with near-dreadnought guns. The trade-off is thin armor, so protect it.",
	},
	carrier: {
		name: "Carrier",
		icon: "/icons/ships/capital/carrier.svg",
		size: 1.3,
		cost: { Fe: 700, Si: 400, Al: 150 } as Resources,
		time: 60,
		attack: 15,
		cargo: 600,
		speed: 4,
		health: 8,
		desc: "A huge hull with hangar bays for smaller craft. Weak guns of its own, so keep it behind the fleet.",
	},
	dreadnought: {
		name: "Dreadnought",
		icon: "/icons/ships/capital/dreadnought.svg",
		size: 1.45,
		cost: { Fe: 1200, Si: 600, Al: 300, Ti: 100 } as Resources,
		time: 90,
		attack: 100,
		cargo: 400,
		speed: 3,
		health: 9,
		desc: "The heavy frontline ship. Slow and expensive, but very hard to kill and devastating up close.",
	},
	titan: {
		name: "Titan",
		icon: "/icons/ships/capital/titan.svg",
		size: 1.6,
		cost: { Fe: 3000, Si: 1500, Al: 800, Ti: 400 } as Resources,
		time: 180,
		attack: 250,
		cargo: 1000,
		speed: 2,
		health: MAX_STAT_RATING,
		desc: "A late-game flagship. Enormous firepower and armor, and one of the most expensive things you can build.",
	},
	miner: {
		name: "Miner",
		icon: "/icons/ships/support/miner.svg",
		size: 0.8,
		cost: { Fe: 120, Si: 60 } as Resources,
		time: 20,
		attack: 0,
		cargo: 150,
		speed: 4,
		health: 3,
		desc: "An unarmed mining ship that gathers resources. Keep it away from fights.",
	},
	hauler: {
		name: "Hauler",
		icon: "/icons/ships/support/hauler.svg",
		size: 1.05,
		cost: { Fe: 250, Si: 100 } as Resources,
		time: 30,
		attack: 0,
		cargo: 1000,
		speed: 4,
		health: 4,
		desc: "An unarmed freighter with a very large cargo hold, for moving resources between planets.",
	},
	troop_transport: {
		name: "Troop Transport",
		icon: "/icons/ships/support/troop_transport.svg",
		size: 0.9,
		cost: { Fe: 200, Si: 100 } as Resources,
		time: 30,
		attack: 2,
		cargo: 300,
		speed: 5,
		health: 4,
		desc: "Carries ground troops for invading enemy planets. Needs an escort to get there.",
	},
	support_ship: {
		name: "Support Ship",
		icon: "/icons/ships/support/support_ship.svg",
		size: 0.9,
		cost: { Fe: 200, Si: 120, Al: 40 } as Resources,
		time: 30,
		attack: 3,
		cargo: 100,
		speed: 5,
		health: 4,
		desc: "A repair vessel that patches up friendly ships. Best kept inside a fleet.",
	},
	colony_ship: {
		name: "Colony Ship",
		icon: "/icons/ships/support/colony_ship.svg",
		size: 0.95,
		cost: { Fe: 500, Si: 300 } as Resources,
		time: 40,
		attack: 0,
		cargo: 100,
		speed: 3,
		health: 4,
		desc: "Carries settlers to found a new colony on an empty planet.",
	},
} as const;

export type ShipType = keyof typeof SHIPS;

// ---- the words used for who owns a planet, what a fleet is doing, and what a client asks the server to do ----
export const PLANET_KIND = {
	player: "player",
	npc: "npc",
	empty: "empty",
} as const;

export const FLEET_STATUS = {
	outbound: "outbound",
	stationed: "stationed",
	returning: "returning",
	done: "done",
} as const;

export const MISSION = { attack: "attack", colonize: "colonize" } as const;
const QUEUE_KIND = { building: "building", ship: "ship" } as const;

export type Owner = keyof typeof PLANET_KIND;
type FleetStatus = keyof typeof FLEET_STATUS;
type Mission = keyof typeof MISSION;
type QueueKind = keyof typeof QUEUE_KIND;

export type SystemDTO = {
	id: number;
	name: string;
	x: number;
	y: number;
	seed: number;
	sectorX: number;
	sectorY: number;
};

export type PlanetDTO = {
	id: number;
	name: string;
	systemId: number;
	orbit: number; // distance from the star in AU
	kind: Owner;
	resources: Resources;
	buildings: Record<string, number>;
	ships: Record<string, number>;
	defense: number;
	seed: number;
	shared: boolean; // safe haven: everyone can have a base here and it can't be attacked
};

type QueueDTO = {
	id: string;
	planetId: number;
	kind: QueueKind;
	type: string;
	startAt: number;
	finishAt: number;
};

/** where a fleet is going and what it is for */
type FleetRoute = {
	id: string;
	originId: number;
	targetId: number;
	mission: Mission;
};

/** the times that drive a fleet's movement (all ms) */
type FleetTimes = {
	departAt: number;
	arriveAt: number;
	returnAt: number;
};

/** what the fleet carries and its outcome */
type FleetLoad = {
	ships: Record<string, number>;
	loot: Resources;
	status: FleetStatus;
	report: string;
};

export type FleetDTO = FleetRoute &
	FleetTimes &
	FleetLoad & {
		/** an enemy fleet (from the API's Side); drawn in a different colour */
		hostile?: boolean;
	};

export type GameState = {
	nowMs: number;
	systems: SystemDTO[];
	planets: PlanetDTO[];
	queue: QueueDTO[];
	fleets: FleetDTO[];
};
