"use client";

import { useGameCommand } from "@/lib/api/commands";
import type { CommandBody } from "./commandTypes";

export type CommandOption = { label: string; body: CommandBody };

/** One button per option; the server decides if the order is allowed and a refusal shows as text. Costs and times are never shown from a local table. */
export function CommandButtons({ gameId, options }: { gameId: string; options: CommandOption[] }) {
	const command = useGameCommand(gameId);
	const refusal = command.data && !command.data.ok ? command.data.error : undefined;

	return (
		<div>
			{options.map((option) => (
				<button
					key={option.label}
					disabled={command.isPending}
					// Each button sends its own order, so the handler closes over its option.
					onClick={() => command.mutate(option.body)}
				>
					{option.label}
				</button>
			))}
			{refusal && <p role="alert">{refusal}</p>}
			{command.error && <p role="alert">{command.error.message}</p>}
		</div>
	);
}
