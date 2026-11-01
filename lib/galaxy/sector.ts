import { mulberry32 } from "@/lib/planets/noise";
import { starName } from "@/lib/planets/names";

// The galaxy map is a GRID x GRID board of square sectors, SECTOR_LY light-years wide. Sol's sector is the exact centre.
// Sector (x, y) with y increasing northwards; the centre of Sol's sector is the origin of the light-year coordinates.
export const GRID = 21;
export const CENTER = 10;
export const SECTOR_LY = 32;

export const validSector = (sectorX: number, sectorY: number) =>
  Number.isInteger(sectorX) && Number.isInteger(sectorY) && sectorX >= 0 && sectorY >= 0 && sectorX < GRID && sectorY < GRID;

export const sectorCentre = (sx: number, sy: number) => ({ x: (sx - CENTER) * SECTOR_LY, y: (sy - CENTER) * SECTOR_LY });

/** the sector a light-year position falls in */
export const sectorOf = (x: number, y: number): [number, number] =>
  [CENTER + Math.round(x / SECTOR_LY), CENTER + Math.round(y / SECTOR_LY)];

/** system ids: 1..99 are the hand-made catalog; every generated sector gets its own block of 100 */
const generatedSystemId = (sx: number, sy: number, n: number) => 1000 + (sy * GRID + sx) * 100 + n;

const sectorRng = (sx: number, sy: number) => {
  const random = mulberry32((sx * 131 + sy * 977 + 5) * 7919 + 101);

  for (let index = 0; index < 5; index++) random();

  return random;
};

const countFrom = (r: () => number) => 18 + Math.floor(r() * 18);

/** how many stars a (generated) sector has: cheap, so the galaxy view can shade every square */
export const sectorStarCount = (sx: number, sy: number) => countFrom(sectorRng(sx, sy));

export type SectorStar = { id: number; name: string; seed: number; x: number; y: number };

/** the same stars every time for a given sector; positions are in light-years */
export function sectorStars(sx: number, sy: number): SectorStar[] {
  const r = sectorRng(sx, sy);
  const count = countFrom(r);
  const c = sectorCentre(sx, sy);
  const out: SectorStar[] = [];

  for (let n = 0; n < count; n++) {
    let x = 0, y = 0;

    for (let tries = 0; tries < 8; tries++) { // keep stars from sitting on top of each other
      x = c.x + (r() - 0.5) * SECTOR_LY * 0.94;
      y = c.y + (r() - 0.5) * SECTOR_LY * 0.94;

      if (out.every((o) => Math.hypot(o.x - x, o.y - y) > 1.8)) break;
    }

    const seed = 1 + Math.floor(r() * 99999);
    out.push({ id: generatedSystemId(sx, sy, n), name: starName(seed), seed, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  return out;
}
