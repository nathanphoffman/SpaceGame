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

/** A bundle of resources, keyed by element symbol. */
export type Resources = Record<string, number>;

// ---- buildings ----
// A planet can build a mine for each element it is made of, plus a shipyard.
const MINE_PREFIX = "mine_";

export const mineType = (element: string) => `${MINE_PREFIX}${element}`;

export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;

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

export type Owner = keyof typeof PLANET_KIND;
type FleetStatus = keyof typeof FLEET_STATUS;
type Mission = keyof typeof MISSION;

/** who holds a planet or star system, from the player's point of view */
export type ControlKind = "Mine" | "Ally" | "Hostile";

export type SystemDTO = {
	id: number;
	name: string;
	x: number;
	y: number;
	seed: number;
	sectorX: number;
	sectorY: number;
	control?: ControlKind; // your base wins over an ally's, which wins over a known enemy planet
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
	control?: ControlKind;
	shared: boolean; // safe haven: everyone can have a base here and it can't be attacked
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
	fleets: FleetDTO[];
};
