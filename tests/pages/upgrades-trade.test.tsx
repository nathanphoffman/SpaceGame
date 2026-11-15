import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TradePanel } from "@/components/game/TradePanel";
import { UpgradePanel } from "@/components/game/ShipyardPanel";
import { startUpgradeBody } from "@/lib/api/commands";
import { playerViewSchema } from "@/lib/api/adapters/schemas";
import { sendFleetCommand } from "@/lib/api/fleetOrders";
import { playerViewFixture } from "../fixtures/apiMap";

const wrap = (node: React.ReactNode) => renderToString(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);
const holding = { planet: "a1", mines: {}, hasShipyard: true, hasDefense: false, ships: { Hauler: 2 }, queue: [] };

describe("upgrades", () => {
	it("shows the four upgrades with their levels", () => {
		const html = wrap(<UpgradePanel gameId="g1" levels={{ Weapons: 2 }} />);

		expect(html).toContain("Upgrade Engines (level 0)");
		expect(html).toContain("Upgrade Weapons (level 2)");
		expect(html).toContain("Upgrade Armor");
		expect(html).toContain("Upgrade Mining");
	});

	it("builds the start upgrade command", () => {
		expect(startUpgradeBody("Armor")).toMatchObject({ type: "startUpgrade", upgradeType: "Armor" });
	});

	it("defaults missing upgrade levels to none", () => {
		expect(playerViewSchema.parse({ ...playerViewFixture }).upgrades).toEqual({});
	});
});

describe("trade", () => {
	it("is shown only when a Hauler is at the planet", () => {
		const destinations = [{ id: "b1", name: "Beta I" }];

		expect(wrap(<TradePanel gameId="g1" holding={holding} destinations={destinations} gameTime={0} />)).toContain("Quote trade");
		expect(wrap(<TradePanel gameId="g1" holding={{ ...holding, ships: {} }} destinations={destinations} gameTime={0} />)).toBe("");
	});

	it("sends Haulers with cargo as a sendFleet command", () => {
		const body = sendFleetCommand({ from: "a1", to: "b1", ships: { Hauler: 1 }, cargo: { Iron: 50 } });

		expect(body).toMatchObject({ type: "sendFleet", ships: { Hauler: 1 }, cargo: { iron: 50 } });
	});
});
