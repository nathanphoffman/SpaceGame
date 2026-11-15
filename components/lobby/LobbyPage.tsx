"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGameEvents } from "@/lib/api/useGameEvents";
import {
	fetchLobby,
	gamePath,
	isHostPlayer,
	joinLink,
	lobbyQueryKey,
	startGame,
} from "@/lib/api/lobby";

import { loadSession } from "@/lib/api/session";
import { LobbyView } from "./LobbyView";

/** Live lobby: refreshes on SignalR events and moves into the game once it starts. */
export function LobbyPage({ gameId }: { gameId: string }) {
	const router = useRouter();
	useGameEvents(gameId);
	const query = useQuery({ queryKey: lobbyQueryKey(gameId), queryFn: () => fetchLobby(gameId) });
	const start = useMutation({ mutationFn: () => startGame(gameId) });
	const started = query.data?.started === true;

	useEffect(() => {
		if (started) router.replace(gamePath(gameId));
	}, [started, router, gameId]);

	if (query.isError) return <p role="alert">{query.error.message}</p>;

	if (!query.data) return <p>Loading lobby…</p>;

	const copy = () => void navigator.clipboard?.writeText(joinLink(location.origin, query.data.code));

	return (
		<LobbyView
			lobby={query.data}
			isHost={isHostPlayer(query.data, loadSession()?.playerId)}
			starting={start.isPending}
			error={start.error?.message}
			onStart={() => start.mutate()}
			onCopy={copy}
		/>
	);
}
