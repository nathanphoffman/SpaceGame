import { QueryClient } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttackWarnings } from "@/components/game/shell/AttackWarnings";
import { useGameEvents, type LiveEvents } from "@/lib/api/game/useGameEvents";

// Minimal hook runner: there is no DOM in these tests, so state and effects are kept by hand.
const runner = vi.hoisted(() => ({
	slots: [] as unknown[],
	index: 0,
	effects: [] as Array<() => unknown>,
	rerender: () => undefined as void,
}));

vi.mock("react", async (original) => ({
	...(await original<typeof import("react")>()),
	useState: (initial: unknown) => {
		const slot = runner.index++;

		if (!(slot in runner.slots)) runner.slots[slot] = initial;

		const set = (next: unknown) => {
			runner.slots[slot] = typeof next === "function" ? next(runner.slots[slot]) : next;
			runner.rerender();
		};

		return [runner.slots[slot], set];
	},
	useEffect: (effect: () => unknown) => void runner.effects.push(effect),
}));

const shared = vi.hoisted(() => ({ client: undefined as unknown }));

vi.mock("@tanstack/react-query", async (original) => ({
	...(await original<typeof import("@tanstack/react-query")>()),
	useQueryClient: () => shared.client,
}));

type Handler = (...args: unknown[]) => void;
const hub = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }));

vi.mock("@microsoft/signalr", () => ({
	LogLevel: { Critical: 5 },
	HubConnectionBuilder: class {
		withUrl() { return this; }
		withAutomaticReconnect() { return this; }
		configureLogging() { return this; }
		build() {
			return {
				on: (method: string, handler: Handler) => void hub.handlers.set(method, handler),
				onreconnected: () => undefined,
				onreconnecting: () => undefined,
				start: async () => undefined,
				stop: async () => undefined,
			};
		}
	},
}));

const spottedArgs = ["e1", "a1", 400, "large"];

describe("useGameEvents with a fake SignalR connection", () => {
	let live: LiveEvents;
	let client: QueryClient;

	beforeEach(() => {
		hub.handlers.clear();
		runner.slots = [];
		client = new QueryClient();
		shared.client = client;
		client.setQueryData(["/api/games/g1/state"], { version: 1 });

		const usePass = () => {
			runner.index = 0;
			runner.effects = [];
			live = useGameEvents("g1");
		};

		runner.rerender = usePass;
		usePass();
		runner.effects.forEach((effect) => effect()); // mount: runs the effect once
	});

	it("shows a warning and refetches state when FleetSpotted arrives", () => {
		const enemy = { id: "e1", side: "Enemy", to: "a1", arriveAt: 400 };
		hub.handlers.get("FleetSpotted")?.(...spottedArgs);

		expect(live.spotted.e1.strengthHint).toBe("large");
		expect(client.getQueryState(["/api/games/g1/state"])?.isInvalidated).toBe(true);
		const html = renderToString(
			<AttackWarnings fleets={[enemy] as never} gameTime={100} spotted={live.spotted} />,
		);

		expect(html).toContain("strength: large");
	});
});
