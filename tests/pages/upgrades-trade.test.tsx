import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TradePanel } from "@/components/game/panels/TradePanel";
import { UpgradePanel } from "@/components/game/panels/UpgradePanel";
import { buildBuildingBody } from "@/lib/api/game/commands";
import { playerViewSchema } from "@/lib/api/adapters/schemas";
import { sendFleetCommand } from "@/lib/api/game/fleetOrders";
import { wireViewFixture } from "../fixtures/apiMap";

const wrap = (node: React.ReactNode) => renderToString(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);
const holding = { planet: "a1", mines: {}, hasShipyard: true, hasDefense: false, shipyardLevel: 1, defenseLevel: 0, miningLevel: 0, ships: { Hauler: 2 }, queue: [], auto: [] };

describe("planet upgrades", () => {
	it("offers exactly Defense, Shipyard and Mining, with levels", () => {
		const html = wrap(<UpgradePanel gameId="g1" planetId="a1" holding={{ ...holding, defenseLevel: 3, miningLevel: 0 }} />);

		expect(html).toContain("Upgrade Defense (level 3)");
		expect(html).toContain("Upgrade Shipyard (level 1)");
		expect(html).toContain("Upgrade Mining (level 0)");
		expect(html).not.toContain("Engines");
		expect(html).not.toContain("Weapons");
		expect(html).not.toContain("Armor");
	});

	it("says Build for a Defense or Shipyard that does not exist yet", () => {
		const html = wrap(<UpgradePanel gameId="g1" planetId="a1" holding={{ ...holding, shipyardLevel: 0 }} />);

		expect(html).toContain("Build Shipyard");
		expect(html).toContain("Build Defense");
	});

	it("sends a build command for the upgrade's building", () => {
		expect(buildBuildingBody("a1", "Mining")).toMatchObject({ type: "buildBuilding", planet: "a1", buildingType: "Mining", element: null });
	});

	it("reads the planet levels from the player view", () => {
		const wire = { ...wireViewFixture, holdings: [{ planet: "a1", shipyardLevel: 2, defenseLevel: 5, miningLevel: 1 }] };
		const parsed = playerViewSchema.parse(wire).holdings[0];

		expect([parsed.shipyardLevel, parsed.defenseLevel, parsed.miningLevel]).toEqual([2, 5, 1]);
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
