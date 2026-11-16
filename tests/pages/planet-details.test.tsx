import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBuildingBody, cancelQueueItemBody, commandBody, queueShipBody, sendCommand } from "@/lib/api/game/commands";
import { PlanetDetails } from "@/components/game/panels/PlanetDetails";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { galaxyMapFixture } from "../fixtures/apiMap";

afterEach(() => vi.unstubAllGlobals());

describe("build command body", () => {
	it("fills every field the API requires", () => {
		const body = buildBuildingBody("a1", "Mine", "Iron");
		expect(body).toMatchObject({ type: "buildBuilding", planet: "a1", buildingType: "Mine", element: "Iron", itemId: null });
	});

	it("leaves the element empty for a shipyard", () => {
		expect(buildBuildingBody("a1", "Shipyard").element).toBeNull();
		expect(commandBody({ type: "x" }).ships).toEqual({});
	});
});

const ownedHolding = { planet: "a2", mines: {}, hasShipyard: false, hasDefense: false, shipyardLevel: 1, defenseLevel: 0, miningLevel: 0, ships: {}, queue: [], auto: [] };

describe("PlanetDetails", () => {
	it("shows no build, ship or upgrade buttons on a planet without a base", () => {
		const planet = galaxyMapFixture.systems[0].planets[1];
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<PlanetDetails gameId="g1" planet={planet} />
			</QueryClientProvider>,
		);

		expect(html).toContain("Alpha II");
		expect(html).not.toContain("Shipyard");
		expect(html).not.toContain("Build Dreadnought");
		expect(html).not.toContain("Upgrade Mining");
		expect(html).not.toContain("Nothing queued.");
	});

	it("shows richness, the objective flag and the six build buttons", () => {
		const planet = galaxyMapFixture.systems[0].planets[1];
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<PlanetDetails gameId="g1" planet={planet} holding={ownedHolding} />
			</QueryClientProvider>,
		);

		expect(html).toContain("Alpha II");
		expect(html).toContain("Objective planet");
		expect(html).toContain("Helium3: 80");
		expect(html).toContain("Mine Titanium");
		expect(html).toContain("Upgrade Shipyard");
		expect(html).toContain("Build Defense");
	});

	it("shows ship and upgrade buttons", () => {
		const planet = galaxyMapFixture.systems[0].planets[1];
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<PlanetDetails gameId="g1" planet={planet} holding={ownedHolding} />
			</QueryClientProvider>,
		);

		expect(html).toContain("Build Dreadnought");
		expect(html).toContain("Upgrade Mining");
	});
});

describe("ship bodies", () => {
	it("queues ships", () => {
		expect(queueShipBody("a1", "Fighter", 2)).toMatchObject({ type: "queueShip", planet: "a1", shipType: "Fighter", count: 2 });
	});
});

describe("sending a command", () => {
	it("posts to the commands endpoint and returns the refusal", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Not enough iron." }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const result = await sendCommand("g1", buildBuildingBody("a1", "Defense"));
		expect(result).toEqual({ ok: false, error: "Not enough iron." });
		expect(fetchMock.mock.calls[0][0]).toContain("/api/games/g1/commands");
	});
});

describe("queue and holding", () => {
	const holding = {
		planet: "a2", mines: { Iron: 2 }, hasShipyard: true, hasDefense: false, shipyardLevel: 1, defenseLevel: 0, miningLevel: 0, ships: { Scout: 3 },
		auto: [],
		queue: [{ id: "q1", building: null, element: null, ship: "Fighter", level: 1, startAt: 0, finishAt: 90, cost: { Iron: 50 } }],
	};

	it("shows owner, buildings, ships and the queue with a cancel button", () => {
		const planet = galaxyMapFixture.systems[0].planets[1];
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<PlanetDetails gameId="g1" planet={planet} holding={holding} gameTime={30} />
			</QueryClientProvider>,
		);

		expect(html).toContain("Owner: you");
		expect(html).toContain("Iron mine L2, Shipyard L1");
		expect(html).toContain("Scout 3");
		expect(html).toContain("Fighter ship (cost Iron 50, 60s left)");
		expect(html).toContain("Cancel");
	});

	it("builds the cancel command from the queue item id", () => {
		expect(cancelQueueItemBody("a2", "q1")).toMatchObject({ type: "cancelQueueItem", planet: "a2", itemId: "q1" });
	});

	it("says when nothing is queued", () => {
		const html = renderToString(
			<QueryClientProvider client={new QueryClient()}>
				<PlanetDetails gameId="g1" planet={galaxyMapFixture.systems[0].planets[0]} holding={ownedHolding} />
			</QueryClientProvider>,
		);

		expect(html).toContain("Nothing queued.");
	});
});
