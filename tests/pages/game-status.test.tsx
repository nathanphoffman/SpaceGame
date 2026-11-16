import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameStatus } from "@/components/game/shell/GameStatus";
import { ApiError } from "@/lib/api/core/client";

describe("GameStatus", () => {
	const retry = () => undefined;

	it.each([
		["a loading message", <GameStatus key="a" kind="loading" />, ["Loading game"]],
		["a home link when the game is not found", <GameStatus key="b" kind="error" error={new ApiError(404, {})} />, ["could not find that game", 'href="/"']],
		["the error with a retry button for other failures", <GameStatus key="c" kind="error" error={new ApiError(500, { detail: "Server down" })} onRetry={retry} />, ["Server down", "Try again"]],
		["the redirect reason when the token is missing", <GameStatus key="d" kind="redirecting" />, ["No saved login"]],
	])("shows %s", (_name, element, expected) => {
		const html = renderToString(element);

		for (const text of expected) expect(html).toContain(text);
	});
});
