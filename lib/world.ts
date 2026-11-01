import type { PoolClient } from "pg";
import type { Res, SystemDTO } from "./defs";

export type Planet = {
  id: number; name: string; system_id: number; orbit: number; kind: "player" | "npc" | "empty";
  resources: Res; buildings: Record<string, number>; ships: Record<string, number>;
  defense: number; seed: number; shared: boolean; updated_at: Date;
};

export type QueueItem = { id: string; planet_id: number; kind: "building" | "ship"; type: string; start_at: Date; finish_at: Date };
export type Fleet = {
  id: string; origin_id: number; target_id: number; mission: "attack" | "colonize";
  ships: Record<string, number>; loot: Res; depart_at: Date; arrive_at: Date; return_at: Date;
  status: "outbound" | "stationed" | "returning" | "done"; report: string;
};

/** Only the part of the galaxy that matters right now is loaded, so the world can be huge. */
export type World = { systems: SystemDTO[]; planets: Planet[]; queue: QueueItem[]; fleets: Fleet[] };

/** what the client is looking at: a sector, a system, and any planets an action refers to */
export type View = { sx?: number; sy?: number; system?: number; planets?: number[] };

export async function load(c: PoolClient, view: View): Promise<World> {
  const queue = (await c.query("SELECT * FROM queue ORDER BY finish_at")).rows as QueueItem[];
  const fleets = (await c.query("SELECT * FROM fleets ORDER BY depart_at")).rows as Fleet[];
  const need = new Set(view.planets ?? []);

  for (const f of fleets) { need.add(f.origin_id); need.add(f.target_id); }

  // your bases, anything a fleet or action touches, and the system on screen (default: the one your first base is in)
  const planets = (await c.query(
    `SELECT * FROM planets WHERE kind='player' OR id = ANY($1)
       OR system_id = COALESCE($2::int, (SELECT system_id FROM planets WHERE kind='player' ORDER BY id LIMIT 1)) ORDER BY id`,
    [[...need], view.system ?? null],
  )).rows as Planet[];

  const rows = (await c.query(
    "SELECT * FROM systems WHERE id = ANY($1) OR id = $2 OR (sector_x = $3 AND sector_y = $4) ORDER BY id",
    [[...new Set(planets.map((planet) => planet.system_id))], view.system ?? null, view.sx ?? null, view.sy ?? null],
  )).rows;

  const systems: SystemDTO[] = rows.map((r) => ({ id: r.id, name: r.name, x: r.x, y: r.y, seed: r.seed, sectorX: r.sector_x, sectorY: r.sector_y }));

  return { systems, planets, queue, fleets };
}

export async function save(c: PoolClient, w: World) {
  for (const planet of w.planets) {
    await c.query(
      `UPDATE planets SET name=$2, kind=$3, resources=$4, buildings=$5, ships=$6, defense=$7, updated_at=$8 WHERE id=$1`,
      [planet.id, planet.name, planet.kind, JSON.stringify(planet.resources), JSON.stringify(planet.buildings), JSON.stringify(planet.ships), planet.defense, planet.updated_at],
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
