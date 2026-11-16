import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { EndScreen } from "@/components/game/shell/EndScreen";
import { attachGameEvents, type HubConnectionLike } from "@/lib/api/game/gameEvents";
import { playerViewFixture } from "../fixtures/apiMap";

const outcome = {
	winner: "Team",
	reason: "Enemy home world claimed",
	teamScore: 120,
	enemyScore: 80,
	contributions: [{ player: "Ann", points: 7, battlesWon: 2, planetsCaptured: 1 }],
};

describe("end screen", () => {
	it("shows winner, reason, scores and the contribution table", () => {
		const html = renderToString(<EndScreen view={playerViewFixture} outcome={outcome} fallbackWinner={null} />);

		expect(html).toContain("Winner: Team");
		expect(html).toContain("Enemy home world claimed");
		expect(html).toContain("Team 120");
		expect(html).toContain("Ann");
	});

	it("falls back to the GameEnded text when the view has no outcome yet", () => {
		const html = renderToString(<EndScreen view={playerViewFixture} fallbackWinner="Enemy" />);

		expect(html).toContain("Winner: Enemy");
		expect(html).not.toContain("<table");
	});

	it("reports GameEnded from the hub", () => {
		const handlers: Record<string, (...args: never[]) => void> = {};
		const connection: HubConnectionLike = {
			on: (method, handler) => void (handlers[method] = handler),
			onreconnected: () => undefined,
			start: () => Promise.resolve(),
			stop: () => Promise.resolve(),
		};

		const onGameEnded = vi.fn();

		attachGameEvents(connection, new QueryClient(), "g1", { onFleetSpotted: vi.fn(), onGameEnded });
		(handlers.GameEnded as (outcome: string) => void)("won");

		expect(onGameEnded).toHaveBeenCalledWith("won");
	});
});
