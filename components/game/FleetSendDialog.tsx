"use client";

import { useState } from "react";
import { ELEMENTS, useGameCommand } from "@/lib/api/commands";
import { type FleetDraft, formatDuration, sendFleetCommand, useQuote } from "@/lib/api/fleetOrders";
import type { HoldingDto } from "@/lib/api/adapters/schemas";

type Destination = { id: string; name: string };
type DialogProps = { gameId: string; holding: HoldingDto; destinations: Destination[]; gameTime: number };

const HAULER = "Hauler";

export function NumberField({ label, value, max, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) {
	return (
		<label>
			{label}
			<input type="number" min={0} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
		</label>
	);
}

// Shows the quote result: loading, an error, or the trip's cost and arrival time.
export function QuoteText({ quote, gameTime }: { quote: ReturnType<typeof useQuote>; gameTime: number }) {
	const result = quote.data;

	if (quote.error) return <p role="alert">{quote.error.message}</p>;

	if (!result) return null;

	if (!result.ok) return <p role="alert">{result.error ?? "Trip not possible"}</p>;

	return (
		<p>
			{`Prep ${formatDuration(result.departAt - gameTime)}, flight ${formatDuration(result.arriveAt - result.departAt)}, arrives in ${formatDuration(result.arriveAt - gameTime)}`}
		</p>
	);
}

/** Pick ships and a destination, see the quoted trip time, then send. Hauler cargo is optional. */
export function FleetSendDialog({ gameId, holding, destinations, gameTime }: DialogProps) {
	const [draft, setDraft] = useState<FleetDraft>({ from: holding.planet, to: destinations[0]?.id ?? "", ships: {}, cargo: {} });
	const quote = useQuote(gameId);
	const send = useGameCommand(gameId);
	const shipTypes = Object.entries(holding.ships).filter(([, count]) => count > 0);
	const hasHauler = (draft.ships[HAULER] ?? 0) > 0;
	const canAsk = draft.to !== "" && Object.values(draft.ships).some((count) => count > 0);

	return (
		<section className="panel" aria-label="Send fleet">
			<h3>Send fleet</h3>
			{shipTypes.length === 0 && <p className="dim">No ships here.</p>}
			{shipTypes.map(([ship, available]) => (
				<NumberField key={ship} label={ship} max={available} value={draft.ships[ship] ?? 0} onChange={(count) => setDraft({ ...draft, ships: { ...draft.ships, [ship]: count } })} />
			))}

			<label>
				Destination
				<select value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })}>
					{destinations.map((planet) => (
						<option key={planet.id} value={planet.id}>{planet.name}</option>
					))}

				</select>
			</label>
			{hasHauler && ELEMENTS.map((element) => (
				<NumberField key={element} label={`Cargo ${element}`} value={draft.cargo[element] ?? 0} onChange={(amount) => setDraft({ ...draft, cargo: { ...draft.cargo, [element]: amount } })} />
			))}

			<button disabled={!canAsk || quote.isPending} onClick={() => quote.mutate(draft)}>Get quote</button>
			<button disabled={!quote.data?.ok || send.isPending} onClick={() => send.mutate(sendFleetCommand(draft))}>Send</button>
			<QuoteText quote={quote} gameTime={gameTime} />
			{send.data && !send.data.ok && <p role="alert">{send.data.error}</p>}
		</section>
	);
}
