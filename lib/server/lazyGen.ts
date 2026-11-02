import { sectorStars } from "@/lib/galaxy/sector";
import { fillSystem } from "@/lib/galaxy/systemGen";
import {
	insertPlanets,
	type PlanetRow,
	type Queryable,
} from "@/lib/server/seedGalaxy";

/** Create a sector's stars the first time anyone looks at it. The same sector always generates the same stars. */
export async function ensureSector(
	database: Queryable,
	sectorX: number,
	sectorY: number,
) {
	const done = await database.query(
		"SELECT 1 FROM sectors WHERE x=$1 AND y=$2",
		[sectorX, sectorY],
	);

	if (done.rows.length) return;

	for (const s of sectorStars(sectorX, sectorY)) {
		await database.query(
			"INSERT INTO systems (id,name,x,y,seed,sector_x,sector_y) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
			[s.id, s.name, s.x, s.y, s.seed, sectorX, sectorY],
		);
	}

	await database.query(
		"INSERT INTO sectors (x,y) VALUES ($1,$2) ON CONFLICT DO NOTHING",
		[sectorX, sectorY],
	);
}

/** Create a star's planets the first time its solar system is opened. */
export async function ensureSystem(q: Queryable, systemId: number) {
	const { rows } = await q.query(
		"SELECT name, seed, explored FROM systems WHERE id=$1",
		[systemId],
	);

	const s = rows[0];

	if (!s || s.explored) return;
	const planets = fillSystem(
		{ id: systemId, name: s.name, seed: s.seed, complete: false },
		[],
	);

	await insertPlanets(
		q,
		systemId,
		planets.map(
			(filler): PlanetRow => ({ ...filler, shared: false, ships: {} }),
		),
	);

	await q.query("UPDATE systems SET explored=true WHERE id=$1", [systemId]);
}
