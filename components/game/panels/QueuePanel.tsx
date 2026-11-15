"use client";

import { cancelQueueItemBody } from "@/lib/api/game/commands";
import type { HoldingDto, QueueItemDto } from "@/lib/api/adapters/schemas";
import { CommandButtons } from "@/components/game/commands/CommandButtons";

function joinCounts(counts: Record<string, number>): string {
	return Object.entries(counts)
		.filter(([, count]) => count > 0)
		.map(([name, count]) => `${name} ${count}`)
		.join(", ");
}

function buildingNames(holding: HoldingDto): string[] {
	// Turn each mine into a short label such as "iron mine L2".
	const mines = Object.entries(holding.mines).map(([element, level]) => `${element} mine L${level}`);

	// Mines first, then the shipyard and defense when present.
	return [...mines, ...(holding.hasShipyard ? ["Shipyard"] : []), ...(holding.hasDefense ? ["Defense"] : [])];
}

/** Owner, finished buildings and parked ships of the planet; a planet without a holding is not ours. */
export function HoldingSummary({ holding }: { holding?: HoldingDto }) {
	if (!holding) return <p className="dim">Owner: nobody you know of</p>;

	const buildings = buildingNames(holding).join(", ") || "none";
	const ships = joinCounts(holding.ships) || "none";

	return (
		<div>
			<p className="good">Owner: you</p>
			<p>{`Buildings: ${buildings}`}</p>
			<p>{`Ships: ${ships}`}</p>
		</div>
	);
}

/** What the item builds, taken from the data the API sends. */
function itemLabel(item: QueueItemDto): string {
	if (item.ship) return `${item.ship} ship`;

	const kind = item.element ? `${item.element} ${item.building}` : (item.building ?? "item");

	return `${kind} L${item.level}`;
}

function QueueRow({ gameId, planetId, item, gameTime }: { gameId: string; planetId: string; item: QueueItemDto; gameTime: number }) {
	const secondsLeft = Math.max(0, item.finishAt - gameTime);
	const cancel = [{ label: "Cancel", body: cancelQueueItemBody(planetId, item.id) }];

	return (
		<li>
			{`${itemLabel(item)} (cost ${joinCounts(item.cost) || "free"}, ${secondsLeft}s left)`}
			<CommandButtons gameId={gameId} options={cancel} />
		</li>
	);
}

/** The build queue of one planet with a cancel button per item. */
export function QueueList({ gameId, planetId, holding, gameTime }: { gameId: string; planetId: string; holding?: HoldingDto; gameTime: number }) {
	const queue = holding?.queue ?? [];

	return (
		<section aria-label="Queue">
			<h3>Queue</h3>
			{queue.length === 0 && <p className="dim">Nothing queued.</p>}
			<ul>
				{queue.map((item) => (
					<QueueRow key={item.id} gameId={gameId} planetId={planetId} item={item} gameTime={gameTime} />
				))}

			</ul>
		</section>
	);
}
