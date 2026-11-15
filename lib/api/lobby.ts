import { z } from "zod";

const lobbySchema = z.object({
	code: z.string(),
	mode: z.string(),
	started: z.boolean(),
	players: z.array(z.object({ id: z.string(), name: z.string(), isHost: z.boolean() })),
});

export type Lobby = z.infer<typeof lobbySchema>;

export const gamePath = (gameId: string) => `/game/${gameId}`;

/** Parses the lobby body; the generated client types it as void because the OpenAPI file has no response schema. */
export const parseLobby = (body: unknown): Lobby => lobbySchema.parse(body);

/** Link a friend can open to land on the join form with the code filled in. */
export function joinLink(origin: string, code: string): string {
	return `${origin}/?code=${encodeURIComponent(code)}`;
}

/** The host is the player whose id matches the stored session and who has isHost set. */
export function isHostPlayer(lobby: Lobby, playerId: string | undefined): boolean {
	return lobby.players.some((player) => player.isHost && player.id === playerId);
}
