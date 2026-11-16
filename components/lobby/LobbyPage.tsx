"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameEvents } from "@/lib/api/game/useGameEvents";
import { useGetLobby, useStartGame } from "@/lib/api/generated/api";
import { gamePath, isHostPlayer, joinLink, parseLobby } from "@/lib/api/lobby";

import { friendlyError } from "@/lib/api/core/errors";
import { loadSession } from "@/lib/api/core/session";
import { LobbyView } from "./LobbyView";

const errorText = friendlyError;

/** How often the lobby asks the server who has joined and whether the host started, in case live updates are down. */
const LOBBY_POLL_MS = 3000;

/** Live lobby: refreshes on SignalR events and moves into the game once it starts. */
export function LobbyPage({ gameId }: { gameId: string }) {
	const router = useRouter();
	useGameEvents(gameId);
	const query = useGetLobby(gameId, { query: { select: parseLobby, refetchInterval: LOBBY_POLL_MS } });
	const start = useStartGame();
	const [copied, setCopied] = useState(false);
	const started = query.data?.started === true;

	useEffect(() => {
		if (started) router.replace(gamePath(gameId));
	}, [started, router, gameId]);

	if (query.isError) return <p role="alert">{errorText(query.error)}</p>;

	if (!query.data) return <p>Loading lobby…</p>;

	const copy = () => {
		void navigator.clipboard?.writeText(joinLink(location.origin, query.data.code));
		setCopied(true);
	};

	return (
		<LobbyView
			lobby={query.data}
			isHost={isHostPlayer(query.data, loadSession()?.playerId)}
			starting={start.isPending}
			error={start.error ? errorText(start.error) : undefined}
			onStart={() => start.mutate({ gameId }, { onSuccess: () => void query.refetch() })}
			copied={copied}
			shareLink={joinLink(location.origin, query.data.code)}
			onCopy={copy}
		/>
	);
}
