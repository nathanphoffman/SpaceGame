import { randomUUID } from "crypto";
import {
	buildCost,
	buildingInfo,
	buildSeconds,
	ELEMENTS,
	FLEET_STATUS,
	flightSeconds,
	type GameState,
	MAX_BUILDING_LEVEL,
	MISSION,
	MS_PER_SECOND,
	mineElement,
	PLANET_KIND,
	productionRates,
	QUEUE_KIND,
	type Resources,
	SHIPS,
	type ShipType,
	shipSeconds,
} from "@/lib/defs";

import { validSector } from "@/lib/galaxy/sector";

import { planetStats } from "@/lib/planets/planetStats";
import { pool, ready } from "@/lib/server/db";
import { ensureSector, ensureSystem } from "@/lib/server/lazyGen";
import {
	type Fleet,
	load,
	type Planet,
	save,
	type View,
	type World,
} from "@/lib/server/world";

export class GameError extends Error {}

const NPC_RESOURCE_CAP = 3000;
const MIN_BATCH = 1; // ships per order
const MAX_BATCH = 20;

// ---------- simulation ----------

function accrue(planet: Planet, time: Date) {
	if (time <= planet.updated_at) return;

	if (planet.kind !== PLANET_KIND.empty) {
		const deltaSeconds =
			(time.getTime() - planet.updated_at.getTime()) / MS_PER_SECOND;
		const rate = productionRates(
			planet.buildings,
			planetStats(planet.seed).composition,
		);

		const limit = planet.kind === PLANET_KIND.npc ? NPC_RESOURCE_CAP : Infinity;

		for (const [el, perSec] of Object.entries(rate))
			planet.resources[el] = Math.min(
				limit,
				(planet.resources[el] ?? 0) + perSec * deltaSeconds,
			);
	}

	planet.updated_at = time;
}

const addRes = (destination: Resources, from: Resources) => {
	for (const [el, n] of Object.entries(from))
		destination[el] = (destination[el] ?? 0) + n;
};

const resText = (
	r: Resources, // turn a resource bundle into text like "60 Fe, 15 Si"
) =>

	Object.entries(r)
		.filter(([, n]) => n > 0)
		.map(([el, n]) => `${n} ${el}`)
		.join(", ") || "nothing";

const shipList = (
	s: Record<string, number>, // turn a ship bundle into text like "3 Cruiser"
) =>

	Object.entries(s)
		.filter(([, n]) => n > 0)
		.map(([t, n]) => `${n} ${SHIPS[t as ShipType].name}`)
		.join(", ") || "nothing";

const COLONY_START_RESOURCES: Resources = { Fe: 100, Si: 50 };
const LOSS_SHARE_OF_WIN = 0.6; // a winning fleet loses ships in proportion to how strong the defense was, scaled by this
const DEFENSE_DAMAGE_SHARE = 0.5; // a losing fleet still knocks this share of its attack power off the defense

/** the fleet turns around and flies back the way it came */
function sendHome(fleet: Fleet) {
	const flight = fleet.arrive_at.getTime() - fleet.depart_at.getTime();
	fleet.status = FLEET_STATUS.returning;
	fleet.return_at = new Date(fleet.arrive_at.getTime() + flight);
}

/** total of one ship stat (attack or cargo) over every ship in the fleet */
const fleetTotal = (ships: Record<string, number>, stat: "attack" | "cargo") =>
	// add up one stat over every ship: the stat of each ship type times how many there are
	Object.entries(ships).reduce(
		(total, [type, count]) => total + count * SHIPS[type as ShipType][stat],
		0,
	);

/** take the biggest stockpiles first until the cargo holds are full */
function takeLoot(stockpile: Resources, room: number) {
	const loot: Resources = {};
	let space = room;

	for (const [element, amount] of Object.entries(stockpile).sort(
		(first, second) => second[1] - first[1],
	)) {
		const take = Math.min(Math.floor(amount), space);

		if (take > 0) {
			loot[element] = take;
			space -= take;
		}
	}

	return loot;
}

/** settle an empty planet: the fleet and any fleet already guarding it join the new base */
function colonize(world: World, fleet: Fleet, target: Planet) {
	if (target.kind !== PLANET_KIND.empty) {
		fleet.report = `Colonization of ${target.name} failed: planet is already taken.`;
		sendHome(fleet);

		return;
	}

	fleet.ships.colony_ship -= 1;
	target.kind = PLANET_KIND.player;
	target.resources = { ...COLONY_START_RESOURCES };
	target.updated_at = fleet.arrive_at;
	const joining = [
		fleet,
		...world.fleets.filter(
			(other) =>
				other !== fleet &&
				other.status === FLEET_STATUS.stationed &&
				other.target_id === target.id,
		),
	];

	for (const group of joining) {
		for (const [type, count] of Object.entries(group.ships))
			target.ships[type] = (target.ships[type] ?? 0) + count;
		addRes(target.resources, group.loot);
		group.status = FLEET_STATUS.done;
	}

	fleet.report =
		`Colonized ${target.name}! ${joining.length > 1 ? "The guarding fleet joined the new base." : ""}`.trim();
}

/** the fleet wins: it loses some ships, loots the base, and the planet becomes neutral */
function winBattle(fleet: Fleet, target: Planet, power: number) {
	const lossRatio = (target.defense / power) * LOSS_SHARE_OF_WIN;
	const lost: Record<string, number> = {};

	for (const type of Object.keys(fleet.ships)) {
		lost[type] = Math.round(fleet.ships[type] * lossRatio);
		fleet.ships[type] -= lost[type];
	}

	fleet.loot = takeLoot(target.resources, fleetTotal(fleet.ships, "cargo"));
	target.kind = PLANET_KIND.empty; // the enemy base is destroyed and the fleet guards what is left
	target.buildings = {};
	target.defense = 0;
	target.resources = {};
	fleet.status = FLEET_STATUS.stationed;
	fleet.report = `Victory at ${target.name}! The enemy is destroyed and your fleet now guards the planet. Looted ${resText(fleet.loot)}. Lost: ${shipList(lost)}.`;
}

/** attack an enemy base: win and loot it, or be destroyed after wearing the defense down */
function attack(fleet: Fleet, target: Planet) {
	const power = fleetTotal(fleet.ships, "attack");

	if (target.kind !== PLANET_KIND.npc) {
		fleet.report = `Attack on ${target.name} aborted: nothing to attack.`;
		sendHome(fleet);

		return;
	}

	if (power > target.defense) return winBattle(fleet, target, power);

	target.defense = Math.max(
		0,
		target.defense - Math.floor(power * DEFENSE_DAMAGE_SHARE),
	);

	fleet.report = `Defeat at ${target.name}. Fleet lost (${shipList(fleet.ships)}). Their defense is now ${target.defense}.`;
	fleet.ships = {};
	fleet.status = FLEET_STATUS.done;
}

/** a fleet reaches its target: colonise it, guard it if it is neutral, or fight it */
export function arrive(world: World, fleet: Fleet) {
	const target = world.planets.find((planet) => planet.id === fleet.target_id)!;
	accrue(target, fleet.arrive_at);

	if (fleet.mission === MISSION.colonize) return colonize(world, fleet, target);

	if (target.kind === PLANET_KIND.empty) {
		// neutral planet: nothing to fight, so the fleet just guards it
		fleet.status = FLEET_STATUS.stationed;
		fleet.report = `Your fleet arrived at ${target.name} and is guarding it.`;

		return;
	}

	attack(fleet, target);
}

/** a building or ship in the queue finishes: the planet gets it */
function finishQueueItem(world: World, item: World["queue"][number]) {
	const planet = world.planets.find(
		(candidate) => candidate.id === item.planet_id,
	)!;

	accrue(planet, item.finish_at);

	if (item.kind === QUEUE_KIND.building)
		planet.buildings[item.type] = (planet.buildings[item.type] ?? 0) + 1;
	else planet.ships[item.type] = (planet.ships[item.type] ?? 0) + 1;

	world.queue = world.queue.filter((queued) => queued !== item);
}

/** a fleet gets back home: its ships and loot join the planet it left from */
function returnHome(world: World, fleet: Fleet) {
	const origin = world.planets.find((planet) => planet.id === fleet.origin_id)!;
	accrue(origin, fleet.return_at);

	for (const [type, count] of Object.entries(fleet.ships))
		origin.ships[type] = (origin.ships[type] ?? 0) + count;

	addRes(origin.resources, fleet.loot);
	fleet.status = FLEET_STATUS.done;
}

/** the action for the earliest thing that has already happened by `now` (queue items win ties), or null when nothing is due */
function earliestDue(world: World, currentTime: Date) {
	let earliest: Date | null = null;

	// the action to run for the earliest due event, kept in a variable the compiler can't narrow
	let action: (() => void) | null = null;
	const consider = (when: Date, run: () => void) => {
		if (when <= currentTime && (!earliest || when < earliest)) {
			earliest = when;
			action = run;
		}
	};

	for (const item of world.queue)
		consider(item.finish_at, () => finishQueueItem(world, item));

	for (const fleet of world.fleets) {
		if (fleet.status === FLEET_STATUS.outbound)
			consider(fleet.arrive_at, () => arrive(world, fleet));

		if (fleet.status === FLEET_STATUS.returning)
			consider(fleet.return_at, () => returnHome(world, fleet));
	}

	// the compiler can't see that the closure assigned it, so say what it is
	return action as (() => void) | null;
}

/** play out everything that happened since the last visit, oldest first, then bring every planet's stock up to date */
export function settle(world: World, now: Date) {
	for (let next = earliestDue(world, now); next; next = earliestDue(world, now))
		next();

	for (const planet of world.planets) accrue(planet, now);
}

// ---------- entry point ----------

const ADVISORY_LOCK_ID = 42; // one writer at a time: every game action takes this lock

export async function withGame<T>(
	action: (world: World, now: Date) => T,
	view: View = {},
): Promise<{ result: T; state: GameState }> {
	await ready();
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_ID]);

		// stars and planets are generated the first time they are looked at
		if (
			view.sx !== undefined &&
			view.sy !== undefined &&
			validSector(view.sx, view.sy)
		)

			await ensureSector(client, view.sx, view.sy);

		if (view.system !== undefined) await ensureSystem(client, view.system);

		const world = await load(client, view);
		const now = new Date();
		settle(world, now);
		const result = action(world, now);
		await save(client, world);
		await client.query("COMMIT");

		return { result, state: toState(world, now) };
	} catch (failure) {
		await client.query("ROLLBACK");

		throw failure;
	} finally {
		client.release();
	}
}

function toState(world: World, now: Date): GameState {
	return {
		nowMs: now.getTime(),
		systems: world.systems,
		planets: world.planets.map((planet) => ({
			id: planet.id,
			name: planet.name,
			systemId: planet.system_id,
			orbit: planet.orbit,
			kind: planet.kind,
			resources: planet.resources,
			buildings: planet.buildings,
			ships: planet.ships,
			defense: planet.defense,
			seed: planet.seed,
			shared: planet.shared,
		})),
		queue: world.queue.map((item) => ({
			id: item.id,
			planetId: item.planet_id,
			kind: item.kind,
			type: item.type,
			startAt: item.start_at.getTime(),
			finishAt: item.finish_at.getTime(),
		})),
		fleets: world.fleets.map((fleet) => ({
			id: fleet.id,
			originId: fleet.origin_id,
			targetId: fleet.target_id,
			mission: fleet.mission,
			ships: fleet.ships,
			loot: fleet.loot,
			departAt: fleet.depart_at.getTime(),
			arriveAt: fleet.arrive_at.getTime(),
			returnAt: fleet.return_at.getTime(),
			status: fleet.status,
			report: fleet.report,
		})),
	};
}

// ---------- actions ----------

function ownPlanet(world: World, planetId: number) {
	const planet = world.planets.find((candidate) => candidate.id === planetId);

	if (!planet || planet.kind !== PLANET_KIND.player)

		throw new GameError("Not your planet");

	return planet;
}

/** take the cost from the planet's stock, or refuse if it can't afford it */
function pay(planet: Planet, cost: Resources) {
	for (const [element, amount] of Object.entries(cost)) {
		if ((planet.resources[element] ?? 0) < amount)

			throw new GameError(
				`Not enough ${ELEMENTS[element as keyof typeof ELEMENTS]?.name ?? element}`,
			);
	}

	for (const [element, amount] of Object.entries(cost))
		planet.resources[element] = (planet.resources[element] ?? 0) - amount;
}

/** when the last queued thing of this kind on this planet finishes, or now if there is none */
const lastFinish = (world: World, planetId: number, kind: string, now: Date) =>
	world.queue
		.filter((item) => item.planet_id === planetId && item.kind === kind)
		.reduce(
			(latest, item) => (item.finish_at > latest ? item.finish_at : latest),
			now,
		);

export function startBuilding(
	world: World,
	now: Date,
	planetId: number,
	type: string,
) {
	if (!buildingInfo(type)) throw new GameError("Unknown building");

	const planet = ownPlanet(world, planetId);
	const element = mineElement(type);

	if (
		element &&
		!planetStats(planet.seed).composition.some(
			(part) => part.symbol === element,
		)
	) {
		throw new GameError(
			`There is no ${ELEMENTS[element].name} on this planet to mine`,
		);
	}

	const queued = world.queue.filter(
		(item) =>
			item.planet_id === planet.id &&
			item.kind === QUEUE_KIND.building &&
			item.type === type,
	).length;

	const level = (planet.buildings[type] ?? 0) + queued;

	if (level >= MAX_BUILDING_LEVEL)

		throw new GameError(
			`${buildingInfo(type)!.name} is already at the maximum level (${MAX_BUILDING_LEVEL})`,
		);

	pay(planet, buildCost(type, level));
	const start = lastFinish(world, planet.id, QUEUE_KIND.building, now);
	const finish = new Date(
		start.getTime() + buildSeconds(type, level) * MS_PER_SECOND,
	);

	world.queue.push({
		id: randomUUID(),
		planet_id: planet.id,
		kind: QUEUE_KIND.building,
		type,
		start_at: start,
		finish_at: finish,
	});
}

export function buildShips(
	world: World,
	now: Date,
	planetId: number,
	type: ShipType,
	quantity: number,
) {
	if (!(type in SHIPS)) throw new GameError("Unknown ship");

	const planet = ownPlanet(world, planetId);

	if (!(planet.buildings.shipyard > 0))

		throw new GameError("Build a shipyard first");

	const count = Math.floor(quantity);

	if (!(count >= MIN_BATCH && count <= MAX_BATCH))

		throw new GameError(`Quantity must be ${MIN_BATCH}-${MAX_BATCH}`);

	pay(
		planet,
		Object.fromEntries(
			Object.entries(SHIPS[type].cost).map(([element, amount]) => [
				element,
				amount * count,
			]),
		),
	);

	let start = lastFinish(world, planet.id, QUEUE_KIND.ship, now);

	for (let built = 0; built < count; built++) {
		const finish = new Date(
			start.getTime() +
				shipSeconds(type, planet.buildings.shipyard) * MS_PER_SECOND,
		);

		world.queue.push({
			id: randomUUID(),
			planet_id: planet.id,
			kind: QUEUE_KIND.ship,
			type,
			start_at: start,
			finish_at: finish,
		});

		start = finish;
	}
}

/** the ships the player asked to send, checked against what the origin has; refuses anything impossible */
function chooseShips(origin: Planet, requested: Record<string, number>) {
	const sent: Record<string, number> = {};

	for (const [type, amount] of Object.entries(requested)) {
		const count = Math.floor(Number(amount));

		if (!(type in SHIPS) || !(count > 0)) continue;

		if ((origin.ships[type] ?? 0) < count)

			throw new GameError(`Not enough ${SHIPS[type as ShipType].name}s`);

		sent[type] = count;
	}

	if (Object.keys(sent).length === 0)

		throw new GameError("Select at least one ship");

	return sent;
}

export function sendFleet(
	world: World,
	now: Date,
	originId: number,
	targetId: number,
	ships: Record<string, number>,
) {
	const origin = ownPlanet(world, originId);
	const target = world.planets.find((candidate) => candidate.id === targetId);

	if (!target) throw new GameError("Unknown target");

	if (target.kind === PLANET_KIND.player)

		throw new GameError("That planet is already yours");

	const sent = chooseShips(origin, ships);

	// a colony ship settles a neutral planet; any other fleet fights what is there and then guards it
	const mission =
		target.kind === PLANET_KIND.empty && sent.colony_ship > 0
			? MISSION.colonize
			: MISSION.attack;

	for (const [type, count] of Object.entries(sent)) origin.ships[type] -= count;

	const flight =
		flightSeconds(
			{ systemId: origin.system_id, orbit: origin.orbit },
			{ systemId: target.system_id, orbit: target.orbit },
			world.systems,
		) * MS_PER_SECOND;

	world.fleets.push({
		id: randomUUID(),
		origin_id: origin.id,
		target_id: target.id,
		mission,
		ships: sent,
		loot: {},
		depart_at: now,
		arrive_at: new Date(now.getTime() + flight),
		return_at: new Date(now.getTime() + flight * 2),
		status: FLEET_STATUS.outbound,
		report: "",
	});
}

export function recallFleet(world: World, now: Date, fleetId: string) {
	const fleet = world.fleets.find((candidate) => candidate.id === fleetId);

	if (!fleet || fleet.status !== FLEET_STATUS.stationed)

		throw new GameError("That fleet isn't guarding anything");

	const flight = fleet.arrive_at.getTime() - fleet.depart_at.getTime();
	fleet.arrive_at = now; // start of the return leg
	fleet.return_at = new Date(now.getTime() + flight);
	fleet.status = FLEET_STATUS.returning;
	fleet.report = "Fleet recalled.";
}
