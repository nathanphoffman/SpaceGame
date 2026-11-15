"use client";

import { HubConnectionBuilder } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { attachGameEvents, type FleetSpottedEvent } from "./gameEvents";
import { loadSession } from "./session";

const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 30000];

function hubUrl(gameId: string): string {
	const base = process.env.NEXT_PUBLIC_API_URL ?? "";

	return `${base}/hubs/game?gameId=${encodeURIComponent(gameId)}`; // query string for the hub URL
}

export type LiveEvents = {
	/** Last FleetSpotted event for each fleet id (gives the strength hint). */
	spotted: Record<string, FleetSpottedEvent>;

	/** Report id of the latest battle, for the toast. */
	battleReportId: string | null;

	/** Outcome text from the GameEnded event, or null while the game runs. */
	endedOutcome: string | null;
};

/** Live updates for one game. Returns what the warning strip and the battle toast need. */
export function useGameEvents(gameId: string): LiveEvents {
	const client = useQueryClient();
	const [spotted, setSpotted] = useState<Record<string, FleetSpottedEvent>>({});
	const [battleReportId, setBattleReportId] = useState<string | null>(null);
	const [endedOutcome, setEndedOutcome] = useState<string | null>(null);

	useEffect(() => {
		const connection = new HubConnectionBuilder()
			.withUrl(hubUrl(gameId), { accessTokenFactory: () => loadSession()?.token ?? "" })
			.withAutomaticReconnect(RECONNECT_DELAYS_MS)
			.build();

		return attachGameEvents(connection, client, gameId, {
			onFleetSpotted: (event) => setSpotted((known) => ({ ...known, [event.fleetId]: event })),
			onBattleResolved: setBattleReportId,
			onGameEnded: setEndedOutcome,
		});
	}, [client, gameId]);

	return { spotted, battleReportId, endedOutcome };
}
