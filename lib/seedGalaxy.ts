import type { Pool } from "pg";
import { SYSTEMS } from "./data/catalog";
import { fillSystem } from "./systemGen";

// a new game starts on the planet flagged `start` in the catalog (Earth)
const START = { resources: { Fe: 500, Si: 300 }, buildings: { mine_Fe: 1, mine_Si: 1 }, ships: { fighter: 2 } };
const NOTHING = { resources: {}, buildings: {}, ships: {} };

/** Idempotent: only inserts what is missing. Real bodies come from the catalog, the rest is generated to fill the gaps. */
export async function seedGalaxy(pool: Pool) {
  for (const s of SYSTEMS) {
    await pool.query(
      "INSERT INTO systems (id,name,x,y,seed) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [s.id, s.name, s.x, s.y, s.seed],
    );
    const real = s.bodies.map((b) => ({
      id: b.id, name: b.name, orbit: b.orbit, seed: b.seed, shared: !!b.shared, defense: 0,
      kind: b.start ? "player" : "empty", ...(b.start ? START : NOTHING),
    }));
    const generated = fillSystem(s, s.bodies).map((f) => ({ ...f, shared: false, ships: {} }));
    for (const d of [...real, ...generated]) {
      await pool.query(
        `INSERT INTO planets (id,name,system_id,orbit,kind,resources,buildings,ships,defense,seed,shared)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [d.id, d.name, s.id, d.orbit, d.kind, JSON.stringify(d.resources), JSON.stringify(d.buildings), JSON.stringify(d.ships), d.defense, d.seed, d.shared],
      );
    }
  }
}
