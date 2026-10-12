import { EXOPLANETS } from "./exoplanets";
import { SOL_BODIES } from "./sol";
import { STARS } from "./stars";
import type { BodySpec, SystemSpec } from "./types";

/** bump this when the catalog changes: a stored game from an older version is wiped and re-seeded */
export const GALAXY_VERSION = "local-neighbourhood-1";
/** real bodies and stars get seeds from here up; generated planets use 1..99999 */
export const SEED_BASE = 1_000_000;

const D2R = Math.PI / 180;

/** J2000 equatorial coordinates -> position in the galactic plane (light-years, Sol at the origin) */
function galacticXY(raH: number, raM: number, decD: number, decM: number, ly: number): [number, number] {
  const ra = (raH + raM / 60) * 15 * D2R;
  const dec = (decD < 0 ? -1 : 1) * (Math.abs(decD) + decM / 60) * D2R;
  const pole = { ra: 192.85948 * D2R, dec: 27.12825 * D2R, l: 122.93192 * D2R }; // north galactic pole
  const b = Math.asin(Math.sin(dec) * Math.sin(pole.dec) + Math.cos(dec) * Math.cos(pole.dec) * Math.cos(ra - pole.ra));
  const l = pole.l - Math.atan2(
    Math.cos(dec) * Math.sin(ra - pole.ra),
    Math.sin(dec) * Math.cos(pole.dec) - Math.cos(dec) * Math.sin(pole.dec) * Math.cos(ra - pole.ra),
  );
  return [ly * Math.cos(b) * Math.cos(l), ly * Math.cos(b) * Math.sin(l)];
}

export const SYSTEMS: SystemSpec[] = STARS.map(([name, raH, raM, decD, decM, ly, spec, tempK, radius], i) => {
  const id = i + 1;
  const [x, y] = galacticXY(raH, raM, decD, decM, ly);
  const bodies: BodySpec[] = [];
  const add = (b: Omit<BodySpec, "id" | "seed">) => {
    const n = bodies.length + 1;
    bodies.push({ ...b, id: id * 100 + n, seed: SEED_BASE + id * 100 + n });
  };
  if (name === "Sol") for (const b of SOL_BODIES) add(b);
  for (const [star, pName, orbit, kind, diameterKm, candidate] of EXOPLANETS) {
    if (star === name) add({ name: pName, orbit, kind, diameterKm, note: candidate ? "Candidate exoplanet (not yet confirmed)" : "Confirmed exoplanet" });
  }
  return { id, seed: SEED_BASE + id, name, spec, tempK, radius, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, ly, bodies, complete: name === "Sol" };
});

export const BODY_BY_SEED = new Map(SYSTEMS.flatMap((s) => s.bodies).map((b) => [b.seed, b]));
export const STAR_BY_SEED = new Map(SYSTEMS.map((s) => [s.seed, s]));

/** one line for the planet panel: where this world's data comes from */
export const bodyNote = (seed: number) => BODY_BY_SEED.get(seed)?.note ?? "Undiscovered: generated to fill the gaps";
