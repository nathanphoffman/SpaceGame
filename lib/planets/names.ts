import { mulberry32 } from "./noise";
import type { PlanetParams } from "./types";

export function describePlanet(p: PlanetParams) {
  const type = p.label ?? { rocky: "Rocky world", moon: "Moon", gas: "Gas giant", ice: "Ice world", desert: "Desert world" }[p.kind];

  // size words from the planet's radius
  const size = p.radius < 0.75 ? "Small" : p.radius < 1.1 ? "Medium" : "Large";

  // surface words from how bumpy the planet is
  const surface = p.kind === "gas" ? "Gaseous" : p.bump < 0.025 ? "Smooth" : p.bump < 0.06 ? "Rolling" : p.bump < 0.1 ? "Rugged" : "Mountainous";

  return { type, size, surface, craters: p.craters.length, rings: !!p.rings, atmosphere: !!p.atmosphere };
}

// ---- names ----

const ONSET = ["k", "v", "z", "t", "r", "m", "n", "s", "l", "d", "g", "b", "th", "kr", "br", "st", "tr", "pl", "x"];
const VOWEL = ["a", "e", "i", "o", "u", "a", "e", "o"];
const CODA = ["n", "r", "s", "x", "th", "m", "l", "nd", "ria", "ra", "on", "is"];
const NUMERAL = ["II", "III", "IV", "V", "VI", "VII", "Prime"];

/** A pronounceable planet name from the seed, e.g. "Veloria", "Kraxen IV". */
export function planetName(seed: number) {
  const r = mulberry32(seed * 104729 + 3);

  for (let i = 0; i < 4; i++) r(); // warm up so nearby seeds don't look alike
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const syllables = 2 + Math.floor(r() * 2);
  let name = "";

  for (let i = 0; i < syllables; i++) name += pick(ONSET) + pick(VOWEL) + (i === syllables - 1 ? pick(CODA) : "");
  name = name[0].toUpperCase() + name.slice(1);

  return r() < 0.3 ? `${name} ${pick(NUMERAL)}` : name;
}

const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Sigma", "Tau", "Omega", "Kappa"];

/** e.g. "Sigma Krovan" */
export function starName(seed: number) {
  const r = mulberry32(seed * 15485863 + 11);

  return `${GREEK[Math.floor(r() * GREEK.length)]} ${planetName(seed + 5000).split(" ")[0]}`;
}
