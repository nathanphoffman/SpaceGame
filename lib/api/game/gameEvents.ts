import type { QueryClient } from "@tanstack/react-query";

export type FleetSpottedEvent = {
	fleetId: string;
	targetPlanetId: string;
	arrivesAtGameTime: number;
	strengthHint: string;
};

/** The small part of the SignalR connection we use, so tests can fake it. */
export type HubConnectionLike = {
	on(method: string, handler: (...args: never[]) => void): void;
	onreconnected(handler: () => void): void;
	onreconnecting?(handler: () => void): void;
	start(): Promise<void>;
	stop(): Promise<void>;
};

type Handlers = {
	onFleetSpotted: (event: FleetSpottedEvent) => void;
	onBattleResolved?: (reportId: string) => void;
	onGameEnded?: (outcome: string) => void;
	onReconnecting?: (reconnecting: boolean) => void;
};

function invalidateGame(client: QueryClient, gameId: string): void {
	const prefix = `/api/games/${gameId}`;
	void client.invalidateQueries({
		predicate: (query) => {
			const head = query.queryKey[0];

			return typeof head === "string" && head.startsWith(prefix);
		},
	});
}

function listenForGameEvents(
	connection: HubConnectionLike,
	handlers: Handlers,
	refresh: () => void,
): void {
	connection.on("StateChanged", refresh);
	connection.on("BattleResolved", (reportId: string) => {
		handlers.onBattleResolved?.(reportId);
		refresh();
	});

	connection.on("GameEnded", (outcome: string) => {
		handlers.onGameEnded?.(outcome);
		refresh();
	});

	connection.on(
		"FleetSpotted",
		(fleetId: string, targetPlanetId: string, arrivesAtGameTime: number, strengthHint: string) => {
			handlers.onFleetSpotted({ fleetId, targetPlanetId, arrivesAtGameTime, strengthHint });
			refresh();
		},
	);
}

/** Wires hub events to query invalidation. Returns a function that disconnects. */
export function attachGameEvents(
	connection: HubConnectionLike,
	client: QueryClient,
	gameId: string,
	handlers: Handlers,
): () => void { // callback run for each event or item

	const refresh = () => invalidateGame(client, gameId);
	listenForGameEvents(connection, handlers, refresh);

	// Events can be missed while offline, so refetch once we are back.
	connection.onreconnecting?.(() => handlers.onReconnecting?.(true));
	connection.onreconnected(() => {
		handlers.onReconnecting?.(false);
		refresh();
	});

	// Stopping while the connection is still starting (React does this twice in dev mode) is expected, not a failure.
	let stopped = false;

	void connection.start().catch((error) => {
		if (!stopped) console.warn("Live updates could not start; polling still works", error);
	});

	return () => {
		stopped = true;
		void connection.stop();
	};
}
