"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameEvents } from "@/lib/api/useGameEvents";
import { useGetLobby, useStartGame } from "@/lib/api/generated/api";
import { gamePath, isHostPlayer, joinLink, parseLobby } from "@/lib/api/lobby";

import { friendlyError } from "@/lib/api/errors";
import { loadSession } from "@/lib/api/session";
import { LobbyView } from "./LobbyView";

const errorText = friendlyError;

/** Live lobby: refreshes on SignalR events and moves into the game once it starts. */
export function LobbyPage({ gameId }: { gameId: string }) {
	const router = useRouter();
	useGameEvents(gameId);
	const query = useGetLobby(gameId, { query: { select: parseLobby } });
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
			onStart={() => start.mutate({ gameId })}
			copied={copied}
			shareLink={joinLink(location.origin, query.data.code)}
			onCopy={copy}
		/>
	);
}
