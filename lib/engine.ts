import { randomUUID } from "crypto";
import { pool, ready } from "./db";
import {
  ELEMENTS, MAX_BUILDING_LEVEL, SHIPS, buildCost, buildSeconds, buildingInfo, mineElement, shipSeconds, productionRates, flightSeconds,
  type ShipType, type Res, type GameState,
} from "./defs";

import { planetStats } from "./planetGen";
import { ensureSector, ensureSystem } from "./lazyGen";
import { validSector } from "./sector";
import { load, save, type Fleet, type Planet, type View, type World } from "./world";

export class GameError extends Error {}

const NPC_RESOURCE_CAP = 3000;

// ---------- simulation ----------

function accrue(planet: Planet, time: Date) {
  if (time <= planet.updated_at) return;

  if (planet.kind !== "empty") {
    const deltaSeconds = (time.getTime() - planet.updated_at.getTime()) / 1000;
    const rate = productionRates(planet.buildings, planetStats(planet.seed).composition);
    const cap = planet.kind === "npc" ? NPC_RESOURCE_CAP : Infinity;

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

function arrive(world: World, fleet: Fleet) {
  const target = world.planets.find((p) => p.id === fleet.target_id)!;
  accrue(target, fleet.arrive_at);
  const flight = fleet.arrive_at.getTime() - fleet.depart_at.getTime();

  const goHome = () => {
    fleet.status = "returning";
    fleet.return_at = new Date(fleet.arrive_at.getTime() + flight);
  };

  if (fleet.mission === "colonize") {
    if (target.kind !== "empty") {
      fleet.report = `Colonization of ${target.name} failed: planet is already taken.`;

      return goHome();
    }

    fleet.ships.colony_ship -= 1;
    target.kind = "player";
    target.resources = { Fe: 100, Si: 50 };
    target.updated_at = fleet.arrive_at;

    // the rest of this fleet, and any fleet already guarding the planet, join the new base
    const joining = [fleet, ...world.fleets.filter((g) => g !== fleet && g.status === "stationed" && g.target_id === target.id)];

    for (const g of joining) {
      for (const [t, n] of Object.entries(g.ships)) target.ships[t] = (target.ships[t] ?? 0) + n;
      addRes(target.resources, g.loot);
      g.status = "done";
    }

    fleet.report = `Colonized ${target.name}! ${joining.length > 1 ? "The guarding fleet joined the new base." : ""}`.trim();

    return;
  }

  // neutral planet: nothing to fight, so the fleet just guards it
  if (target.kind === "empty") {
    fleet.status = "stationed";
    fleet.report = `Your fleet arrived at ${target.name} and is guarding it.`;

    return;
  }

  // enemy planet: fight
  const power = Object.entries(fleet.ships).reduce((sum, [t, n]) => sum + n * SHIPS[t as ShipType].attack, 0);

  if (target.kind !== "npc") {
    fleet.report = `Attack on ${target.name} aborted: nothing to attack.`;

    return goHome();
  }

  if (power > target.defense) {
    const lossRatio = (target.defense / power) * 0.6;
    const lost: Record<string, number> = {};

    for (const t of Object.keys(fleet.ships)) {
      lost[t] = Math.round(fleet.ships[t] * lossRatio);
      fleet.ships[t] -= lost[t];
    }

    // total cargo space: each ship's cargo times how many of it there are
    const cargo = Object.entries(fleet.ships).reduce((s, [t, n]) => s + n * SHIPS[t as ShipType].cargo, 0);

    // take the biggest stockpiles first until the cargo holds are full
    let room = cargo;
    const loot: Res = {};

    for (const [el, amount] of Object.entries(target.resources).sort((a, b) => b[1] - a[1])) {
      const take = Math.min(Math.floor(amount), room);

      if (take > 0) { loot[el] = take; room -= take; }
    }

    fleet.loot = loot;

    // the enemy base is destroyed; the planet becomes neutral and the fleet guards it
    target.kind = "empty";
    target.buildings = {};
    target.defense = 0;
    target.resources = {};
    fleet.status = "stationed";
    fleet.report = `Victory at ${target.name}! The enemy is destroyed and your fleet now guards the planet. Looted ${resText(fleet.loot)}. Lost: ${shipList(lost)}.`;

    return;
  }

  target.defense = Math.max(0, target.defense - Math.floor(power * 0.5));
  fleet.report = `Defeat at ${target.name}. Fleet lost (${shipList(fleet.ships)}). Their defense is now ${target.defense}.`;
  fleet.ships = {};
  fleet.status = "done";
}

function settle(w: World, now: Date) {
  for (;;) {
    let t: Date | null = null;
    // `consider` keeps the earliest event that is already due (and what to do for it); the loop repeats until none is left
    let run: (() => void) | null = null;
    const consider = (when: Date, fn: () => void) => {
      if (when <= now && (!t || when < t)) { t = when; run = fn; }
    };

    for (const queueItem of w.queue) {
      consider(queueItem.finish_at, () => { // a building or ship finishes
        const p = w.planets.find((x) => x.id === queueItem.planet_id)!;
        accrue(p, queueItem.finish_at);

        if (queueItem.kind === "building") p.buildings[queueItem.type] = (p.buildings[queueItem.type] ?? 0) + 1;
        else p.ships[queueItem.type] = (p.ships[queueItem.type] ?? 0) + 1;
        w.queue = w.queue.filter((x) => x !== queueItem);
      });
    }

    for (const f of w.fleets) {
      if (f.status === "outbound") consider(f.arrive_at, () => arrive(w, f));

      if (f.status === "returning") {
        consider(f.return_at, () => { // a fleet gets back home
          const origin = w.planets.find((p) => p.id === f.origin_id)!;
          accrue(origin, f.return_at);

          for (const [type, n] of Object.entries(f.ships)) origin.ships[type] = (origin.ships[type] ?? 0) + n;
          addRes(origin.resources, f.loot);
          f.status = "done";
        });
      }
    }

    if (!run) break;
    (run as () => void)();
  }

  for (const p of w.planets) accrue(p, now);
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
    now: now.getTime(),
    systems: w.systems,
    planets: w.planets.map((p) => ({
      id: p.id, name: p.name, systemId: p.system_id, orbit: p.orbit, kind: p.kind,
      resources: p.resources, buildings: p.buildings, ships: p.ships, defense: p.defense, seed: p.seed, shared: p.shared,
    })),
    queue: w.queue.map((q) => ({
      id: q.id, planetId: q.planet_id, kind: q.kind, type: q.type,
      startAt: q.start_at.getTime(), finishAt: q.finish_at.getTime(),
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

  if (!p || p.kind !== "player") throw new GameError("Not your planet");

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

export function build(w: World, now: Date, planetId: number, type: string) {
  if (!buildingInfo(type)) throw new GameError("Unknown building");
  const p = ownPlanet(w, planetId);
  const element = mineElement(type);

  if (element && !planetStats(p.seed).composition.some((c) => c.symbol === element)) {
    throw new GameError(`There is no ${ELEMENTS[element].name} on this planet to mine`);
  }

  const queued = w.queue.filter((q) => q.planet_id === p.id && q.kind === "building" && q.type === type).length;
  const level = (p.buildings[type] ?? 0) + queued;

  if (level >= MAX_BUILDING_LEVEL) throw new GameError(`${buildingInfo(type)!.name} is already at the maximum level (${MAX_BUILDING_LEVEL})`);
  pay(p, buildCost(type, level));
  const start = lastFinish(w, p.id, "building", now);
  const finish = new Date(start.getTime() + buildSeconds(type, level) * 1000);
  w.queue.push({ id: randomUUID(), planet_id: p.id, kind: "building", type, start_at: start, finish_at: finish });
}

export function buildShips(w: World, now: Date, planetId: number, type: ShipType, qty: number) {
  if (!(type in SHIPS)) throw new GameError("Unknown ship");
  const p = ownPlanet(w, planetId);

  if (!(p.buildings.shipyard > 0)) throw new GameError("Build a shipyard first");
  qty = Math.floor(qty);

  if (!(qty >= 1 && qty <= 20)) throw new GameError("Quantity must be 1-20");
  const s = SHIPS[type];
  pay(p, Object.fromEntries(Object.entries(s.cost).map(([el, n]) => [el, n * qty])));
  let start = lastFinish(w, p.id, "ship", now);

  for (let index = 0; index < qty; index++) {
    const finish = new Date(start.getTime() + shipSeconds(type, p.buildings.shipyard) * 1000);
    w.queue.push({ id: randomUUID(), planet_id: p.id, kind: "ship", type, start_at: start, finish_at: finish });
    start = finish;
  }
}

export function sendFleet(w: World, now: Date, originId: number, targetId: number, ships: Record<string, number>) {
  const origin = ownPlanet(w, originId);
  const target = w.planets.find((p) => p.id === targetId);

  if (!target) throw new GameError("Unknown target");

  if (target.kind === "player") throw new GameError("That planet is already yours");
  const sent: Record<string, number> = {};

  for (const [t, n] of Object.entries(ships)) {
    const count = Math.floor(Number(n));

    if (!(t in SHIPS) || !(count > 0)) continue;

    if ((origin.ships[t] ?? 0) < count) throw new GameError(`Not enough ${SHIPS[t as ShipType].name}s`);
    sent[t] = count;
  }

  if (Object.keys(sent).length === 0) throw new GameError("Select at least one ship");

  // a colony ship settles a neutral planet; any other fleet fights what is there and then guards it
  const mission = target.kind === "empty" && sent.colony_ship > 0 ? "colonize" : "attack";

  for (const [t, n] of Object.entries(sent)) origin.ships[t] -= n;
  const flight =
    flightSeconds({ systemId: origin.system_id, orbit: origin.orbit }, { systemId: target.system_id, orbit: target.orbit }, w.systems) * 1000;
  w.fleets.push({
    id: randomUUID(), origin_id: origin.id, target_id: target.id, mission, ships: sent,
    loot: {}, depart_at: now, arrive_at: new Date(now.getTime() + flight),
    return_at: new Date(now.getTime() + flight * 2), status: "outbound", report: "",
  });
}

export function recallFleet(w: World, now: Date, fleetId: string) {
  const f = w.fleets.find((x) => x.id === fleetId);

  if (!f || f.status !== "stationed") throw new GameError("That fleet isn't guarding anything");
  const flight = f.arrive_at.getTime() - f.depart_at.getTime();
  f.arrive_at = now; // start of the return leg
  f.return_at = new Date(now.getTime() + flight);
  f.status = "returning";
  f.report = "Fleet recalled.";
}
