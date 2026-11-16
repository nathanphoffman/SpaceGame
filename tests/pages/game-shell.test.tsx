import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { scorePercent, GameTopBar } from "@/components/game/shell/GameTopBar";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { galaxyMapFixture, playerViewFixture } from "../fixtures/apiMap";

describe("GameTopBar", () => {
	it("shows time left, both scores toward 500 and the stockpile", () => {
		const view = { ...playerViewFixture, timeLeftSeconds: 3725, teamScore: 120, enemyScore: 80, stockpile: { Iron: 10.7 } };
		const html = renderToString(<GameTopBar view={view} />);
		expect(html).toContain("1:02:05");
		expect(html).toContain("Team 120/500");
		expect(html).toContain("Enemy 80/500");
		expect(html).toContain("Iron");
		expect(html).toContain("10");
		expect(html).toContain('value="120"');
		expect(html).toContain('value="80"');
		expect(scorePercent(250)).toBe(50);
		expect(scorePercent(900)).toBe(100);
	});
});

describe("game state for the maps", () => {
	it("uses the server game time as the map clock", () => {
		const { game } = toGameState(galaxyMapFixture, playerViewFixture);
		expect(game.nowMs).toBe(playerViewFixture.gameTime * 1000);
		expect(game.systems).toHaveLength(2);
	});
});
