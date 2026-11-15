import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LobbyView } from "@/components/lobby/LobbyView";
import { fetchLobby, isHostPlayer, joinLink, startGame, type Lobby } from "@/lib/api/lobby";

const lobby: Lobby = {
	code: "ABCD",
	mode: "test",
	started: false,
	players: [
		{ id: "p1", name: "Ann", isHost: true },
		{ id: "p2", name: "Bo", isHost: false },
	],
};

const noop = () => {};

const view = (isHost: boolean, error?: string) =>
	renderToString(
		<LobbyView lobby={lobby} isHost={isHost} starting={false} error={error} onStart={noop} onCopy={noop} />,
	);

afterEach(() => vi.unstubAllGlobals());

describe("LobbyView", () => {
	it("shows the code, players and a copy button", () => {
		const html = view(false);
		expect(html).toContain("ABCD");
		expect(html).toContain("Ann");
		expect(html).toContain("Bo");
		expect(html).toContain("Copy link");
	});

	it("shows Start only to the host", () => {
		expect(view(true)).toContain("Start game");
		expect(view(false)).not.toContain("Start game");
		expect(view(false)).toContain("Waiting for the host");
	});

	it("shows an error", () => {
		expect(view(true, "Nope")).toContain("Nope");
	});
});

describe("lobby api", () => {
	it("detects the host by session player id", () => {
		expect(isHostPlayer(lobby, "p1")).toBe(true);
		expect(isHostPlayer(lobby, "p2")).toBe(false);
		expect(isHostPlayer(lobby, undefined)).toBe(false);
	});

	it("builds a join link", () => {
		expect(joinLink("http://x", "A B")).toBe("http://x/new?code=A%20B");
	});

	it("fetches and parses the lobby", async () => {
		const fn = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(lobby)));
		vi.stubGlobal("fetch", fn);
		expect(await fetchLobby("g1")).toEqual(lobby);
		expect(fn.mock.calls[0]?.[0]).toBe("/api/games/g1/lobby");
	});

	it("rejects a malformed lobby", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: 1 }))));
		await expect(fetchLobby("g1")).rejects.toThrow();
	});

	it("posts start", async () => {
		const fn = vi.fn(async (..._args: unknown[]) => new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fn);
		await startGame("g1");
		expect(fn.mock.calls[0]?.[0]).toBe("/api/games/g1/start");
	});
});
