import { Pool } from "pg";
import { planetName, starName } from "./planetGen";

const g = globalThis as unknown as { __pool?: Pool; __ready?: Promise<void> };

export const pool =
  g.__pool ??
  (g.__pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://space:space@localhost:5440/spacegame",
  }));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS systems (
  id int PRIMARY KEY,
  name text NOT NULL,            -- star name
  x int NOT NULL,                -- position on the galaxy map (0-100)
  y int NOT NULL,
  seed int NOT NULL              -- drives the star's look
);
CREATE TABLE IF NOT EXISTS planets (
  id int PRIMARY KEY,
  name text NOT NULL,
  system_id int REFERENCES systems(id),
  orbit double precision,        -- distance from the star in AU
  kind text NOT NULL,            -- player | npc | empty
  metal double precision NOT NULL DEFAULT 0,
  crystal double precision NOT NULL DEFAULT 0,
  buildings jsonb NOT NULL DEFAULT '{}',
  ships jsonb NOT NULL DEFAULT '{}',
  defense int NOT NULL DEFAULT 0,
  seed int,                      -- drives how the planet looks in 3D
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planets ADD COLUMN IF NOT EXISTS seed int;
ALTER TABLE planets ADD COLUMN IF NOT EXISTS system_id int REFERENCES systems(id);
ALTER TABLE planets ADD COLUMN IF NOT EXISTS orbit double precision;
ALTER TABLE planets DROP COLUMN IF EXISTS x;
ALTER TABLE planets DROP COLUMN IF EXISTS y;
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

// id, x (galaxy), y (galaxy), star seed
const SYSTEMS: [number, number, number, number][] = [
  [1, 50, 50, 9],
  [2, 22, 30, 4],
  [3, 78, 72, 2],
  [4, 80, 22, 13],
];

// id, system, orbit (AU), kind, metal, crystal, buildings, ships, defense, planet seed
const SEED: [number, number, number, string, number, number, object, object, number, number][] = [
  [1, 1, 1.0, "player", 500, 300, { metal_mine: 1, crystal_mine: 1 }, { fighter: 2 }, 0, 34],
  [5, 1, 0.5, "empty", 0, 0, {}, {}, 0, 22],
  [2, 1, 1.9, "npc", 400, 200, { metal_mine: 2, crystal_mine: 1 }, {}, 20, 35],
  [7, 1, 4.3, "empty", 0, 0, {}, {}, 0, 26],
  [6, 2, 0.8, "empty", 0, 0, {}, {}, 0, 9],
  [3, 2, 2.4, "npc", 1200, 700, { metal_mine: 4, crystal_mine: 3 }, {}, 80, 12],
  [8, 2, 6.0, "empty", 0, 0, {}, {}, 0, 25],
  [9, 3, 1.3, "empty", 0, 0, {}, {}, 0, 19],
  [4, 3, 3.1, "npc", 3000, 1800, { metal_mine: 7, crystal_mine: 5 }, {}, 250, 4],
  [10, 4, 0.7, "empty", 0, 0, {}, {}, 0, 16],
  [11, 4, 5.2, "empty", 0, 0, {}, {}, 0, 30],
];

// Idempotent: only inserts what is missing, so existing games keep their progress.
async function seed() {
  for (const [id, x, y, starSeed] of SYSTEMS) {
    await pool.query(
      "INSERT INTO systems (id,name,x,y,seed) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [id, starName(starSeed), x, y, starSeed],
    );
  }
  for (const [id, systemId, orbit, kind, metal, crystal, b, s, def, planetSeed] of SEED) {
    await pool.query(
      `INSERT INTO planets (id,name,system_id,orbit,kind,metal,crystal,buildings,ships,defense,seed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [id, planetName(planetSeed), systemId, orbit, kind, metal, crystal, JSON.stringify(b), JSON.stringify(s), def, planetSeed],
    );
    // planets created before systems existed
    await pool.query("UPDATE planets SET system_id=$1, orbit=$2 WHERE id=$3 AND system_id IS NULL", [systemId, orbit, id]);
    await pool.query("UPDATE planets SET seed=$1 WHERE id=$2 AND seed IS NULL", [planetSeed, id]);
  }
}

export function ready(): Promise<void> {
  return (g.__ready ??= (async () => {
    await pool.query(SCHEMA);
    await seed();
    // give planets that still have the old placeholder names a generated one
    const { rows: old } = await pool.query(
      "SELECT id, seed FROM planets WHERE name IN ('Homeworld','Empty Rock','Kryon Outpost','Zorg Base','Vex Fortress') OR name LIKE 'Colony %'",
    );
    for (const o of old) await pool.query("UPDATE planets SET name=$1 WHERE id=$2", [planetName(o.seed), o.id]);
  })().catch((e) => {
    g.__ready = undefined;
    throw e;
  }));
}

export async function resetGame() {
  await ready();
  await pool.query("TRUNCATE queue, fleets, planets, systems");
  await seed();
}
