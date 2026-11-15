"use client";

import { useGetMap, useGetState } from "./generated/api";
import { galaxyMapSchema, playerViewSchema, type GalaxyMapDto, type PlayerViewDto } from "./adapters/schemas";

/** The generated client types these responses as void (no response schema in the OpenAPI file), so parse them here. */
const parseMap = (body: unknown): GalaxyMapDto => galaxyMapSchema.parse(body);

const parseView = (body: unknown): PlayerViewDto => playerViewSchema.parse(body);

export type GameData = { map: GalaxyMapDto; view: PlayerViewDto; fetchedAtMs: number };

/** Map and player view of one game; `fetchedAtMs` is the local time the view arrived, for the clock sync. */
export function useGameData(gameId: string): { data?: GameData; error?: Error } {
	const map = useGetMap(gameId, { query: { select: parseMap } });
	const state = useGetState(gameId, { query: { select: parseView } });
	const error = (map.error ?? state.error) as Error | null;

	if (error) return { error };

	if (!map.data || !state.data) return {};

	return { data: { map: map.data, view: state.data, fetchedAtMs: state.dataUpdatedAt } };
}
