import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/core/client";
import {
	createGame,
	createGameSchema,
	fieldErrors,
	joinGame,
	joinGameSchema,
} from "@/lib/api/game/gameForms";

import { loadSession } from "@/lib/api/core/session";

const store = new Map<string, string>();

function mockFetch(status: number, body: unknown) {
	const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
	vi.stubGlobal("fetch", fn);

	return fn;
}

beforeEach(() => {
	store.clear();
	vi.stubGlobal("localStorage", {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
	});
});

afterEach(() => vi.unstubAllGlobals());

describe("form schemas", () => {
	it.each([
		["accepts a valid create form and an empty webhook", createGameSchema, { name: "Ann", mode: "test", discordWebhookUrl: "" }, true],
		["requires a code to join", joinGameSchema, { code: "", playerName: "Bo" }, false],
	])("%s", (_name, schema, input, ok) => {
		expect(schema.safeParse(input).success).toBe(ok);
	});

	it("reports the first error per field", () => {
		const parsed = createGameSchema.safeParse({ name: " ", mode: "week", discordWebhookUrl: "nope" });

		if (parsed.success) throw new TypeError("should fail");
		const errors = fieldErrors(parsed.error);
		expect(errors.name).toBe("Enter a name");
		expect(errors.discordWebhookUrl).toBeDefined();
	});
});

describe("createGame / joinGame", () => {
	it("posts the form, stores the session and returns the game id", async () => {
		const fetchMock = mockFetch(200, { gameId: "g1", code: "ABC", playerId: "p1", playerToken: "t1" });
		const id = await createGame({ name: "Ann", mode: "week", discordWebhookUrl: "" });
		expect(id).toBe("g1");
		expect(loadSession()).toEqual({ gameId: "g1", playerId: "p1", token: "t1" });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("/api/games");
		expect(JSON.parse(init.body as string)).toEqual({ name: "Ann", mode: "week", seed: null, discordWebhookUrl: null });
	});

	it("joins with a code", async () => {
		mockFetch(200, { gameId: "g2", playerId: "p2", playerToken: "t2" });
		expect(await joinGame({ code: "ABC", playerName: "Bo" })).toBe("g2");
		expect(loadSession()?.token).toBe("t2");
	});

	it("throws ApiError with the server message", async () => {
		mockFetch(404, { title: "Not found", detail: "No game with that code" });
		await expect(joinGame({ code: "X", playerName: "Bo" })).rejects.toMatchObject({
			message: "No game with that code",
		});

		await expect(joinGame({ code: "X", playerName: "Bo" })).rejects.toBeInstanceOf(ApiError);
	});
});

describe("home forms", () => {
	it("prefills the join code from the invite link", async () => {
		vi.doMock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
		const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
		const { JoinGameForm } = await import("@/components/home/HomeForms");
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<JoinGameForm defaultCode="ABCD" />
			</QueryClientProvider>,
		);

		expect(html).toContain('value="ABCD"');
	});

	it("renders both forms", async () => {
		vi.doMock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
		const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
		const { CreateGameForm, JoinGameForm } = await import("@/components/home/HomeForms");
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<CreateGameForm />
				<JoinGameForm />
			</QueryClientProvider>,
		);

		expect(html).toContain("Create a game");
		expect(html).toContain("Join a game");
		expect(html).toContain("1-hour test");
	});
});
