import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuildingIcon } from "@/components/game/shell/BuildingIcon";
import { ElementIcon } from "@/components/game/shell/ElementIcon";
import { leadShip, ShipIcon } from "@/components/game/shell/ShipIcon";
import { isAutoOn, toggleAutoBody } from "@/lib/api/game/commands";

describe("icons", () => {
	it("draws a different shape for each ship type", () => {
		const shapes = ["Fighter", "Hauler", "Colony", "Battleship", "Dreadnought"].map((ship) => renderToString(<ShipIcon ship={ship} />));

		expect(new Set(shapes).size).toBe(shapes.length);
	});

	it("shows a fleet as its biggest ship", () => {
		expect(leadShip({ Fighter: 5, Hauler: 1, Battleship: 1 })).toBe("Battleship");
		expect(leadShip({ Scout: 1 })).toBe("Scout");
	});

	it("draws electrons for the element's real shells", () => {
		expect(renderToString(<ElementIcon element="Iron" />).match(/<circle/g)).toHaveLength(4 + 26 + 1); // 4 shell rings + 26 electrons + nucleus
		expect(renderToString(<ElementIcon element="Helium3" />).match(/<circle/g)).toHaveLength(1 + 2 + 1);
	});

	it("draws a shield and a hammer", () => {
		expect(renderToString(<BuildingIcon building="Defense" />)).not.toBe(renderToString(<BuildingIcon building="Shipyard" />));
	});
});

describe("auto orders", () => {
	it("toggles a mine by element and a ship by type", () => {
		expect(toggleAutoBody("a1", { element: "Iron" })).toMatchObject({ type: "toggleAuto", planet: "a1", buildingType: "Mine", element: "Iron" });
		expect(toggleAutoBody("a1", { ship: "Fighter" })).toMatchObject({ type: "toggleAuto", shipType: "Fighter" });
	});

	it("knows which orders are on", () => {
		const auto = [{ element: "Iron", ship: null }, { element: null, ship: "Fighter" }];

		expect(isAutoOn(auto, { element: "Iron" })).toBe(true);
		expect(isAutoOn(auto, { element: "Titanium" })).toBe(false);
		expect(isAutoOn(auto, { ship: "Fighter" })).toBe(true);
		expect(isAutoOn(auto, { ship: "Hauler" })).toBe(false);
	});
});
