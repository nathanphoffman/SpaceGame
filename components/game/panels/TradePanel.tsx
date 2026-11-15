"use client";

import { useState } from "react";
import { ELEMENTS, useGameCommand } from "@/lib/api/game/commands";
import { type FleetDraft, sendFleetCommand, useQuote } from "@/lib/api/game/fleetOrders";
import type { HoldingDto } from "@/lib/api/adapters/schemas";
import { NumberField, QuoteText } from "@/components/game/commands/FleetSendDialog";

const HAULER = "Hauler";

type TradeProps = { gameId: string; holding: HoldingDto; destinations: { id: string; name: string }[]; gameTime: number };

/** Trade: load resources onto Haulers parked here and send them to another planet. Only shown when a Hauler is here. */
export function TradePanel({ gameId, holding, destinations, gameTime }: TradeProps) {
	const available = holding.ships[HAULER] ?? 0;
	const [draft, setDraft] = useState<FleetDraft>({ from: holding.planet, to: destinations[0]?.id ?? "", ships: { [HAULER]: Math.min(1, available) }, cargo: {} });
	const quote = useQuote(gameId);
	const send = useGameCommand(gameId);
	const loaded = ELEMENTS.some((element) => (draft.cargo[element] ?? 0) > 0);

	if (available <= 0) return null;

	return (
		<section className="panel" aria-label="Trade">
			<h3>Trade</h3>
			<NumberField label="Haulers" max={available} value={draft.ships[HAULER] ?? 0} onChange={(count) => setDraft({ ...draft, ships: { [HAULER]: count } })} />
			<label>
				Trade with
				<select value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })}>
					{destinations.map((planet) => (
						<option key={planet.id} value={planet.id}>{planet.name}</option>
					))}

				</select>
			</label>
			{/* one number field per element; each edits that element's entry in the cargo draft */}
			{ELEMENTS.map((element) => (
				<NumberField key={element} label={`Load ${element}`} value={draft.cargo[element] ?? 0} onChange={(amount) => setDraft({ ...draft, cargo: { ...draft.cargo, [element]: amount } })} />
			))}

			<button disabled={!loaded || quote.isPending} onClick={() => quote.mutate(draft)}>Quote trade</button>
			<button disabled={!quote.data?.ok || send.isPending} onClick={() => send.mutate(sendFleetCommand(draft))}>Send haulers</button>
			<QuoteText quote={quote} gameTime={gameTime} />
			{send.data && !send.data.ok && <p role="alert">{send.data.error}</p>}
		</section>
	);
}
