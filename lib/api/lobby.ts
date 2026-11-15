import type { z } from "zod";
import { GetLobbyResponse } from "./generated/zod/lobby-endpoints/lobby-endpoints.zod";

export type Lobby = z.infer<typeof GetLobbyResponse>;

export const gamePath = (gameId: string) => `/game/${gameId}`;

/** Parses the lobby body with the generated schema. */
export const parseLobby = (body: unknown): Lobby => GetLobbyResponse.parse(body);

/** Link a friend can open to land on the join form with the code filled in. */
export function joinLink(origin: string, code: string): string {
	return `${origin}/?code=${encodeURIComponent(code)}`;
}

/** The host is the player whose id matches the stored session and who has isHost set. */
export function isHostPlayer(lobby: Lobby, playerId: string | undefined): boolean {
	return lobby.players.some((player) => player.isHost && player.id === playerId);
}
