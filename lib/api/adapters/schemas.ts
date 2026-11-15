import { z } from "zod";
import { GetMapResponse, GetStateResponse } from "../generated/zod/play-endpoints/play-endpoints.zod";
import { GetOutcomeResponse } from "../generated/zod/outcome-endpoints/outcome-endpoints.zod";
import { ListReportsResponseItem } from "../generated/zod/report-endpoints/report-endpoints.zod";

// The wire format is validated with the generated Zod schemas. The functions below only reshape the result
// for the UI: numbers that came as strings become numbers, `Resources` objects become records keyed by element
// name, and enum ordinals (the OpenAPI file types them as integers) become names.
type WireMap = z.infer<typeof GetMapResponse>;
type WireView = z.infer<typeof GetStateResponse>;
type WireOutcome = z.infer<typeof GetOutcomeResponse>;
type WireReport = z.infer<typeof ListReportsResponseItem>;
type WireResources = WireView["stockpile"];
type Wire = number | string;

export type Counts = Record<string, number>;

// Order of the C# enums in CONTRACTS.md (the wire sends their ordinals).
const BUILDING_NAMES = ["Mine", "Shipyard", "Defense"];
const ELEMENT_NAMES = ["Iron", "Hydrogen", "Titanium", "Helium3"];
const SHIP_NAMES = ["Scout", "Hauler", "Colony", "Fighter", "Battleship", "Dreadnought"];

const num = (value: Wire): number => Number(value);

// copies the wire record into plain numeric counts, dropping missing values
const countsOf = (record: Record<string, Wire> | undefined): Counts =>
	Object.fromEntries(Object.entries(record ?? {}).map(([key, value]) => [key, num(value)]));

const resourcesOf = (res: WireResources): Counts => ({
	Iron: num(res.iron),
	Hydrogen: num(res.hydrogen),
	Titanium: num(res.titanium),
	Helium3: num(res.helium3),
});

const nameOf = (names: string[], ordinal: number | null): string | null => (ordinal === null ? null : (names[ordinal] ?? null));

export type PlanetInfoDto = { id: string; name: string; isObjective: boolean; richness: Counts };
export type SystemInfoDto = { id: string; name: string; x: number; y: number; z: number; planets: PlanetInfoDto[] };
export type GalaxyMapDto = { systems: SystemInfoDto[]; enemyHome?: string };

export type FleetViewDto = {
	id: string;
	owner: string | null;
	side: "Team" | "Enemy";
	from: string;
	to: string;
	launchAt: number;
	departAt: number;
	arriveAt: number;
	ships: Counts;
	cargo: Counts;

	/** How many jumps away this fleet can see (scouts); 0 when it has no scouting range. */
	sightHops: number;
};

export type QueueItemDto = {
	id: string;
	building: string | null;
	element: string | null;
	ship: string | null;
	level: number;
	startAt: number;
	finishAt: number;
	cost: Counts;
};

export type HoldingDto = {
	planet: string;
	mines: Counts;
	hasShipyard: boolean;
	hasDefense: boolean;
	ships: Counts;
	queue: QueueItemDto[];
};

export type ContributionDto = { player: string; points: number; battlesWon: number; planetsCaptured: number };
export type OutcomeDto = { winner: string; reason: string; teamScore: number; enemyScore: number; contributions: ContributionDto[] };

export type BattleReportDto = { id: string; time: number; planet: string; attackersWon: boolean; rounds: number };

export type PlayerViewDto = {
	version: number;
	gameTime: number;
	timeLeftSeconds: number;
	teamScore: number;
	enemyScore: number;
	stockpile: Counts;
	upgrades: Counts;
	fleets: FleetViewDto[];
	holdings: HoldingDto[];
	reports: BattleReportDto[];
};

// converts the wire map; the inner map rebuilds each system the same way
const mapOf = (wire: WireMap): GalaxyMapDto => ({
	enemyHome: wire.enemyHome,
	systems: wire.systems.map((system) => ({
		...system,
		x: num(system.x),
		y: num(system.y),
		z: num(system.z),
		planets: system.planets.map((planet) => ({ ...planet, richness: countsOf(planet.richness) })),
	})),
});

const fleetOf = (fleet: WireView["fleets"][number]): FleetViewDto => ({
	...fleet,
	launchAt: num(fleet.launchAt),
	departAt: num(fleet.departAt),
	arriveAt: num(fleet.arriveAt),
	ships: countsOf(fleet.ships),
	cargo: resourcesOf(fleet.cargo),
	sightHops: num(fleet.sightHops ?? 0),
});

type WireQueueItem = NonNullable<NonNullable<WireView["holdings"]>[number]["queue"]>[number];
type WireHolding = NonNullable<WireView["holdings"]>[number];

const queueItemOf = (item: WireQueueItem): QueueItemDto => ({
	id: item.id,
	building: nameOf(BUILDING_NAMES, item.building),
	element: nameOf(ELEMENT_NAMES, item.element),
	ship: nameOf(SHIP_NAMES, item.ship),
	level: num(item.level),
	startAt: num(item.startAt),
	finishAt: num(item.finishAt),
	cost: resourcesOf(item.cost),
});

const holdingOf = (holding: WireHolding): HoldingDto => ({
	planet: holding.planet,
	mines: countsOf(holding.mines),
	hasShipyard: holding.hasShipyard ?? false,
	hasDefense: holding.hasDefense ?? false,
	ships: countsOf(holding.ships),
	queue: (holding.queue ?? []).map(queueItemOf),
});

const reportOf = (report: WireReport): BattleReportDto => ({ ...report, time: num(report.time), rounds: num(report.rounds) });

const viewOf = (wire: WireView): PlayerViewDto => ({
	version: num(wire.version),
	gameTime: num(wire.gameTime),
	timeLeftSeconds: num(wire.timeLeftSeconds),
	teamScore: num(wire.teamScore),
	enemyScore: num(wire.enemyScore),
	stockpile: resourcesOf(wire.stockpile),
	upgrades: countsOf(wire.upgrades),
	fleets: wire.fleets.map(fleetOf),
	holdings: (wire.holdings ?? []).map(holdingOf),
	reports: wire.reports.map(reportOf),
});

// converts the wire outcome into the DTO shape the UI uses
const outcomeOf = (wire: WireOutcome): OutcomeDto => ({
	winner: wire.winner,
	reason: wire.reason,
	teamScore: num(wire.teamScore),
	enemyScore: num(wire.enemyScore),
	// The contract has no per-player battle counts yet, so they show as 0.
	contributions: wire.contributions.map((row) => ({ player: row.player, points: num(row.points), battlesWon: 0, planetsCaptured: 0 })),
});

export const galaxyMapSchema = GetMapResponse.transform(mapOf);
export const playerViewSchema = GetStateResponse.transform(viewOf);
export const outcomeSchema = GetOutcomeResponse.transform(outcomeOf);
export const battleReportSchema = ListReportsResponseItem.transform(reportOf);
