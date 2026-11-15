"use client";

import { HubConnectionBuilder } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { attachGameEvents, type FleetSpottedEvent } from "./gameEvents";
import { loadSession } from "./session";

const RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 30000];

function hubUrl(gameId: string): string {
	const base = process.env.NEXT_PUBLIC_API_URL ?? "";

	return `${base}/hubs/game?gameId=${encodeURIComponent(gameId)}`;
}

/** Live updates for one game. Returns the last FleetSpotted event (for toasts). */
export function useGameEvents(gameId: string): FleetSpottedEvent | null {
	const client = useQueryClient();
	const [spotted, setSpotted] = useState<FleetSpottedEvent | null>(null);

	useEffect(() => {
		const connection = new HubConnectionBuilder()
			.withUrl(hubUrl(gameId), { accessTokenFactory: () => loadSession()?.token ?? "" })
			.withAutomaticReconnect(RECONNECT_DELAYS_MS)
			.build();

		return attachGameEvents(connection, client, gameId, { onFleetSpotted: setSpotted });
	}, [client, gameId]);

	return spotted;
}
