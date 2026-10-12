import { Pool } from "pg";
import { GALAXY_VERSION } from "./data/catalog";
import { seedGalaxy } from "./seedGalaxy";

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
  x double precision NOT NULL,   -- light-years from Sol in the galactic plane
  y double precision NOT NULL,
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
ALTER TABLE planets ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false; -- safe haven: everyone can have a base here
ALTER TABLE planets DROP COLUMN IF EXISTS x;
ALTER TABLE planets DROP COLUMN IF EXISTS y;
CREATE TABLE IF NOT EXISTS meta (key text PRIMARY KEY, value text NOT NULL);
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
  // ship upgrades were tried and removed
  await pool.query("DELETE FROM queue WHERE kind='upgrade'");
  await pool.query("ALTER TABLE planets DROP COLUMN IF EXISTS ship_levels");
  await pool.query("ALTER TABLE fleets DROP COLUMN IF EXISTS levels");
  await pool.query("UPDATE queue SET type='mine_Fe' WHERE type='metal_mine'");
  await pool.query("UPDATE queue SET type='mine_Si' WHERE type='crystal_mine'");
  await pool.query(`UPDATE fleets SET loot = jsonb_strip_nulls(jsonb_build_object('Fe', loot->'metal', 'Si', loot->'crystal'))
    WHERE loot ? 'metal' OR loot ? 'crystal'`);
}

/** A saved game from an older galaxy (different stars/planets) can't be carried over: start fresh. */
async function wipeIfStale() {
  const { rows } = await pool.query("SELECT value FROM meta WHERE key='galaxy'");
  if (rows[0]?.value === GALAXY_VERSION) return;
  await pool.query("TRUNCATE queue, fleets, planets, systems");
  await pool.query("ALTER TABLE systems ALTER COLUMN x TYPE double precision, ALTER COLUMN y TYPE double precision");
  await pool.query("INSERT INTO meta (key,value) VALUES ('galaxy',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [GALAXY_VERSION]);
}

export function ready(): Promise<void> {
  return (g.__ready ??= (async () => {
    await pool.query(SCHEMA);
    await migrateToElements();
    await wipeIfStale();
    await seedGalaxy(pool);
  })().catch((e) => {
    g.__ready = undefined;
    throw e;
  }));
}

export async function resetGame() {
  await ready();
  await pool.query("TRUNCATE queue, fleets, planets, systems");
  await seedGalaxy(pool);
}
