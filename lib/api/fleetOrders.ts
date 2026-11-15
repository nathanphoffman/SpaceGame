import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import { PostQuoteResponse } from "./generated/zod/play-endpoints/play-endpoints.zod";
import { postQuote } from "./generated/api";
import type { Resources, SendFleetBody } from "./generated/model";
import { commandBody, ELEMENTS, type ElementName } from "./commands";
import type { CommandBody } from "./generated/model";

const quoteSchema = PostQuoteResponse.transform((quote) => ({
	ok: quote.ok,
	error: quote.error,
	departAt: Number(quote.departAt),
	arriveAt: Number(quote.arriveAt),
}));

export type QuoteResult = z.output<typeof quoteSchema>;

export type FleetDraft = { from: string; to: string; ships: Record<string, number>; cargo: Partial<Record<ElementName, number>> };

/** The API names cargo keys in lower case ("helium3"). */
function toResources(cargo: FleetDraft["cargo"]): Resources | null {
	const amounts = Object.values(cargo).reduce((sum, value) => sum + (value ?? 0), 0);

	if (amounts <= 0) return null;

	const [iron, hydrogen, titanium, helium3] = ELEMENTS.map((element) => cargo[element] ?? 0);

	return { iron, hydrogen, titanium, helium3 };
}

function chosenShips(ships: Record<string, number>): Record<string, number> {
	return Object.fromEntries(Object.entries(ships).filter(([, count]) => count > 0));
}

export function sendFleetBody(draft: FleetDraft): SendFleetBody {
	return { from: draft.from, to: draft.to, ships: chosenShips(draft.ships), cargo: toResources(draft.cargo) };
}

export function sendFleetCommand(draft: FleetDraft): CommandBody {
	return commandBody({ type: "sendFleet", from: draft.from, to: draft.to, ships: chosenShips(draft.ships), cargo: toResources(draft.cargo) });
}

export function recallFleetCommand(fleetId: string): CommandBody {
	return commandBody({ type: "recallFleet", fleet: fleetId });
}

/** Asks the server how long a trip would take. */
export function useQuote(gameId: string) {
	return useMutation<QuoteResult, Error, FleetDraft>({
		mutationFn: async (draft) => quoteSchema.parse((await postQuote(gameId, sendFleetBody(draft))).data),
	});
}

/** "5m 20s" style text for a number of seconds. */
export function formatDuration(totalSeconds: number): string {
	const seconds = Math.max(0, Math.round(totalSeconds));
	const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);

	return minutes > 0 ? `${minutes}m ${seconds % SECONDS_PER_MINUTE}s` : `${seconds}s`;
}

const SECONDS_PER_MINUTE = 60;
