import { describe, expect, it } from "vitest";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { galaxyMapFixture, playerViewFixture } from "../fixtures/apiMap";

describe("territory on the map", () => {
	const [first, second] = galaxyMapFixture.systems;
	const withTerritory = (territory: { planet: string; control: "Mine" | "Ally" | "Hostile" }[]) =>
		toGameState(galaxyMapFixture, { ...playerViewFixture, territory }).game;

	it("marks planets and their system by who holds them", () => {
		const game = withTerritory([{ planet: first.planets[0].id, control: "Mine" }, { planet: second.planets[0].id, control: "Hostile" }]);

		expect(game.planets.filter((planet) => planet.control === "Mine")).toHaveLength(1);
		expect(game.systems[0].control).toBe("Mine");
		expect(game.systems[1].control).toBe("Hostile");
	});

	it("shows your base over an ally's and an ally's over a known enemy in the same system", () => {
		const [one, two] = first.planets;
		const both = withTerritory([{ planet: one.id, control: "Hostile" }, { planet: two?.id ?? one.id, control: "Ally" }]);

		expect(both.systems[0].control).toBe("Ally");
		expect(withTerritory([]).systems[0].control).toBeUndefined();
	});
});
