import { Pool } from "pg";

const g = globalThis as unknown as { __pool?: Pool; __ready?: Promise<void> };

export const pool =
  g.__pool ??
  (g.__pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://space:space@localhost:5440/spacegame",
  }));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS planets (
  id int PRIMARY KEY,
  name text NOT NULL,
  x int NOT NULL,
  y int NOT NULL,
  kind text NOT NULL,            -- player | npc | empty
  metal double precision NOT NULL DEFAULT 0,
  crystal double precision NOT NULL DEFAULT 0,
  buildings jsonb NOT NULL DEFAULT '{}',
  ships jsonb NOT NULL DEFAULT '{}',
  defense int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS queue (
  id text PRIMARY KEY,
  planet_id int NOT NULL REFERENCES planets(id),
  kind text NOT NULL,            -- building | ship
  type text NOT NULL,
  start_at timestamptz NOT NULL,
  finish_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS fleets (
  id text PRIMARY KEY,
  origin_id int NOT NULL REFERENCES planets(id),
  target_id int NOT NULL REFERENCES planets(id),
  mission text NOT NULL,         -- attack | colonize
  ships jsonb NOT NULL,
  loot jsonb NOT NULL DEFAULT '{"metal":0,"crystal":0}',
  depart_at timestamptz NOT NULL,
  arrive_at timestamptz NOT NULL,
  return_at timestamptz NOT NULL,
  status text NOT NULL,          -- outbound | returning | done
  report text NOT NULL DEFAULT ''
);
`;

// id, name, x, y, kind, metal, crystal, buildings, ships, defense
const SEED: [number, string, number, number, string, number, number, object, object, number][] = [
  [1, "Homeworld", 50, 50, "player", 500, 300, { metal_mine: 1, crystal_mine: 1 }, { fighter: 2 }, 0],
  [2, "Kryon Outpost", 63, 38, "npc", 400, 200, { metal_mine: 2, crystal_mine: 1 }, {}, 20],
  [3, "Zorg Base", 30, 72, "npc", 1200, 700, { metal_mine: 4, crystal_mine: 3 }, {}, 80],
  [4, "Vex Fortress", 82, 85, "npc", 3000, 1800, { metal_mine: 7, crystal_mine: 5 }, {}, 250],
  [5, "Empty Rock", 20, 25, "empty", 0, 0, {}, {}, 0],
  [6, "Empty Rock", 76, 18, "empty", 0, 0, {}, {}, 0],
  [7, "Empty Rock", 42, 12, "empty", 0, 0, {}, {}, 0],
  [8, "Empty Rock", 58, 82, "empty", 0, 0, {}, {}, 0],
  [9, "Empty Rock", 10, 58, "empty", 0, 0, {}, {}, 0],
];

async function seed() {
  for (const [id, name, x, y, kind, metal, crystal, b, s, def] of SEED) {
    await pool.query(
      `INSERT INTO planets (id,name,x,y,kind,metal,crystal,buildings,ships,defense)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, name, x, y, kind, metal, crystal, JSON.stringify(b), JSON.stringify(s), def],
    );
  }
}

export function ready(): Promise<void> {
  return (g.__ready ??= (async () => {
    await pool.query(SCHEMA);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM planets");
    if (rows[0].n === 0) await seed();
  })().catch((e) => {
    g.__ready = undefined;
    throw e;
  }));
}

export async function resetGame() {
  await ready();
  await pool.query("TRUNCATE queue, fleets, planets");
  await seed();
}
