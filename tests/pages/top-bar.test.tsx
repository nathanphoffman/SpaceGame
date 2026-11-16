import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { GameTopBar, formatTimeLeft, scorePercent } from "@/components/game/shell/GameTopBar";
import { playerViewFixture } from "../fixtures/apiMap";

describe("top bar", () => {
	it("shows the clock, both scores, the help button and each stockpile element", () => {
		const html = renderToString(<GameTopBar view={{ ...playerViewFixture, timeLeftSeconds: 3725, teamScore: 12, enemyScore: 30 }} />);

		expect(html).toContain("1:02:05");
		expect(html).toContain("Team 12/500");
		expect(html).toContain("Enemy 30/500");
		expect(html).toContain("How to play");

		for (const element of Object.keys(playerViewFixture.stockpile)) expect(html).toContain(element);
	});

	it("formats time and clamps score percent", () => {
		expect(formatTimeLeft(-5)).toBe("0:00:00");
		expect(scorePercent(1000)).toBe(100);
		expect(scorePercent(-1)).toBe(0);
	});
});
