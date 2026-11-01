import { randomUUID } from "crypto";
import { pool, ready } from "@/lib/server/db";
import { ELEMENTS, MAX_BUILDING_LEVEL, MS_PER_SECOND, SHIPS, buildCost, buildSeconds, buildingInfo, mineElement, shipSeconds, productionRates, flightSeconds, type ShipType, type Res, type GameState, FLEET_STATUS, MISSION, PLANET_KIND, QUEUE_KIND } from "@/lib/defs";

import { planetStats } from "@/lib/planets/planetStats";
import { ensureSector, ensureSystem } from "@/lib/server/lazyGen";
import { validSector } from "@/lib/galaxy/sector";
import { load, save, type Fleet, type Planet, type View, type World } from "@/lib/server/world";

export class GameError extends Error {}

const NPC_RESOURCE_CAP = 3000;
const MIN_BATCH = 1; // ships per order
const MAX_BATCH = 20;

// ---------- simulation ----------

function accrue(planet: Planet, time: Date) {
  if (time <= planet.updated_at) return;

  if (planet.kind !== PLANET_KIND.empty) {
    const deltaSeconds = (time.getTime() - planet.updated_at.getTime()) / MS_PER_SECOND;
    const rate = productionRates(planet.buildings, planetStats(planet.seed).composition);
    const cap = planet.kind === PLANET_KIND.npc ? NPC_RESOURCE_CAP : Infinity;

    for (const [el, perSec] of Object.entries(rate)) planet.resources[el] = Math.min(cap, (planet.resources[el] ?? 0) + perSec * deltaSeconds);
  }

  planet.updated_at = time;
}

const addRes = (to: Res, from: Res) => {
  for (const [el, n] of Object.entries(from)) to[el] = (to[el] ?? 0) + n;
};

const resText = (r: Res) => // turn a resource bundle into text like "60 Fe, 15 Si"
  Object.entries(r).filter(([, n]) => n > 0).map(([el, n]) => `${n} ${el}`).join(", ") || "nothing";

const shipList = (s: Record<string, number>) => // turn a ship bundle into text like "3 Cruiser"
  Object.entries(s).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${SHIPS[t as ShipType].name}`).join(", ") || "nothing";

const COLONY_START_RESOURCES: Res = { Fe: 100, Si: 50 };
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
  Object.entries(ships).reduce((sum, [type, count]) => sum + count * SHIPS[type as ShipType][stat], 0);

/** take the biggest stockpiles first until the cargo holds are full */
function takeLoot(stockpile: Res, room: number) {
  const loot: Res = {};
  let space = room;

  for (const [element, amount] of Object.entries(stockpile).sort((first, second) => second[1] - first[1])) {
    const take = Math.min(Math.floor(amount), space);

    if (take > 0) { loot[element] = take; space -= take; }
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
  const joining = [fleet, ...world.fleets.filter((other) => other !== fleet && other.status === FLEET_STATUS.stationed && other.target_id === target.id)];

  for (const group of joining) {
    for (const [type, count] of Object.entries(group.ships)) target.ships[type] = (target.ships[type] ?? 0) + count;
    addRes(target.resources, group.loot);
    group.status = FLEET_STATUS.done;
  }

  fleet.report = `Colonized ${target.name}! ${joining.length > 1 ? "The guarding fleet joined the new base." : ""}`.trim();
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

  target.defense = Math.max(0, target.defense - Math.floor(power * DEFENSE_DAMAGE_SHARE));
  fleet.report = `Defeat at ${target.name}. Fleet lost (${shipList(fleet.ships)}). Their defense is now ${target.defense}.`;
  fleet.ships = {};
  fleet.status = FLEET_STATUS.done;
}

/** a fleet reaches its target: colonise it, guard it if it is neutral, or fight it */
export function arrive(world: World, fleet: Fleet) {
  const target = world.planets.find((planet) => planet.id === fleet.target_id)!;
  accrue(target, fleet.arrive_at);

  if (fleet.mission === MISSION.colonize) return colonize(world, fleet, target);

  if (target.kind === PLANET_KIND.empty) { // neutral planet: nothing to fight, so the fleet just guards it
    fleet.status = FLEET_STATUS.stationed;
    fleet.report = `Your fleet arrived at ${target.name} and is guarding it.`;

    return;
  }

  attack(fleet, target);
}

/** a building or ship in the queue finishes: the planet gets it */
function finishQueueItem(world: World, item: World["queue"][number]) {
  const planet = world.planets.find((candidate) => candidate.id === item.planet_id)!;
  accrue(planet, item.finish_at);

  if (item.kind === QUEUE_KIND.building) planet.buildings[item.type] = (planet.buildings[item.type] ?? 0) + 1;
  else planet.ships[item.type] = (planet.ships[item.type] ?? 0) + 1;

  world.queue = world.queue.filter((queued) => queued !== item);
}

/** a fleet gets back home: its ships and loot join the planet it left from */
function returnHome(world: World, fleet: Fleet) {
  const origin = world.planets.find((planet) => planet.id === fleet.origin_id)!;
  accrue(origin, fleet.return_at);

  for (const [type, count] of Object.entries(fleet.ships)) origin.ships[type] = (origin.ships[type] ?? 0) + count;

  addRes(origin.resources, fleet.loot);
  fleet.status = FLEET_STATUS.done;
}

/** the action for the earliest thing that has already happened by `now` (queue items win ties), or null when nothing is due */
function earliestDue(world: World, currentTime: Date) {
  let earliest: Date | null = null;

  // the action to run for the earliest due event, kept in a variable the compiler can't narrow
  let action: (() => void) | null = null;
  const consider = (when: Date, run: () => void) => {
    if (when <= currentTime && (!earliest || when < earliest)) { earliest = when; action = run; }
  };

  for (const item of world.queue) consider(item.finish_at, () => finishQueueItem(world, item));

  for (const fleet of world.fleets) {
    if (fleet.status === FLEET_STATUS.outbound) consider(fleet.arrive_at, () => arrive(world, fleet));

    if (fleet.status === FLEET_STATUS.returning) consider(fleet.return_at, () => returnHome(world, fleet));
  }

  // the compiler can't see that the closure assigned it, so say what it is
  return action as (() => void) | null;
}

/** play out everything that happened since the last visit, oldest first, then bring every planet's stock up to date */
export function settle(world: World, now: Date) {
  for (let next = earliestDue(world, now); next; next = earliestDue(world, now)) next();

  for (const planet of world.planets) accrue(planet, now);
}

// ---------- entry point ----------

export async function withGame<T>(fn: (w: World, now: Date) => T, view: View = {}): Promise<{ result: T; state: GameState }> {
  await ready();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(42)"); // one writer at a time

    // stars and planets are generated the first time they are looked at
    if (view.sx !== undefined && view.sy !== undefined && validSector(view.sx, view.sy)) await ensureSector(client, view.sx, view.sy);

    if (view.system !== undefined) await ensureSystem(client, view.system);
    const w = await load(client, view);
    const now = new Date();
    settle(w, now);
    const result = fn(w, now);
    await save(client, w);
    await client.query("COMMIT");

    return { result, state: toState(w, now) };
  } catch (e) {
    await client.query("ROLLBACK");

    throw e;
  } finally {
    client.release();
  }
}

function toState(w: World, now: Date): GameState {
  return {
    nowMs: now.getTime(),
    systems: w.systems,
    planets: w.planets.map((p) => ({
      id: p.id, name: p.name, systemId: p.system_id, orbit: p.orbit, kind: p.kind,
      resources: p.resources, buildings: p.buildings, ships: p.ships, defense: p.defense, seed: p.seed, shared: p.shared,
    })),
    queue: w.queue.map((db) => ({
      id: db.id, planetId: db.planet_id, kind: db.kind, type: db.type,
      startAt: db.start_at.getTime(), finishAt: db.finish_at.getTime(),
    })),
    fleets: w.fleets.map((f) => ({
      id: f.id, originId: f.origin_id, targetId: f.target_id, mission: f.mission, ships: f.ships, loot: f.loot,
      departAt: f.depart_at.getTime(), arriveAt: f.arrive_at.getTime(), returnAt: f.return_at.getTime(),
      status: f.status, report: f.report,
    })),
  };
}

// ---------- actions ----------

function ownPlanet(w: World, id: number) {
  const p = w.planets.find((x) => x.id === id);

  if (!p || p.kind !== PLANET_KIND.player) throw new GameError("Not your planet");

  return p;
}

function pay(p: Planet, cost: Res) {
  for (const [el, n] of Object.entries(cost)) {
    if ((p.resources[el] ?? 0) < n) throw new GameError(`Not enough ${ELEMENTS[el as keyof typeof ELEMENTS]?.name ?? el}`);
  }

  for (const [el, n] of Object.entries(cost)) p.resources[el] = (p.resources[el] ?? 0) - n;
}

const lastFinish = (w: World, planetId: number, kind: string, now: Date) => // queue entries for one planet and kind
  // the latest finish time in the queue, or now if the queue is empty
  w.queue.filter((q) => q.planet_id === planetId && q.kind === kind).reduce((m, q) => (q.finish_at > m ? q.finish_at : m), now);

export function startBuilding(w: World, now: Date, planetId: number, type: string) {
  if (!buildingInfo(type)) throw new GameError("Unknown building");
  const p = ownPlanet(w, planetId);
  const element = mineElement(type);

  if (element && !planetStats(p.seed).composition.some((c) => c.symbol === element)) {
    throw new GameError(`There is no ${ELEMENTS[element].name} on this planet to mine`);
  }

  const queued = w.queue.filter((q) => q.planet_id === p.id && q.kind === QUEUE_KIND.building && q.type === type).length;
  const level = (p.buildings[type] ?? 0) + queued;

  if (level >= MAX_BUILDING_LEVEL) throw new GameError(`${buildingInfo(type)!.name} is already at the maximum level (${MAX_BUILDING_LEVEL})`);
  pay(p, buildCost(type, level));
  const start = lastFinish(w, p.id, QUEUE_KIND.building, now);
  const finish = new Date(start.getTime() + buildSeconds(type, level) * MS_PER_SECOND);
  w.queue.push({ id: randomUUID(), planet_id: p.id, kind: QUEUE_KIND.building, type, start_at: start, finish_at: finish });
}

export function buildShips(w: World, now: Date, planetId: number, type: ShipType, qty: number) {
  if (!(type in SHIPS)) throw new GameError("Unknown ship");
  const p = ownPlanet(w, planetId);

  if (!(p.buildings.shipyard > 0)) throw new GameError("Build a shipyard first");
  qty = Math.floor(qty);

  if (!(qty >= MIN_BATCH && qty <= MAX_BATCH)) throw new GameError(`Quantity must be ${MIN_BATCH}-${MAX_BATCH}`);
  const s = SHIPS[type];
  pay(p, Object.fromEntries(Object.entries(s.cost).map(([el, n]) => [el, n * qty])));
  let start = lastFinish(w, p.id, QUEUE_KIND.ship, now);

  for (let index = 0; index < qty; index++) {
    const finish = new Date(start.getTime() + shipSeconds(type, p.buildings.shipyard) * MS_PER_SECOND);
    w.queue.push({ id: randomUUID(), planet_id: p.id, kind: QUEUE_KIND.ship, type, start_at: start, finish_at: finish });
    start = finish;
  }
}

export function sendFleet(w: World, now: Date, originId: number, targetId: number, ships: Record<string, number>) {
  const origin = ownPlanet(w, originId);
  const target = w.planets.find((p) => p.id === targetId);

  if (!target) throw new GameError("Unknown target");

  if (target.kind === PLANET_KIND.player) throw new GameError("That planet is already yours");
  const sent: Record<string, number> = {};

  for (const [t, n] of Object.entries(ships)) {
    const count = Math.floor(Number(n));

    if (!(t in SHIPS) || !(count > 0)) continue;

    if ((origin.ships[t] ?? 0) < count) throw new GameError(`Not enough ${SHIPS[t as ShipType].name}s`);
    sent[t] = count;
  }

  if (Object.keys(sent).length === 0) throw new GameError("Select at least one ship");

  // a colony ship settles a neutral planet; any other fleet fights what is there and then guards it
  const mission = target.kind === PLANET_KIND.empty && sent.colony_ship > 0 ? MISSION.colonize : MISSION.attack;

  for (const [t, n] of Object.entries(sent)) origin.ships[t] -= n;
  const flight =
    flightSeconds({ systemId: origin.system_id, orbit: origin.orbit }, { systemId: target.system_id, orbit: target.orbit }, w.systems) * MS_PER_SECOND;
  w.fleets.push({
    id: randomUUID(), origin_id: origin.id, target_id: target.id, mission, ships: sent,
    loot: {}, depart_at: now, arrive_at: new Date(now.getTime() + flight),
    return_at: new Date(now.getTime() + flight * 2), status: FLEET_STATUS.outbound, report: "",
  });
}

export function recallFleet(w: World, now: Date, fleetId: string) {
  const f = w.fleets.find((x) => x.id === fleetId);

  if (!f || f.status !== FLEET_STATUS.stationed) throw new GameError("That fleet isn't guarding anything");
  const flight = f.arrive_at.getTime() - f.depart_at.getTime();
  f.arrive_at = now; // start of the return leg
  f.return_at = new Date(now.getTime() + flight);
  f.status = FLEET_STATUS.returning;
  f.report = "Fleet recalled.";
}
