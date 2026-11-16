"use client";

import { useGetMap, useGetOutcome, useGetState } from "@/lib/api/generated/api";
import { galaxyMapSchema, outcomeSchema, playerViewSchema, type GalaxyMapDto, type OutcomeDto, type PlayerViewDto } from "@/lib/api/adapters/schemas";

/** The generated client types these responses as void (no response schema in the OpenAPI file), so parse them here. */
const parseMap = (body: unknown): GalaxyMapDto => galaxyMapSchema.parse(body);

const parseView = (body: unknown): PlayerViewDto => playerViewSchema.parse(body);

const parseOutcome = (body: unknown): OutcomeDto => outcomeSchema.parse(body);

/** Final result from `GET /outcome`; pass the game id only once the game is finished, undefined means do not request. */
export function useOutcome(finishedGameId: string | undefined): OutcomeDto | undefined {
	return useGetOutcome(finishedGameId ?? "", { query: { select: parseOutcome, enabled: finishedGameId !== undefined } }).data;
}

export type GameData = { map: GalaxyMapDto; view: PlayerViewDto; fetchedAtMs: number };

/** Map and player view of one game; `fetchedAtMs` is the local time the view arrived, for the clock sync. */
export function useGameData(gameId: string): { data?: GameData; error?: Error; refetch: () => void } {
	const map = useGetMap(gameId, { query: { select: parseMap } });
	const state = useGetState(gameId, { query: { select: parseView } });
	const error = (map.error ?? state.error) as Error | null;

	const refetch = () => {
		void map.refetch();
		void state.refetch();
	};

	if (error) return { error, refetch };

	if (!map.data || !state.data) return { refetch };

	return { data: { map: map.data, view: state.data, fetchedAtMs: state.dataUpdatedAt }, refetch };
}
