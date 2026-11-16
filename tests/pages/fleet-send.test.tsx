import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FleetSendDialog } from "@/components/game/commands/FleetSendDialog";
import { FleetList, scoutRangeHint } from "@/components/game/panels/FleetList";
import { formatDuration, recallFleetCommand, sendFleetBody, sendFleetCommand } from "@/lib/api/game/fleetOrders";
import { playerViewFixture } from "../fixtures/apiMap";

afterEach(() => vi.unstubAllGlobals());

const holding = { planet: "a1", mines: {}, hasShipyard: true, hasDefense: false, ships: { Hauler: 2, Scout: 1 }, queue: [] };

const wrap = (node: React.ReactNode) => renderToString(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);

describe("fleet orders", () => {
	it("builds the send body without empty ship counts and with lower-case cargo", () => {
		const draft = { from: "a1", to: "b1", ships: { Hauler: 2, Scout: 0 }, cargo: { Iron: 5, Helium3: 1 } as const };

		expect(sendFleetBody(draft)).toEqual({ from: "a1", to: "b1", ships: { Hauler: 2 }, cargo: { iron: 5, hydrogen: 0, titanium: 0, helium3: 1 } });
		expect(sendFleetCommand(draft)).toMatchObject({ type: "sendFleet", from: "a1", to: "b1" });
	});

	it("sends no cargo when nothing is loaded and builds a recall", () => {
		expect(sendFleetBody({ from: "a1", to: "b1", ships: { Scout: 1 }, cargo: {} }).cargo).toBeNull();
		expect(recallFleetCommand("f1")).toMatchObject({ type: "recallFleet", fleet: "f1" });
	});

	it("formats durations", () => {
		expect(formatDuration(45)).toBe("45s");
		expect(formatDuration(320)).toBe("5m 20s");
		expect(formatDuration(-3)).toBe("0s");
	});
});

describe("fleet panels", () => {
	it("lists ships and destinations in the dialog", () => {
		const html = wrap(<FleetSendDialog gameId="g1" holding={holding} destinations={[{ id: "b1", name: "Beta I" }]} gameTime={0} />);

		expect(html).toContain("Hauler");
		expect(html).toContain("Beta I");
		expect(html).toContain("Get quote");
	});

	it("shows a recall button for our fleets in flight", () => {
		const fleets = [{ ...playerViewFixture.fleets[0], side: "Team" as const, arriveAt: 2000 }];
		const html = wrap(<FleetList gameId="g1" fleets={fleets} gameTime={1000} />);

		expect(html).toContain("Recall");
	});
});

describe("scout range hint", () => {
	const flying = { ...playerViewFixture.fleets[0], side: "Team" as const, arriveAt: 2000 };

	it.each([
		[2, "Sees systems within 2 jumps."],
		[1, "Sees systems within 1 jump."],
	])("shows the sight range for %i hops", (sightHops, text) => {
		const html = wrap(<FleetList gameId="g1" fleets={[{ ...flying, sightHops }]} gameTime={1000} />);

		expect(html).toContain(text);
		expect(scoutRangeHint(sightHops)).toBe(text);
	});

	it("says nothing for fleets without scouting range", () => {
		const html = wrap(<FleetList gameId="g1" fleets={[{ ...flying, sightHops: 0 }]} gameTime={1000} />);

		expect(html).not.toContain("Sees systems");
	});
});
