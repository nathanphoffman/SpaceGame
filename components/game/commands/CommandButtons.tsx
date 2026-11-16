"use client";

import { useGameCommand } from "@/lib/api/game/commands";
import type { ReactNode } from "react";
import type { CommandBody } from "@/components/game/commands/commandTypes";

/** `auto` makes the button repeat by itself: right-click sends `toggle`, and `on` shows the spinning ring. `icon` is an element name to draw its atom. */
export type CommandOption = { label: string; body: CommandBody; icon?: ReactNode; auto?: { on: boolean; toggle: CommandBody } };

/** One button per option; the server decides if the order is allowed and a refusal shows as text. Costs and times are never shown from a local table. */
export function CommandButtons({ gameId, options }: { gameId: string; options: CommandOption[] }) {
	const command = useGameCommand(gameId);
	const refusal = command.data && !command.data.ok ? command.data.error : undefined;

	return (
		<div className="btn-row">
			{/* one button per command option; each closure sends its own option */}
			{options.map((option) => (
				<button
					key={option.label}
					disabled={command.isPending}

					// How it works: map runs once per option, and the arrow function below remembers that option, so each click sends its own order.
					onClick={() => command.mutate(option.body)}
					className={option.auto?.on ? "auto-on" : undefined}
					title={option.auto ? `Right-click to turn auto ${option.auto.on ? "off" : "on"}` : undefined}
					onContextMenu={(event) => {
						if (!option.auto) return;
						event.preventDefault();
						command.mutate(option.auto.toggle);
					}}
				>
					{option.icon}
					{option.label}
				</button>
			))}

			{refusal && <p role="alert">{refusal}</p>}
			{command.error && <p role="alert">{command.error.message}</p>}
		</div>
	);
}
