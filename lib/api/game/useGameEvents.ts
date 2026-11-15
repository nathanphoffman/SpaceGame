"use client";

import { HubConnectionBuilder } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { attachGameEvents, type FleetSpottedEvent } from "@/lib/api/game/gameEvents";
import { loadSession } from "@/lib/api/core/session";

const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 30000];

function hubUrl(gameId: string): string {
	const base = process.env.NEXT_PUBLIC_API_URL ?? "";

	return `${base}/hubs/game?gameId=${encodeURIComponent(gameId)}`; // query string for the hub URL
}

export type LiveEvents = {
	/** Last FleetSpotted event for each fleet id (gives the strength hint). */
	spotted: Record<string, FleetSpottedEvent>;

	/** Latest battle report id; the toast links to it so the player can open the result. */
	battleReportId: string | null;

	/** Outcome text from the GameEnded event, or null while the game runs. */
	endedOutcome: string | null;

	/** True while SignalR is trying to reconnect. */
	reconnecting: boolean;
};

/** Live updates for one game. Returns what the warning strip and the battle toast need. */
export function useGameEvents(gameId: string): LiveEvents {
	const client = useQueryClient();
	const [spotted, setSpotted] = useState<Record<string, FleetSpottedEvent>>({});
	const [battleReportId, setBattleReportId] = useState<string | null>(null);
	const [endedOutcome, setEndedOutcome] = useState<string | null>(null);
	const [reconnecting, setReconnecting] = useState(false);

	useEffect(() => {
		const connection = new HubConnectionBuilder()
			.withUrl(hubUrl(gameId), { accessTokenFactory: () => loadSession()?.token ?? "" })
			.withAutomaticReconnect(RECONNECT_DELAYS_MS)
			.build();

		return attachGameEvents(connection, client, gameId, {
			// add the spotted fleet to the known ones, keyed by fleet id (copy, don't mutate)
			onFleetSpotted: (event) => setSpotted((known) => ({ ...known, [event.fleetId]: event })),
			onBattleResolved: setBattleReportId,
			onGameEnded: setEndedOutcome,
			onReconnecting: setReconnecting,
		});
	}, [client, gameId]);

	return { spotted, battleReportId, endedOutcome, reconnecting };
}
