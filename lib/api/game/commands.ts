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
export type BuildingName = "Mine" | typeof SHIPYARD | typeof DEFENSE;

/** A command body with every field the API requires, null unless the caller sets it. */
export function commandBody(fields: Partial<CommandBody> & { type: string }): CommandBody {
	return {
		planet: null, buildingType: null, element: null, shipType: null, count: null,
		upgradeType: null, from: null, to: null, ships: {}, cargo: null, fleet: null, itemId: null,
		...fields,
	};
}

export function buildBuildingBody(planet: string, building: BuildingName, element?: ElementName): CommandBody {
	return commandBody({ type: "buildBuilding", planet, buildingType: building, element: element ?? null });
}

export const SHIP_TYPES = ["Scout", "Hauler", "Colony", "Fighter", "Battleship", "Dreadnought"] as const;
export type ShipName = (typeof SHIP_TYPES)[number];
export const UPGRADE_TYPES = ["Engines", "Weapons", "Armor", "Mining"] as const;
export type UpgradeName = (typeof UPGRADE_TYPES)[number];

export function queueShipBody(planet: string, ship: ShipName, count = 1): CommandBody {
	return commandBody({ type: "queueShip", planet, shipType: ship, count });
}

export function startUpgradeBody(upgrade: UpgradeName): CommandBody {
	return commandBody({ type: "startUpgrade", upgradeType: upgrade });
}

export function cancelQueueItemBody(planet: string, itemId: string): CommandBody {
	return commandBody({ type: "cancelQueueItem", planet, itemId });
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
