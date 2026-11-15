import { z } from "zod";
import { apiFetch } from "./client";

const lobbySchema = z.object({
	code: z.string(),
	mode: z.string(),
	started: z.boolean(),
	players: z.array(z.object({ id: z.string(), name: z.string(), isHost: z.boolean() })),
});

export type Lobby = z.infer<typeof lobbySchema>;

export const gamePath = (gameId: string) => `/game/${gameId}`;

/** Query key starts with the game URL so SignalR events invalidate it. */
export const lobbyQueryKey = (gameId: string) => [`/api/games/${gameId}/lobby`] as const;

export async function fetchLobby(gameId: string): Promise<Lobby> {
	return lobbySchema.parse(await apiFetch<unknown>(`/api/games/${gameId}/lobby`));
}

export async function startGame(gameId: string): Promise<void> {
	await apiFetch<unknown>(`/api/games/${gameId}/start`, { method: "POST" });
}

/** Link a friend can open to land on the join form with the code filled in. */
export function joinLink(origin: string, code: string): string {
	return `${origin}/new?code=${encodeURIComponent(code)}`;
}

/** The host is the player whose id matches the stored session and who has isHost set. */
export function isHostPlayer(lobby: Lobby, playerId: string | undefined): boolean {
	return lobby.players.some((player) => player.isHost && player.id === playerId);
}
