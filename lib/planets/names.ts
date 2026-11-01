import { mulberry32 } from "./noise";
import type { PlanetParams } from "./types";

const SIZE_STEPS: [number, string][] = [[0.75, "Small"], [1.1, "Medium"]]; // radius limits; anything bigger is Large
const SURFACE_STEPS: [number, string][] = [[0.025, "Smooth"], [0.06, "Rolling"], [0.1, "Rugged"]]; // bumpiness limits; anything bumpier is Mountainous

/** the word for the first step whose limit is above the value, or the fallback past the last step */
const wordFor = (value: number, steps: [number, string][], fallback: string) => steps.find(([limit]) => value < limit)?.[1] ?? fallback;

export function describePlanet(params: PlanetParams) {
  const type = params.label ?? { rocky: "Rocky world", moon: "Moon", gas: "Gas giant", ice: "Ice world", desert: "Desert world" }[params.kind];
  const size = wordFor(params.radius, SIZE_STEPS, "Large"); // size words from the planet's radius
  const surface = params.kind === "gas" ? "Gaseous" : wordFor(params.bump, SURFACE_STEPS, "Mountainous"); // surface words from how bumpy the planet is

  return { type, size, surface, craters: params.craters.length, rings: !!params.rings, atmosphere: !!params.atmosphere };
}

// ---- names ----

const ONSET = ["k", "v", "z", "t", "r", "m", "n", "s", "l", "d", "g", "b", "th", "kr", "br", "st", "tr", "pl", "x"];
const VOWEL = ["a", "e", "i", "o", "u", "a", "e", "o"];
const CODA = ["n", "r", "s", "x", "th", "m", "l", "nd", "ria", "ra", "on", "is"];
const NUMERAL = ["II", "III", "IV", "V", "VI", "VII", "Prime"];
const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Sigma", "Tau", "Omega", "Kappa"];
const PLANET_NAME_SEED = { multiplier: 104729, offset: 3 };
const STAR_NAME_SEED = { multiplier: 15485863, offset: 11 };
const WARM_UP_DRAWS = 4; // so nearby seeds don't look alike
const MIN_SYLLABLES = 2;
const EXTRA_SYLLABLES = 2; // 0 or 1 more
const NUMERAL_CHANCE = 0.3;
const STAR_NAME_PLANET_OFFSET = 5000; // the star's second word is borrowed from a planet name of a nearby seed

/** A pronounceable planet name from the seed, e.g. "Veloria", "Kraxen IV". */
export function planetName(seed: number) {
  const random = mulberry32(seed * PLANET_NAME_SEED.multiplier + PLANET_NAME_SEED.offset);

  for (let draw = 0; draw < WARM_UP_DRAWS; draw++) random();

  const pick = <T,>(options: T[]) => options[Math.floor(random() * options.length)];
  const syllables = MIN_SYLLABLES + Math.floor(random() * EXTRA_SYLLABLES);
  let name = "";

  for (let syllable = 0; syllable < syllables; syllable++) name += pick(ONSET) + pick(VOWEL) + (syllable === syllables - 1 ? pick(CODA) : "");

  name = name[0].toUpperCase() + name.slice(1);

  return random() < NUMERAL_CHANCE ? `${name} ${pick(NUMERAL)}` : name;
}

/** e.g. "Sigma Krovan" */
export function starName(seed: number) {
  const random = mulberry32(seed * STAR_NAME_SEED.multiplier + STAR_NAME_SEED.offset);

  return `${GREEK[Math.floor(random() * GREEK.length)]} ${planetName(seed + STAR_NAME_PLANET_OFFSET).split(" ")[0]}`;
}
