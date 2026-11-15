import { describe, expect, it } from "vitest";
import { seedOf, toGameState } from "@/lib/api/adapters/mapAdapter";
import { galaxyMapSchema, playerViewSchema } from "@/lib/api/adapters/schemas";
import { galaxyMapFixture, playerViewFixture } from "./fixtures/apiMap";

describe("map adapter", () => {
	const { game, ids } = toGameState(galaxyMapFixture, playerViewFixture);

	it("fixtures match the Zod schemas", () => {
		expect(galaxyMapSchema.parse(galaxyMapFixture)).toEqual(galaxyMapFixture);
		expect(playerViewSchema.parse(playerViewFixture)).toEqual(playerViewFixture);
	});

	it("turns systems into SystemDTOs with sectors", () => {
		expect(game.systems.map((system) => system.name)).toEqual(["Alpha", "Beta"]);
		expect([game.systems[0].sectorX, game.systems[0].sectorY]).toEqual([10, 10]);
		expect([game.systems[1].sectorX, game.systems[1].sectorY]).toEqual([11, 9]);
	});

	it("turns planets into PlanetDTOs inside their system with growing orbits", () => {
		expect(game.planets).toHaveLength(3);
		const [first, second] = game.planets;
		expect(first.systemId).toBe(game.systems[0].id);
		expect(second.orbit).toBeGreaterThan(first.orbit);
		expect(second.shared).toBe(true);
	});

	it("maps fleets to milliseconds and numeric planet ids", () => {
		const fleet = game.fleets[0];
		expect(ids.idOf(fleet.originId)).toBe("a1");
		expect(ids.idOf(fleet.targetId)).toBe("b1");
		expect(fleet.departAt).toBe(1_200_000);
		expect(fleet.arriveAt).toBe(1_500_000);
		expect(game.nowMs).toBe(1_000_000);
	});

	it("gives the same seed for the same id", () => {
		expect(seedOf("a1")).toBe(seedOf("a1"));
		expect(seedOf("a1")).not.toBe(seedOf("a2"));
	});
});
