import { describe, expect, it } from "vitest";
import { type FleetDTO, type GameState } from "@/lib/defs";
import { countdownText, flightOf, prepLeftMs, syncedNowMs } from "@/lib/galaxy/flight";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { galaxyMapSchema, playerViewSchema } from "@/lib/api/adapters/schemas";

const planet = (id: number, systemId: number) => ({ id, systemId });
const game = { planets: [planet(1, 1), planet(2, 1)], fleets: [] } as unknown as GameState;
const MIN = 60_000;

const fleet = (over: Partial<FleetDTO> = {}): FleetDTO => ({
	id: "f", originId: 1, targetId: 2, mission: "attack", ships: {}, loot: {},
	departAt: 5 * MIN, arriveAt: 15 * MIN, returnAt: 15 * MIN, status: "outbound", report: "", ...over,
});

describe("fleet flight from server times", () => {
	it("waits at the origin during prep, with a countdown", () => {
		const f = fleet();
		const early = flightOf(game, f, 2 * MIN);
		expect(early.k).toBe(0);
		expect(early.from.id).toBe(1);
		expect(prepLeftMs(f, 2 * MIN)).toBe(3 * MIN);
		expect(countdownText(3 * MIN)).toBe("3:00");
		expect(countdownText(65_000)).toBe("1:05");
	});

	it.each([
		["is half way mid-flight and has no countdown", 10, 0.5],
		["stays at the target after arrival", 20, 1],
	])("%s", (_name, minutes, k) => {
		expect(flightOf(game, fleet(), minutes * MIN).k).toBe(k);
		expect(prepLeftMs(fleet(), minutes * MIN)).toBe(0);
	});

	it("keeps in step with the server clock using an offset", () => {
		expect(syncedNowMs(100_000, 5_000, 8_000)).toBe(103_000);
	});

	it("marks enemy fleets from the API as hostile", () => {
		const map = galaxyMapSchema.parse({ systems: [{ id: "s", name: "S", x: 0, y: 0, z: 0, planets: [
			{ id: "a", name: "A", richness: {}, isObjective: false }, { id: "b", name: "B", richness: {}, isObjective: false }] }] });
		const view = playerViewSchema.parse({ version: 1, gameTime: 0, timeLeftSeconds: 1, teamScore: 0, enemyScore: 0, stockpile: { iron: 0, hydrogen: 0, titanium: 0, helium3: 0 }, reports: [],
			fleets: ["Team", "Enemy"].map((side) => ({ id: side, owner: null, side, from: "a", to: "b", launchAt: 0, departAt: 300, arriveAt: 600, ships: {}, cargo: { iron: 0, hydrogen: 0, titanium: 0, helium3: 0 } })) });
		const { game: legacy } = toGameState(map, view);
		expect(legacy.fleets.map((x) => x.hostile)).toEqual([false, true]);
	});
});
