// Fills the gaps in a star system: planets we haven't discovered yet are generated, deterministically.
import { PLANET_KIND, mineType, type Owner } from "@/lib/defs";
import { SUN_TEMP_K, STEFAN_BOLTZMANN_POWER } from "@/lib/planets/constants";
import { mulberry32 } from "@/lib/planets/noise";
import { planetName } from "@/lib/planets/names";
import { planetStats } from "@/lib/planets/planetStats";
import { starParams } from "@/lib/planets/starParams";

export type Filler = {
  id: number;
  name: string;
  orbit: number; // AU
  kind: Exclude<Owner, typeof PLANET_KIND.player>;
  resources: Record<string, number>;
  buildings: Record<string, number>;
  defense: number;
  seed: number;
};

const COUNT_SEED = { multiplier: 977, offset: 13 };
const COUNT_WARM_UP_DRAWS = 3;
const DICE_SIDES = 6;
const HALF = 0.5;
const ORBIT_NUDGE = 1.5; // a crowded orbit is moved this many times further out
const ORBIT_JITTER = 0.5; // how far (in slots) a planet may stray from its even spacing
const MILLI = 1000; // orbits are rounded to a thousandth of an AU
const MAX_ARMED_ELEMENTS = 3;
const BASE_DEFENSE = 10;
const DEFENSE_RANGE = 400;
const FIRST_LETTER_CODE = 97; // "a"
const SYSTEM_ID_STRIDE = 100;

/** 2d6: 2 and 12 are rare (1 in 36 each), 7 is the most common. */
export function planetCount(starSeed: number) {
  const random = mulberry32(starSeed * COUNT_SEED.multiplier + COUNT_SEED.offset);

  for (let draw = 0; draw < COUNT_WARM_UP_DRAWS; draw++) random();

  return 2 + Math.floor(random() * DICE_SIDES) + Math.floor(random() * DICE_SIDES); // two d6 (each 0..5, +1 each)
}

const MAX_STAR_SCALE = 3;
const MIN_STAR_SCALE = 0.15;
const INNERMOST_AU = 0.3;
const ORBIT_SPREAD = 40; // the outermost generated orbit is about this many times the innermost
const TOO_CLOSE = 1.35; // two orbits closer than this ratio would crowd each other
const MAX_NUDGES = 3;
const HOSTILE_CHANCE = 0.3;
const SEED_RANGE = 99999;
const STOCKPILE_PER_LEVEL = 300;
const MAX_MINE_LEVEL = 6;
const NAMED_LETTERS = 26;
const WARM_UP_DRAWS = 4;
const SEED_MULTIPLIER = 4801;
const SEED_OFFSET = 29;

// true when the orbit is within the too-close ratio of any orbit already taken, on either side
const crowds = (orbit: number, taken: number[]) => taken.some((other) => orbit / other < TOO_CLOSE && other / orbit < TOO_CLOSE);

/** dim stars have their zone of orbits closer in: scale the orbit range with the star's brightness */
function orbitScale(star: { radius: number; temp: number }) {
  const luminosity = star.radius * star.radius * Math.pow(star.temp / SUN_TEMP_K, STEFAN_BOLTZMANN_POWER);

  return Math.min(MAX_STAR_SCALE, Math.max(MIN_STAR_SCALE, Math.sqrt(luminosity)));
}

/** hostile bases run mines on their planet's most common elements and sit on a stockpile */
function arm(composition: { symbol: string }[], random: () => number) {
  const buildings: Record<string, number> = {};
  const resources: Record<string, number> = {};

  for (const { symbol } of composition.slice(0, Math.min(1 + Math.floor(random() * MAX_ARMED_ELEMENTS), composition.length))) {
    const level = 1 + Math.floor(random() * MAX_MINE_LEVEL);
    buildings[mineType(symbol)] = level;
    resources[symbol] = STOCKPILE_PER_LEVEL * level;
  }

  return { buildings, resources };
}

/**
 * Generate the planets we don't know about. A system gets 2d6 planets in total, so a star with
 * several confirmed planets gets few extras. `known` are the real orbits, which stay where they are.
 */
export function fillSystem(sys: { id: number; name: string; seed: number; complete: boolean }, known: { orbit: number; id: number }[]): Filler[] {
  if (sys.complete) return [];

  const want = Math.max(0, planetCount(sys.seed) - known.length);
  const random = mulberry32(sys.seed * SEED_MULTIPLIER + SEED_OFFSET);

  for (let draw = 0; draw < WARM_UP_DRAWS; draw++) random();

  const scale = orbitScale(starParams(sys.seed));
  const taken = known.map((planet) => planet.orbit);
  const out: Filler[] = [];

  for (let index = 0; index < want; index++) {
    const spot = (index + HALF + (random() - HALF) * ORBIT_JITTER) / want; // 0..1 along the range of orbits, with some jitter
    let orbit = INNERMOST_AU * scale * Math.pow(ORBIT_SPREAD, spot);

    for (let nudges = 0; nudges < MAX_NUDGES && crowds(orbit, taken); nudges++) orbit *= ORBIT_NUDGE;

    if (crowds(orbit, taken)) continue; // no room left here

    orbit = Math.round(orbit * MILLI) / MILLI;
    taken.push(orbit);

    const seed = 1 + Math.floor(random() * SEED_RANGE);
    const hostile = random() < HOSTILE_CHANCE;
    const { buildings, resources } = hostile ? arm(planetStats(seed).composition, random) : { buildings: {}, resources: {} };
    const number = known.length + out.length + 1;

    out.push({
      id: sys.id * SYSTEM_ID_STRIDE + number,
      name: number < NAMED_LETTERS ? `${sys.name} ${String.fromCharCode(FIRST_LETTER_CODE + number)}` : planetName(seed),
      orbit, kind: hostile ? PLANET_KIND.npc : PLANET_KIND.empty, resources, buildings, // hostile planets are enemy bases, the rest are free to settle
      defense: hostile ? Math.round(BASE_DEFENSE + random() * random() * DEFENSE_RANGE) : 0,
      seed,
    });
  }

  return out;
}
