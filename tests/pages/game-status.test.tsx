import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameStatus } from "@/components/game/shell/GameStatus";
import { ApiError } from "@/lib/api/core/client";

describe("GameStatus", () => {
	it("shows a loading message", () => {
		expect(renderToString(<GameStatus kind="loading" />)).toContain("Loading game");
	});

	it("tells the player when the game is not found and links home", () => {
		const html = renderToString(<GameStatus kind="error" error={new ApiError(404, {})} />);
		expect(html).toContain("could not find that game");
		expect(html).toContain('href="/"');
	});

	it("shows the error with a retry button for other failures", () => {
		const html = renderToString(<GameStatus kind="error" error={new ApiError(500, { detail: "Server down" })} onRetry={() => undefined} />);
		expect(html).toContain("Server down");
		expect(html).toContain("Try again");
	});

	it("explains the redirect when the token is missing", () => {
		expect(renderToString(<GameStatus kind="redirecting" />)).toContain("No saved login");
	});
});
