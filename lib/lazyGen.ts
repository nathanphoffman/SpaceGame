import { insertPlanets, type PlanetRow, type Q } from "./seedGalaxy";
import { sectorStars } from "./sector";
import { fillSystem } from "./systemGen";

/** Create a sector's stars the first time anyone looks at it. The same sector always generates the same stars. */
export async function ensureSector(q: Q, sx: number, sy: number) {
  const done = await q.query("SELECT 1 FROM sectors WHERE x=$1 AND y=$2", [sx, sy]);

  if (done.rows.length) return;

  for (const s of sectorStars(sx, sy)) {
    await q.query(
      "INSERT INTO systems (id,name,x,y,seed,sector_x,sector_y) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
      [s.id, s.name, s.x, s.y, s.seed, sx, sy],
    );
  }

  await q.query("INSERT INTO sectors (x,y) VALUES ($1,$2) ON CONFLICT DO NOTHING", [sx, sy]);
}

/** Create a star's planets the first time its solar system is opened. */
export async function ensureSystem(q: Q, id: number) {
  const { rows } = await q.query("SELECT name, seed, explored FROM systems WHERE id=$1", [id]);
  const s = rows[0];

  if (!s || s.explored) return;
  const planets = fillSystem({ id, name: s.name, seed: s.seed, complete: false }, []);
  await insertPlanets(q, id, planets.map((filler): PlanetRow => ({ ...filler, shared: false, ships: {} })));
  await q.query("UPDATE systems SET explored=true WHERE id=$1", [id]);
}
