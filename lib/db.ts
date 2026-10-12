import { Pool } from "pg";
import { planetName, starName } from "./planetGen";
import { layoutSystem } from "./systemGen";

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
  resources jsonb NOT NULL DEFAULT '{}',   -- element symbol -> amount
  buildings jsonb NOT NULL DEFAULT '{}',
  ships jsonb NOT NULL DEFAULT '{}',
  defense int NOT NULL DEFAULT 0,
  seed int,                      -- drives how the planet looks in 3D
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planets ADD COLUMN IF NOT EXISTS seed int;
ALTER TABLE planets ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '{}';
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
  loot jsonb NOT NULL DEFAULT '{}',
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
  [4, 80, 22, 3],
];

// id, system, orbit (AU), kind, resources, buildings, ships, defense, planet seed
const SEED: [number, number, number, string, Record<string, number>, Record<string, number>, object, number, number][] = [
  [1, 1, 1.0, "player", { Fe: 500, Si: 300 }, { mine_Fe: 1, mine_Si: 1 }, { fighter: 2 }, 0, 34],
  [5, 1, 0.5, "empty", {}, {}, {}, 0, 22],
  [2, 1, 1.9, "npc", { Fe: 400, Si: 200 }, { mine_Fe: 2, mine_Si: 1 }, {}, 20, 35],
  [7, 1, 4.3, "empty", {}, {}, {}, 0, 26],
  [6, 2, 0.8, "empty", {}, {}, {}, 0, 9],
  [3, 2, 2.4, "npc", { Fe: 1200, Si: 700 }, { mine_Fe: 4, mine_Si: 3 }, {}, 80, 12],
  [8, 2, 6.0, "empty", {}, {}, {}, 0, 25],
  [9, 3, 1.3, "empty", {}, {}, {}, 0, 19],
  [4, 3, 3.1, "npc", { Fe: 3000, Si: 1800 }, { mine_Fe: 7, mine_Si: 5 }, {}, 250, 4],
  [10, 4, 0.7, "empty", {}, {}, {}, 0, 16],
  [11, 4, 5.2, "empty", {}, {}, {}, 0, 30],
];

// Idempotent: only inserts what is missing, so existing games keep their progress.
// Each system gets 2d6 planets: the hand-made ones above plus generated ones (see systemGen.ts).
async function seed() {
  for (const [id, x, y, starSeed] of SYSTEMS) {
    await pool.query(
      "INSERT INTO systems (id,name,x,y,seed) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [id, starName(starSeed), x, y, starSeed],
    );
  }
  for (const [systemId, , , starSeed] of SYSTEMS) {
    const mine = SEED.filter((row) => row[1] === systemId);
    const layout = layoutSystem(systemId, starSeed, mine.map((row) => ({ id: row[0], orbit: row[2] })), systemId === 1);
    for (const pl of layout) {
      const row = mine.find((r) => r[0] === pl.id);
      const d = row
        ? { name: planetName(row[8]), kind: row[3], resources: row[4], buildings: row[5], ships: row[6], defense: row[7], seed: row[8] }
        : { ...pl.fresh!, ships: {} };
      await pool.query(
        `INSERT INTO planets (id,name,system_id,orbit,kind,resources,buildings,ships,defense,seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [pl.id, d.name, systemId, pl.orbit, d.kind, JSON.stringify(d.resources), JSON.stringify(d.buildings), JSON.stringify(d.ships), d.defense, d.seed],
      );
      // (re)place on its orbit; also covers planets created before systems/orbits existed
      await pool.query("UPDATE planets SET system_id=$1, orbit=$2 WHERE id=$3", [systemId, pl.orbit, pl.id]);
      await pool.query("UPDATE planets SET seed=$1 WHERE id=$2 AND seed IS NULL", [d.seed, pl.id]);
    }
  }
}

// Games saved before the elements update used metal/crystal: Fe/Si are their direct replacements.
async function migrateToElements() {
  const { rows } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name='planets' AND column_name='metal'",
  );
  if (rows.length) {
    await pool.query("UPDATE planets SET resources = jsonb_build_object('Fe', metal, 'Si', crystal)");
    await pool.query("ALTER TABLE planets DROP COLUMN metal, DROP COLUMN crystal");
  }
  await pool.query(`UPDATE planets SET buildings = (buildings - 'metal_mine' - 'crystal_mine')
      || jsonb_strip_nulls(jsonb_build_object('mine_Fe', buildings->'metal_mine', 'mine_Si', buildings->'crystal_mine'))
    WHERE buildings ? 'metal_mine' OR buildings ? 'crystal_mine'`);
  await pool.query("UPDATE queue SET type='mine_Fe' WHERE type='metal_mine'");
  await pool.query("UPDATE queue SET type='mine_Si' WHERE type='crystal_mine'");
  await pool.query(`UPDATE fleets SET loot = jsonb_strip_nulls(jsonb_build_object('Fe', loot->'metal', 'Si', loot->'crystal'))
    WHERE loot ? 'metal' OR loot ? 'crystal'`);
}

export function ready(): Promise<void> {
  return (g.__ready ??= (async () => {
    await pool.query(SCHEMA);
    await migrateToElements();
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
