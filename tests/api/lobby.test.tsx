import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LobbyView } from "@/components/lobby/LobbyView";
import { getLobby, startGame } from "@/lib/api/generated/api";
import { isHostPlayer, joinLink, parseLobby, type Lobby } from "@/lib/api/lobby";

const lobby: Lobby = {
	code: "ABCD",
	mode: "test",
	started: false,
	players: [
		{ id: "6f9619ff-8b86-4d11-b42d-00c04fc964ff", name: "Ann", isHost: true },
		{ id: "7f9619ff-8b86-4d11-b42d-00c04fc964ff", name: "Bo", isHost: false },
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

	it("shows the share link and copied state", () => {
		const html = renderToString(
			<LobbyView lobby={lobby} isHost={false} starting={false} copied shareLink="http://x/?code=ABCD" onStart={noop} onCopy={noop} />,
		);

		expect(html).toContain("http://x/?code=ABCD");
		expect(html).toContain("Copied!");
	});

	it("shows an error", () => {
		expect(view(true, "Nope")).toContain("Nope");
	});
});

describe("lobby api", () => {
	it("detects the host by session player id", () => {
		expect(isHostPlayer(lobby, "6f9619ff-8b86-4d11-b42d-00c04fc964ff")).toBe(true);
		expect(isHostPlayer(lobby, "p2")).toBe(false);
		expect(isHostPlayer(lobby, undefined)).toBe(false);
	});

	it("builds a join link", () => {
		expect(joinLink("http://x", "A B")).toBe("http://x/?code=A%20B");
	});

	it("fetches and parses the lobby", async () => {
		const fn = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(lobby)));
		vi.stubGlobal("fetch", fn);
		expect(parseLobby(await getLobby("g1"))).toEqual(lobby);
		expect(fn.mock.calls[0]?.[0]).toBe("/api/games/g1/lobby");
	});

	it("rejects a malformed lobby", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: 1 }))));
		const body = await getLobby("g1");
		expect(() => parseLobby(body)).toThrow();
	});

	it("posts start", async () => {
		const fn = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fn);
		await startGame("g1");
		expect(fn.mock.calls[0]?.[0]).toBe("/api/games/g1/start");
	});
});
