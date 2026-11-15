import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { attachGameEvents, type HubConnectionLike } from "@/lib/api/gameEvents";

function fakeConnection() {
	const handlers = new Map<string, (...args: never[]) => void>();
	let reconnected: () => void = () => undefined;
	const connection: HubConnectionLike = {
		on: (method, handler) => void handlers.set(method, handler),
		onreconnected: (handler) => void (reconnected = handler),
		start: vi.fn(async () => undefined),
		stop: vi.fn(async () => undefined),
	};

	const emit = (method: string, ...args: unknown[]) =>
		(handlers.get(method) as (...a: unknown[]) => void)(...args);

	return { connection, emit, reconnect: () => reconnected() };
}

function setup() {
	const client = new QueryClient();
	client.setQueryData(["/api/games/g1/state"], 1);
	client.setQueryData(["/api/games/g2/state"], 1);
	const fake = fakeConnection();
	const onFleetSpotted = vi.fn();
	const detach = attachGameEvents(fake.connection, client, "g1", { onFleetSpotted });

	return { client, fake, onFleetSpotted, detach };
}

const isStale = (client: QueryClient, key: string) =>
	client.getQueryState([key])?.isInvalidated;

describe("attachGameEvents", () => {
	it("starts the connection and stops it on detach", () => {
		const { fake, detach } = setup();
		expect(fake.connection.start).toHaveBeenCalled();
		detach();
		expect(fake.connection.stop).toHaveBeenCalled();
	});

	it.each(["StateChanged", "BattleResolved"])("%s invalidates only this game", (event) => {
		const { client, fake } = setup();
		fake.emit(event, 5);
		expect(isStale(client, "/api/games/g1/state")).toBe(true);
		expect(isStale(client, "/api/games/g2/state")).toBe(false);
	});

	it("FleetSpotted reports the event and invalidates", () => {
		const { client, fake, onFleetSpotted } = setup();
		fake.emit("FleetSpotted", "f1", "p1", 900, "strong");
		expect(onFleetSpotted).toHaveBeenCalledWith({
			fleetId: "f1",
			targetPlanetId: "p1",
			arrivesAtGameTime: 900,
			strengthHint: "strong",
		});

		expect(isStale(client, "/api/games/g1/state")).toBe(true);
	});

	it("refetches after a reconnect", () => {
		const { client, fake } = setup();
		fake.reconnect();
		expect(isStale(client, "/api/games/g1/state")).toBe(true);
	});
});
