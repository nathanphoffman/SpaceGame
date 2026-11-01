import { mulberry32 } from "@/lib/planets/noise";
import { starName } from "@/lib/planets/names";

// The galaxy map is a GRID x GRID board of square sectors, SECTOR_LY light-years wide. Sol's sector is the exact centre.
// Sector (x, y) with y increasing northwards; the centre of Sol's sector is the origin of the light-year coordinates.
export const GRID = 21;
export const CENTER = 10;
export const SECTOR_LY = 32;

export const validSector = (sectorX: number, sectorY: number) =>
  Number.isInteger(sectorX) && Number.isInteger(sectorY) && sectorX >= 0 && sectorY >= 0 && sectorX < GRID && sectorY < GRID;

export const sectorCentre = (sectorX: number, sectorY: number) => ({ x: (sectorX - CENTER) * SECTOR_LY, y: (sectorY - CENTER) * SECTOR_LY });

/** the sector a light-year position falls in */
export const sectorOf = (x: number, y: number): [number, number] =>
  [CENTER + Math.round(x / SECTOR_LY), CENTER + Math.round(y / SECTOR_LY)];

const FIRST_GENERATED_ID = 1000; // ids below this are the hand-made catalog
const IDS_PER_SECTOR = 100;
const RNG_SEED = { x: 131, y: 977, offset: 5, multiplier: 7919, base: 101 };
const WARM_UP_DRAWS = 5;
const MIN_STARS = 18;
const STAR_COUNT_SPREAD = 18; // a sector has 18 to 35 stars
const PLACEMENT_TRIES = 8;
const USABLE_SECTOR_SHARE = 0.94; // stars stay a little inside the sector edge
const MIN_STAR_GAP_LY = 1.8;
const SEED_RANGE = 99999;
const HUNDREDTHS = 100;
const HALF = 0.5; // positions are rounded to a hundredth of a light-year

/** system ids: 1..99 are the hand-made catalog; every generated sector gets its own block of 100 */
const generatedSystemId = (sectorX: number, sectorY: number, number: number) => FIRST_GENERATED_ID + (sectorY * GRID + sectorX) * IDS_PER_SECTOR + number;

const sectorRng = (sectorX: number, sectorY: number) => {
  const random = mulberry32((sectorX * RNG_SEED.x + sectorY * RNG_SEED.y + RNG_SEED.offset) * RNG_SEED.multiplier + RNG_SEED.base);

  for (let draw = 0; draw < WARM_UP_DRAWS; draw++) random();

  return random;
};

const countFrom = (random: () => number) => MIN_STARS + Math.floor(random() * STAR_COUNT_SPREAD);

/** how many stars a (generated) sector has: cheap, so the galaxy view can shade every square */
export const sectorStarCount = (sectorX: number, sectorY: number) => countFrom(sectorRng(sectorX, sectorY));

export type SectorStar = { id: number; name: string; seed: number; x: number; y: number };

/** the same stars every time for a given sector; positions are in light-years */
export function sectorStars(sectorX: number, sectorY: number): SectorStar[] {
  const random = sectorRng(sectorX, sectorY);
  const count = countFrom(random);
  const centre = sectorCentre(sectorX, sectorY);
  const out: SectorStar[] = [];

  for (let number = 0; number < count; number++) {
    let x = 0, y = 0;

    for (let tries = 0; tries < PLACEMENT_TRIES; tries++) { // keep stars from sitting on top of each other
      x = centre.x + (random() - HALF) * SECTOR_LY * USABLE_SECTOR_SHARE;
      y = centre.y + (random() - HALF) * SECTOR_LY * USABLE_SECTOR_SHARE;

      if (out.every((other) => Math.hypot(other.x - x, other.y - y) > MIN_STAR_GAP_LY)) break;
    }

    const seed = 1 + Math.floor(random() * SEED_RANGE);
    out.push({ id: generatedSystemId(sectorX, sectorY, number), name: starName(seed), seed, x: Math.round(x * HUNDREDTHS) / HUNDREDTHS, y: Math.round(y * HUNDREDTHS) / HUNDREDTHS });
  }

  return out;
}
