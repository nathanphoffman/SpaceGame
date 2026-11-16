import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getGetStateQueryKey, postCommand } from "@/lib/api/generated/api";
import type { CommandBody } from "@/lib/api/generated/model";

const commandResultSchema = z.object({ ok: z.boolean(), error: z.string().nullable().optional() });

export type CommandResult = z.infer<typeof commandResultSchema>;

export const ELEMENTS = ["Iron", "Hydrogen", "Titanium", "Helium3"] as const;
export type ElementName = (typeof ELEMENTS)[number];
export const SHIPYARD = "Shipyard";
export const DEFENSE = "Defense";
export const HAULER = "Hauler";
export const ENEMY_SIDE = "Enemy";
export const MINING = "Mining";
export type BuildingName = "Mine" | typeof SHIPYARD | typeof DEFENSE | typeof MINING;

/** A command body with every field the API requires, null unless the caller sets it. */
export function commandBody(fields: Partial<CommandBody> & { type: string }): CommandBody {
	return {
		planet: null, buildingType: null, element: null, shipType: null, count: null,
		from: null, to: null, ships: {}, cargo: null, fleet: null, itemId: null,
		...fields,
	};
}

export function buildBuildingBody(planet: string, building: BuildingName, element?: ElementName): CommandBody {
	return commandBody({ type: "buildBuilding", planet, buildingType: building, element: element ?? null });
}

export const SHIP_TYPES = ["Scout", "Hauler", "Colony", "Fighter", "Battleship", "Dreadnought"] as const;
export type ShipName = (typeof SHIP_TYPES)[number];

export function queueShipBody(planet: string, ship: ShipName, count = 1): CommandBody {
	return commandBody({ type: "queueShip", planet, shipType: ship, count });
}

export function cancelQueueItemBody(planet: string, itemId: string): CommandBody {
	return commandBody({ type: "cancelQueueItem", planet, itemId });
}

/** Turns auto on or off for a mine (give the element) or a ship type (give the ship). */
export function toggleAutoBody(planet: string, what: { element: ElementName } | { ship: ShipName }): CommandBody {
	return "ship" in what
		? commandBody({ type: "toggleAuto", planet, shipType: what.ship })
		: commandBody({ type: "toggleAuto", planet, buildingType: "Mine", element: what.element });
}

/** True when the planet already repeats this mine or ship by itself. */
export function isAutoOn(auto: { element: string | null; ship: string | null }[], what: { element: ElementName } | { ship: ShipName }): boolean {
	return auto.some((order) => ("ship" in what ? order.ship === what.ship : order.ship === null && order.element === what.element));
}

/** Posts one command and parses the answer. */
export async function sendCommand(gameId: string, body: CommandBody): Promise<CommandResult> {
	return commandResultSchema.parse(await postCommand(gameId, body));
}

/** Sends one command; resolves to the server's CommandResult (a refusal is a result, not a thrown error) and refreshes the player view. */
export function useGameCommand(gameId: string) {
	const queryClient = useQueryClient();

	return useMutation<CommandResult, Error, CommandBody>({
		mutationFn: (body) => sendCommand(gameId, body),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetStateQueryKey(gameId) }),
	});
}
