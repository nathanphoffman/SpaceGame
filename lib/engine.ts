import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { pool, ready } from "./db";
import {
  BUILDINGS, SHIPS, buildCost, buildSeconds, shipSeconds, rates, flightSeconds,
  type BuildingType, type ShipType, type Res, type GameState,
} from "./defs";

type Planet = {
  id: number; name: string; x: number; y: number; kind: "player" | "npc" | "empty";
  metal: number; crystal: number; buildings: Record<string, number>; ships: Record<string, number>;
  defense: number; updated_at: Date;
};
type QueueItem = { id: string; planet_id: number; kind: "building" | "ship"; type: string; start_at: Date; finish_at: Date };
type Fleet = {
  id: string; origin_id: number; target_id: number; mission: "attack" | "colonize";
  ships: Record<string, number>; loot: Res; depart_at: Date; arrive_at: Date; return_at: Date;
  status: "outbound" | "returning" | "done"; report: string;
};
type World = { planets: Planet[]; queue: QueueItem[]; fleets: Fleet[] };

export class GameError extends Error {}

const NPC_RESOURCE_CAP = 3000;

// ---------- load / save ----------

async function load(c: PoolClient): Promise<World> {
  const planets = (await c.query("SELECT * FROM planets ORDER BY id")).rows as Planet[];
  const queue = (await c.query("SELECT * FROM queue ORDER BY finish_at")).rows as QueueItem[];
  const fleets = (await c.query("SELECT * FROM fleets ORDER BY depart_at")).rows as Fleet[];
  return { planets, queue, fleets };
}

async function save(c: PoolClient, w: World) {
  for (const p of w.planets) {
    await c.query(
      `UPDATE planets SET name=$2, kind=$3, metal=$4, crystal=$5, buildings=$6, ships=$7, defense=$8, updated_at=$9 WHERE id=$1`,
      [p.id, p.name, p.kind, p.metal, p.crystal, JSON.stringify(p.buildings), JSON.stringify(p.ships), p.defense, p.updated_at],
    );
  }
  await c.query("DELETE FROM queue");
  for (const q of w.queue) {
    await c.query(
      "INSERT INTO queue (id,planet_id,kind,type,start_at,finish_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [q.id, q.planet_id, q.kind, q.type, q.start_at, q.finish_at],
    );
  }
  await c.query("DELETE FROM fleets");
  // keep only the last few finished fleets so the reports list doesn't grow forever
  const done = w.fleets.filter((f) => f.status === "done").slice(-10);
  const keep = [...w.fleets.filter((f) => f.status !== "done"), ...done];
  for (const f of keep) {
    await c.query(
      `INSERT INTO fleets (id,origin_id,target_id,mission,ships,loot,depart_at,arrive_at,return_at,status,report)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [f.id, f.origin_id, f.target_id, f.mission, JSON.stringify(f.ships), JSON.stringify(f.loot),
       f.depart_at, f.arrive_at, f.return_at, f.status, f.report],
    );
  }
}

// ---------- simulation ----------

function accrue(p: Planet, t: Date) {
  if (t <= p.updated_at) return;
  if (p.kind !== "empty") {
    const dt = (t.getTime() - p.updated_at.getTime()) / 1000;
    const r = rates(p.buildings);
    const cap = p.kind === "npc" ? NPC_RESOURCE_CAP : Infinity;
    p.metal = Math.min(cap, p.metal + r.metal * dt);
    p.crystal = Math.min(cap, p.crystal + r.crystal * dt);
  }
  p.updated_at = t;
}

const shipList = (s: Record<string, number>) =>
  Object.entries(s).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${SHIPS[t as ShipType].name}`).join(", ") || "nothing";

function arrive(w: World, f: Fleet) {
  const target = w.planets.find((p) => p.id === f.target_id)!;
  accrue(target, f.arrive_at);
  const flight = f.arrive_at.getTime() - f.depart_at.getTime();
  const goHome = () => {
    f.status = "returning";
    f.return_at = new Date(f.arrive_at.getTime() + flight);
  };

  if (f.mission === "colonize") {
    if (target.kind !== "empty") {
      f.report = `Colonization of ${target.name} failed: planet is already taken.`;
      return goHome();
    }
    f.ships.colony_ship -= 1;
    target.kind = "player";
    target.name = `Colony ${target.id}`;
    target.metal = 100;
    target.crystal = 50;
    target.updated_at = f.arrive_at;
    f.report = `Colonized a new planet (${target.name})!`;
    if (Object.values(f.ships).every((n) => n <= 0)) {
      f.status = "done";
      return;
    }
    return goHome();
  }

  // attack
  const power = Object.entries(f.ships).reduce((sum, [t, n]) => sum + n * SHIPS[t as ShipType].attack, 0);
  if (target.kind !== "npc") {
    f.report = `Attack on ${target.name} aborted: nothing to attack.`;
    return goHome();
  }
  if (power > target.defense) {
    const lossRatio = (target.defense / power) * 0.6;
    const lost: Record<string, number> = {};
    for (const t of Object.keys(f.ships)) {
      lost[t] = Math.round(f.ships[t] * lossRatio);
      f.ships[t] -= lost[t];
    }
    const cargo = Object.entries(f.ships).reduce((s, [t, n]) => s + n * SHIPS[t as ShipType].cargo, 0);
    const metal = Math.min(target.metal * 0.5, cargo / 2);
    const crystal = Math.min(target.crystal * 0.5, cargo / 2);
    target.metal -= metal;
    target.crystal -= crystal;
    target.defense = Math.floor(target.defense * 0.7);
    f.loot = { metal: Math.floor(metal), crystal: Math.floor(crystal) };
    f.report = `Victory at ${target.name}! Looted ${f.loot.metal} metal, ${f.loot.crystal} crystal. Lost: ${shipList(lost)}.`;
    return goHome();
  }
  target.defense = Math.max(0, target.defense - Math.floor(power * 0.5));
  f.report = `Defeat at ${target.name}. Fleet lost (${shipList(f.ships)}). Their defense is now ${target.defense}.`;
  f.ships = {};
  f.status = "done";
}

function settle(w: World, now: Date) {
  for (;;) {
    let t: Date | null = null;
    let run: (() => void) | null = null;
    const consider = (when: Date, fn: () => void) => {
      if (when <= now && (!t || when < t)) { t = when; run = fn; }
    };

    for (const q of w.queue) {
      consider(q.finish_at, () => {
        const p = w.planets.find((x) => x.id === q.planet_id)!;
        accrue(p, q.finish_at);
        if (q.kind === "building") p.buildings[q.type] = (p.buildings[q.type] ?? 0) + 1;
        else p.ships[q.type] = (p.ships[q.type] ?? 0) + 1;
        w.queue = w.queue.filter((x) => x !== q);
      });
    }
    for (const f of w.fleets) {
      if (f.status === "outbound") consider(f.arrive_at, () => arrive(w, f));
      if (f.status === "returning") {
        consider(f.return_at, () => {
          const origin = w.planets.find((p) => p.id === f.origin_id)!;
          accrue(origin, f.return_at);
          for (const [type, n] of Object.entries(f.ships)) origin.ships[type] = (origin.ships[type] ?? 0) + n;
          origin.metal += f.loot.metal;
          origin.crystal += f.loot.crystal;
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

export async function withGame<T>(fn: (w: World, now: Date) => T): Promise<{ result: T; state: GameState }> {
  await ready();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(42)"); // one writer at a time
    const w = await load(c);
    const now = new Date();
    settle(w, now);
    const result = fn(w, now);
    await save(c, w);
    await c.query("COMMIT");
    return { result, state: toState(w, now) };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

function toState(w: World, now: Date): GameState {
  return {
    now: now.getTime(),
    planets: w.planets.map((p) => ({
      id: p.id, name: p.name, x: p.x, y: p.y, kind: p.kind,
      metal: p.metal, crystal: p.crystal, buildings: p.buildings, ships: p.ships, defense: p.defense,
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
  if (p.metal < cost.metal || p.crystal < cost.crystal) throw new GameError("Not enough resources");
  p.metal -= cost.metal;
  p.crystal -= cost.crystal;
}

const lastFinish = (w: World, planetId: number, kind: string, now: Date) =>
  w.queue.filter((q) => q.planet_id === planetId && q.kind === kind).reduce((m, q) => (q.finish_at > m ? q.finish_at : m), now);

export function build(w: World, now: Date, planetId: number, type: BuildingType) {
  if (!(type in BUILDINGS)) throw new GameError("Unknown building");
  const p = ownPlanet(w, planetId);
  const queued = w.queue.filter((q) => q.planet_id === p.id && q.kind === "building" && q.type === type).length;
  const level = (p.buildings[type] ?? 0) + queued;
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
  pay(p, { metal: s.cost.metal * qty, crystal: s.cost.crystal * qty });
  let start = lastFinish(w, p.id, "ship", now);
  for (let i = 0; i < qty; i++) {
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
  const mission = target.kind === "empty" ? "colonize" : "attack";
  if (mission === "colonize" && !(sent.colony_ship > 0)) throw new GameError("Colonizing needs a Colony Ship");
  for (const [t, n] of Object.entries(sent)) origin.ships[t] -= n;
  const flight = flightSeconds(origin, target) * 1000;
  w.fleets.push({
    id: randomUUID(), origin_id: origin.id, target_id: target.id, mission, ships: sent,
    loot: { metal: 0, crystal: 0 }, depart_at: now, arrive_at: new Date(now.getTime() + flight),
    return_at: new Date(now.getTime() + flight * 2), status: "outbound", report: "",
  });
}
