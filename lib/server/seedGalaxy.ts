import { type Owner, PLANET_KIND } from "@/lib/defs";
import type { Pool } from "pg";
import { SYSTEMS } from "@/lib/data/catalog";
import { fillSystem } from "@/lib/galaxy/systemGen";
import type { Filler } from "@/lib/galaxy/systemGen";

/** anything with pg's query(): the pool, or a client inside a transaction */
export type Q = { query(text: string, values?: unknown[]): Promise<{ rows: any[] }> }; // eslint-disable-line @typescript-eslint/no-explicit-any

// a new game starts on the planet flagged `start` in the catalog (Earth)
const START = { resources: { Fe: 500, Si: 300 }, buildings: { mine_Fe: 1, mine_Si: 1 }, ships: { fighter: 2 } };
const NOTHING = { resources: {}, buildings: {}, ships: {} };

export type PlanetRow = Omit<Filler, "kind"> & { kind: Owner; shared: boolean; ships: Record<string, number> };

export async function insertPlanets(db: Q, systemId: number, rows: PlanetRow[]) {
  for (const planet of rows) {
    await db.query(
      `INSERT INTO planets (id,name,system_id,orbit,kind,resources,buildings,ships,defense,seed,shared)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [planet.id, planet.name, systemId, planet.orbit, planet.kind, JSON.stringify(planet.resources), JSON.stringify(planet.buildings), JSON.stringify(planet.ships), planet.defense, planet.seed, planet.shared],
    );
  }
}

/** The hand-made centre of the galaxy: Sol and its neighbours. Idempotent. Everything else is generated when first visited (see lazyGen.ts). */
export async function seedGalaxy(pool: Pool) {
  await pool.query("INSERT INTO sectors (x,y) VALUES (10,10) ON CONFLICT DO NOTHING");

  for (const system of SYSTEMS) {
    await pool.query(
      "INSERT INTO systems (id,name,x,y,seed,sector_x,sector_y,explored) VALUES ($1,$2,$3,$4,$5,10,10,true) ON CONFLICT (id) DO NOTHING",
      [system.id, system.name, system.x, system.y, system.seed],
    );

    const real = system.bodies.map((body): PlanetRow => ({
      id: body.id, name: body.name, orbit: body.orbit, seed: body.seed, shared: !!body.shared, defense: 0,
      // the starting planet belongs to the player and gets the starting resources
      kind: body.start ? PLANET_KIND.player : PLANET_KIND.empty, ...(body.start ? START : NOTHING),
    }));

    const generated = fillSystem(system, system.bodies).map((filler): PlanetRow => ({ ...filler, shared: false, ships: {} }));
    await insertPlanets(pool, system.id, [...real, ...generated]);
  }
}
