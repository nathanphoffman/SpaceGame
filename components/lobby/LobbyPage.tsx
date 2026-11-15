"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGameEvents } from "@/lib/api/useGameEvents";
import { useGetLobby, useStartGame } from "@/lib/api/generated/api";
import { gamePath, isHostPlayer, joinLink, parseLobby } from "@/lib/api/lobby";

import { loadSession } from "@/lib/api/session";
import { LobbyView } from "./LobbyView";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");

/** Live lobby: refreshes on SignalR events and moves into the game once it starts. */
export function LobbyPage({ gameId }: { gameId: string }) {
	const router = useRouter();
	useGameEvents(gameId);
	const query = useGetLobby(gameId, { query: { select: parseLobby } });
	const start = useStartGame();
	const started = query.data?.started === true;

	useEffect(() => {
		if (started) router.replace(gamePath(gameId));
	}, [started, router, gameId]);

	if (query.isError) return <p role="alert">{errorText(query.error)}</p>;

	if (!query.data) return <p>Loading lobby…</p>;

	const copy = () => void navigator.clipboard?.writeText(joinLink(location.origin, query.data.code));

	return (
		<LobbyView
			lobby={query.data}
			isHost={isHostPlayer(query.data, loadSession()?.playerId)}
			starting={start.isPending}
			error={start.error ? errorText(start.error) : undefined}
			onStart={() => start.mutate({ gameId })}
			onCopy={copy}
		/>
	);
}
