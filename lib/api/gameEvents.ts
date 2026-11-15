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
	start(): Promise<void>;
	stop(): Promise<void>;
};

type Handlers = {
	onFleetSpotted: (event: FleetSpottedEvent) => void;
	onBattleResolved?: (reportId: string) => void;
	onGameEnded?: (outcome: string) => void;
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

/** Wires hub events to query invalidation. Returns a function that disconnects. */
export function attachGameEvents(
	connection: HubConnectionLike,
	client: QueryClient,
	gameId: string,
	handlers: Handlers,
): () => void { // callback run for each event or item

	const refresh = () => invalidateGame(client, gameId);
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

	// Events can be missed while offline, so refetch once we are back.
	connection.onreconnected(refresh);
	void connection.start().catch((error) => {
		console.warn("Live updates could not start; polling still works", error);
	});

	return () => {
		void connection.stop();
	};
}
