import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuote, type FleetDraft } from "@/lib/api/game/fleetOrders";

// No DOM here, so capture the options useMutation is given and call mutationFn directly.
const captured = vi.hoisted(() => ({ options: undefined as undefined | { mutationFn: (draft: unknown) => Promise<unknown> } }));

vi.mock("@tanstack/react-query", async (original) => ({
	...(await original<typeof import("@tanstack/react-query")>()),
	useMutation: (options: typeof captured.options) => {
		captured.options = options;

		return {};
	},
}));

afterEach(() => vi.unstubAllGlobals());

const draft: FleetDraft = { from: "a1", to: "b1", ships: { Scout: 1 }, cargo: {} };

function stubQuote(body: unknown) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));

	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

describe("useQuote", () => {
	it("posts the draft and returns depart and arrive times as numbers", async () => {
		const fetchMock = stubQuote({ ok: true, error: null, departAt: 300, arriveAt: 620 });

		useQuote("g1");
		const quote = await captured.options?.mutationFn(draft);

		expect(quote).toEqual({ ok: true, error: null, departAt: 300, arriveAt: 620 });
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

		expect(url).toContain("/api/games/g1/quote");
		expect(JSON.parse(String(init.body))).toMatchObject({ from: "a1", to: "b1", ships: { Scout: 1 }, cargo: null });
	});

	it("passes the server's refusal message through", async () => {
		stubQuote({ ok: false, error: "Not enough ships.", departAt: 0, arriveAt: 0 });

		useQuote("g1");
		const quote = await captured.options?.mutationFn(draft);

		expect(quote).toMatchObject({ ok: false, error: "Not enough ships." });
	});
});
