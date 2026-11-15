import { describe, expect, it } from "vitest";
import { arrive, settle } from "@/lib/server/engine";
import type { Fleet, Planet, World } from "@/lib/server/world";

const start = new Date("2030-01-01T00:00:00Z");
const arriveAt = new Date(start.getTime() + 60_000);

const planet = (over: Partial<Planet>): Planet => ({
	id: 2,
	name: "Target",
	system_id: 1,
	orbit: 1,
	kind: "npc",
	resources: { Fe: 400, Si: 100 },
	buildings: { mine_Fe: 1 },
	ships: {},
	defense: 50,
	seed: 1,
	shared: false,
	updated_at: start,
	...over,
});

const fleet = (over: Partial<Fleet>): Fleet => ({
	id: "f1",
	origin_id: 1,
	target_id: 2,
	mission: "attack",
	ships: { fighter: 20 },
	loot: {},
	depart_at: start,
	arrive_at: arriveAt,
	return_at: arriveAt,
	status: "outbound",
	report: "",
	...over,
});

const world = (planets: Planet[], fleets: Fleet[]): World => ({
	systems: [],
	planets,
	queue: [],
	fleets,
});

describe("fleet arrives", () => {
	it("destroys a weaker enemy base, loots it and guards the planet", () => {
		const target = planet({ defense: 50 });
		const attacker = fleet({ ships: { fighter: 20 } }); // attack 100 against defense 50
		arrive(world([target], [attacker]), attacker);
		expect(target.kind).toBe("empty");
		expect(target.defense).toBe(0);
		expect(attacker.status).toBe("stationed");
		expect(attacker.loot.Fe).toBeGreaterThan(0);
		expect(attacker.ships.fighter).toBeLessThan(20);
	});

	it("loses the whole fleet against a stronger base and weakens it", () => {
		const target = planet({ defense: 500 });
		const attacker = fleet({ ships: { fighter: 10 } }); // attack 50 against defense 500
		arrive(world([target], [attacker]), attacker);
		expect(attacker.status).toBe("done");
		expect(attacker.ships).toEqual({});
		expect(target.defense).toBe(475);
		expect(target.kind).toBe("npc");
	});

	it("guards a neutral planet instead of fighting", () => {
		const target = planet({ kind: "empty", defense: 0 });
		const guard = fleet({});
		arrive(world([target], [guard]), guard);
		expect(guard.status).toBe("stationed");
	});

	it("settles an empty planet with a colony ship and moves the ships in", () => {
		const target = planet({ kind: "empty", defense: 0 });
		const colonists = fleet({
			mission: "colonize",
			ships: { colony_ship: 1, fighter: 2 },
		});

		arrive(world([target], [colonists]), colonists);
		expect(target.kind).toBe("player");
		expect(target.ships.fighter).toBe(2);
		expect(target.ships.colony_ship).toBe(0);
		expect(colonists.status).toBe("done");
	});

	it("sends a colony ship home when the planet is already taken", () => {
		const target = planet({ kind: "npc" });
		const colonists = fleet({ mission: "colonize", ships: { colony_ship: 1 } });
		arrive(world([target], [colonists]), colonists);
		expect(colonists.status).toBe("returning");
		expect(colonists.return_at.getTime()).toBe(arriveAt.getTime() + 60_000);
	});
});

describe("settling time", () => {
	const later = new Date(start.getTime() + 600_000);

	it("finishes a queued building once its time has passed", () => {
		const home = planet({ id: 1, kind: "player", buildings: {} });
		const state = world([home], []);
		state.queue = [
			{
				id: "q1",
				planet_id: 1,
				kind: "building",
				type: "shipyard",
				start_at: start,
				finish_at: arriveAt,
			},
		];

		settle(state, later);
		expect(home.buildings.shipyard).toBe(1);
		expect(state.queue).toHaveLength(0);
	});

	it("leaves queue items that are not finished yet", () => {
		const home = planet({ id: 1, kind: "player", buildings: {} });
		const state = world([home], []);
		state.queue = [
			{
				id: "q1",
				planet_id: 1,
				kind: "ship",
				type: "fighter",
				start_at: start,
				finish_at: later,
			},
		];

		settle(state, arriveAt);
		expect(home.ships.fighter).toBeUndefined();
		expect(state.queue).toHaveLength(1);
	});

	it("plays out a whole trip: arrive, fight, and nothing left to do", () => {
		const home = planet({ id: 1, kind: "player", buildings: {} });
		const target = planet({ id: 2, defense: 10 });
		const attacker = fleet({ ships: { fighter: 20 } });
		settle(world([home, target], [attacker]), later);
		expect(target.kind).toBe("empty");
		expect(attacker.status).toBe("stationed");
	});

	it("brings a returning fleet home with its ships", () => {
		const home = planet({ id: 1, kind: "player", buildings: {}, ships: {} });
		const returning = fleet({
			status: "returning",
			ships: { fighter: 3 },
			loot: { Fe: 40 },
			return_at: arriveAt,
		});

		settle(world([home, planet({ id: 2 })], [returning]), later);
		expect(home.ships.fighter).toBe(3);
		expect(home.resources.Fe).toBeGreaterThanOrEqual(40);
		expect(returning.status).toBe("done");
	});
});
