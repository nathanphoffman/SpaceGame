import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { AttackWarnings } from "@/components/game/AttackWarnings";
import { BattleToast } from "@/components/game/BattleToast";
import { ReportList, ReportSummary } from "@/components/game/ReportViews";
import { attachGameEvents, type HubConnectionLike } from "@/lib/api/gameEvents";
import { battleReportSchema } from "@/lib/api/reports";
import { playerViewFixture } from "../fixtures/apiMap";

const enemy = { ...playerViewFixture.fleets[0], id: "e1", side: "Enemy" as const, to: "a1", arriveAt: 400 };
const report = { id: "r1", time: 90, planet: "a1", attackersWon: false, rounds: 3 };

describe("AttackWarnings", () => {
	it("lists incoming enemy fleets with countdown and hint", () => {
		const spotted = { e1: { fleetId: "e1", targetPlanetId: "a1", arrivesAtGameTime: 400, strengthHint: "large" } };
		const html = renderToString(<AttackWarnings fleets={[enemy]} gameTime={100} spotted={spotted} />);
		expect(html).toContain("a1");
		expect(html).toContain("5m 0s");
		expect(html).toContain("strength: large");
	});

	it("shows nothing for our own or arrived fleets", () => {
		const own = { ...enemy, side: "Team" as const };
		const arrived = { ...enemy, arriveAt: 50 };
		expect(renderToString(<AttackWarnings fleets={[own, arrived]} gameTime={100} spotted={{}} />)).toBe("");
	});
});

describe("battle reports", () => {
	it("parses string numbers from the wire", () => {
		expect(battleReportSchema.parse({ ...report, time: "90", rounds: "3" })).toEqual(report);
	});

	it("renders the list and the detail", () => {
		expect(renderToString(<ReportList gameId="g1" reports={[report]} />)).toContain("/game/g1/reports/r1");
		expect(renderToString(<ReportList gameId="g1" reports={[]} />)).toContain("No battles yet");
		expect(renderToString(<ReportSummary report={report} />)).toContain("Defenders held");
	});

	it("shows a toast only when a battle happened", () => {
		expect(renderToString(<BattleToast gameId="g1" reportId={null} />)).toBe("");
		expect(renderToString(<BattleToast gameId="g1" reportId="r1" />)).toContain("/game/g1/reports/r1");
	});

	it("passes BattleResolved to the handler", () => {
		const handlers = new Map<string, (...args: never[]) => void>();
		const connection: HubConnectionLike = {
			on: (method, handler) => void handlers.set(method, handler),
			onreconnected: () => undefined,
			start: async () => undefined,
			stop: async () => undefined,
		};

		let seen = "";
		attachGameEvents(connection, new QueryClient(), "g1", { onFleetSpotted: () => undefined, onBattleResolved: (id) => (seen = id) });
		(handlers.get("BattleResolved") as (id: string) => void)("r9");
		expect(seen).toBe("r9");
	});
});
