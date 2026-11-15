import type { GalaxyMapDto, PlayerViewDto } from "@/lib/api/adapters/schemas";

export const galaxyMapFixture: GalaxyMapDto = {
	systems: [
		{
			id: "sys-a",
			name: "Alpha",
			x: 0,
			y: 0,
			z: 0,
			planets: [
				{ id: "a1", name: "Alpha I", isObjective: false, richness: { Iron: 50 } },
				{ id: "a2", name: "Alpha II", isObjective: true, richness: { Helium3: 80 } },
			],
		},
		{
			id: "sys-b",
			name: "Beta",
			x: 40,
			y: -35,
			z: 1,
			planets: [{ id: "b1", name: "Beta I", isObjective: false, richness: {} }],
		},
	],
};

export const playerViewFixture: PlayerViewDto = {
	version: 3,
	gameTime: 1000,
	timeLeftSeconds: 5000,
	teamScore: 0,
	enemyScore: 0,
	stockpile: { Iron: 10, Hydrogen: 0, Titanium: 0, Helium3: 0 },
	holdings: [],
	reports: [],
	upgrades: {},
	fleets: [
		{
			id: "f1",
			owner: "p1",
			side: "Team",
			from: "a1",
			to: "b1",
			launchAt: 900,
			departAt: 1200,
			arriveAt: 1500,
			ships: { Scout: 2 },
			cargo: { Iron: 0, Hydrogen: 0, Titanium: 0, Helium3: 0 },
		},
	],
};

const wireResources = (iron = 0) => ({ iron, hydrogen: 0, titanium: 0, helium3: 0 });

/** The same map and view as above, in the shape the server sends (strings for 64-bit numbers, Resources objects, enum ordinals). */
export const wireMapFixture = {
	systems: galaxyMapFixture.systems.map((system) => ({ ...system, x: String(system.x) })),
};

export const wireViewFixture = {
	version: "3",
	gameTime: "1000",
	timeLeftSeconds: 5000,
	teamScore: 0,
	enemyScore: 0,
	stockpile: wireResources(10),
	reports: [],
	upgrades: {},
	fleets: [{ ...playerViewFixture.fleets[0], launchAt: "900", ships: { Scout: 2 }, cargo: wireResources() }],
	holdings: [
		{
			planet: "a1",
			mines: { Iron: 1 },
			queue: [{ id: "q1", building: 0, element: 0, ship: null, level: 1, startAt: 0, finishAt: 60, cost: wireResources(5) }],
		},
	],
};
