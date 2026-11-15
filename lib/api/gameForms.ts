import { z } from "zod";
import { createGame as postCreateGame, joinGame as postJoinGame } from "./generated/api";
import { saveSession } from "./session";

export const GAME_MODES = ["week", "test"] as const;
export const MAX_NAME_LENGTH = 24;

const nameField = z
	.string()
	.trim()
	.min(1, "Enter a name")
	.max(MAX_NAME_LENGTH, `Use at most ${MAX_NAME_LENGTH} characters`);

const webhookField = z
	.string()
	.trim()
	.refine((value) => value === "" || URL.canParse(value), "Enter a full web address");

export const createGameSchema = z.object({
	name: nameField,
	mode: z.enum(GAME_MODES),
	discordWebhookUrl: webhookField,
});

export const joinGameSchema = z.object({
	code: z.string().trim().min(1, "Enter the game code"),
	playerName: nameField,
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;

const createdSchema = z.object({
	gameId: z.string(),
	code: z.string(),
	playerId: z.string(),
	playerToken: z.string(),
});

const joinedSchema = z.object({
	gameId: z.string(),
	playerId: z.string(),
	playerToken: z.string(),
});

/** Keyed by field name so each input can show its own first error without searching a list. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const result: Record<string, string> = {};

	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? "");

		if (!(key in result)) result[key] = issue.message;
	}

	return result;
}

/** Creates a game, stores the session and returns the id to navigate to. */
export async function createGame(input: CreateGameInput): Promise<string> {
	// The generated types describe responses as void (the OpenAPI file has none), so parse the real body.
	const response = await postCreateGame({
		name: input.name,
		mode: input.mode,
		seed: null,
		discordWebhookUrl: input.discordWebhookUrl || null,
	});

	const created = createdSchema.parse(response);
	saveSession({ gameId: created.gameId, playerId: created.playerId, token: created.playerToken });

	return created.gameId;
}

export async function joinGame(input: JoinGameInput): Promise<string> {
	const joined = joinedSchema.parse(await postJoinGame(input));
	saveSession({ gameId: joined.gameId, playerId: joined.playerId, token: joined.playerToken });

	return joined.gameId;
}

export const lobbyPath = (gameId: string) => `/game/${gameId}/lobby`;
