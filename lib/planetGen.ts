import { ELEMENTS, type Element } from "./defs";
import { BODY_BY_SEED, STAR_BY_SEED } from "./data/catalog";
import { applyLook, parseComposition } from "./data/realBodies";

// Deterministic planet generation: the same seed always gives the same world.
// Pure functions only (no three.js) so it can be used on the server or in scripts.

export type PlanetKind = "rocky" | "moon" | "gas" | "ice" | "desert";
export type RGB = [number, number, number];

export type PlanetParams = {
  kind: PlanetKind;
  radius: number;        // visual size, ~0.45 (tiny moon) .. 1.45 (gas giant)
  bump: number;          // terrain height, 0 (smooth) .. ~0.13 (mountainous)
  craters: { dir: RGB; size: number; depth: number }[];
  seaLevel: number;      // 0..1 height under which there is ocean (-1 = none)
  noiseScale: number;
  noiseOffset: number;
  low: RGB;
  high: RGB;
  ocean: RGB;
  bands: RGB[];          // gas giant band colours
  bandFreq: number;
  atmosphere: RGB | null;
  rings: { inner: number; outer: number; tilt: number; color: RGB; seed: number } | null;
  tilt: number;          // axial tilt (radians)
  spin: number;          // radians per second
  label?: string;        // overrides the generic kind name, e.g. "Ice giant"
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- value noise ----

function hash3(x: number, y: number, z: number, s: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function noise3(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, s);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/** fractal noise, roughly 0..1 with contrast boosted around 0.5 */
export function fbm(x: number, y: number, z: number, s: number, octaves = 5) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f, s + i * 101);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return Math.min(1, Math.max(0, ((sum / norm) - 0.5) * 1.7 + 0.5));
}

// ---- parameters ----

export function planetParams(seed: number): PlanetParams {
  const real = BODY_BY_SEED.get(seed); // real bodies pin kind, size and (if known) look to the data
  const r = mulberry32(seed * 7919 + 17);
  const range = (a: number, b: number) => a + (b - a) * r();
  const jitter = (c: RGB, amt = 0.08): RGB => c.map((v) => Math.min(1, Math.max(0, v + (r() - 0.5) * amt * 2))) as RGB;

  const roll = r();
  const kind: PlanetKind = real?.kind ?? (roll < 0.25 ? "rocky" : roll < 0.5 ? "moon" : roll < 0.7 ? "gas" : roll < 0.85 ? "ice" : "desert");

  const radius = {
    moon: range(0.45, 0.8), rocky: range(0.7, 1.15), desert: range(0.7, 1.1), ice: range(0.65, 1.1), gas: range(1.1, 1.45),
  }[kind];
  const bumpMax = { moon: 0.08, rocky: 0.13, desert: 0.12, ice: 0.06, gas: 0 }[kind];
  const bump = bumpMax * Math.pow(r(), 0.8);
  const craterMax = { moon: 80, rocky: 20, desert: 30, ice: 25, gas: 0 }[kind];
  const craterCount = real?.look?.craters ?? Math.floor(craterMax * Math.pow(r(), 1.2));

  const craters = Array.from({ length: craterCount }, () => {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    const big = Math.pow(r(), 2.5);
    return { dir: [s * Math.cos(a), z, s * Math.sin(a)] as RGB, size: 0.05 + big * 0.28, depth: 0.02 + big * 0.05 };
  });

  const palettes: Record<PlanetKind, { low: RGB; high: RGB }> = {
    rocky: { low: [0.2, 0.48, 0.2], high: [0.55, 0.45, 0.35] },
    moon: { low: [0.34, 0.34, 0.35], high: [0.7, 0.69, 0.67] },
    desert: { low: [0.55, 0.3, 0.15], high: [0.88, 0.68, 0.42] },
    ice: { low: [0.6, 0.75, 0.86], high: [0.96, 0.98, 1] },
    gas: { low: [0.7, 0.55, 0.35], high: [0.9, 0.8, 0.6] },
  };
  const pal = palettes[kind];

  const gasBase = jitter([0.72, 0.58, 0.4], 0.15);
  const bands: RGB[] = [gasBase, jitter([0.9, 0.82, 0.65], 0.12), jitter([0.55, 0.4, 0.3], 0.12), jitter([0.8, 0.7, 0.55], 0.12)];

  const atmoChance = { rocky: 0.8, ice: 0.4, desert: 0.5, moon: 0, gas: 1 }[kind];
  const atmoColor: RGB = { rocky: [0.4, 0.65, 1], ice: [0.7, 0.85, 1], desert: [1, 0.7, 0.45], moon: [1, 1, 1], gas: [0.9, 0.8, 0.6] }[kind] as RGB;

  const ringChance = { gas: 0.65, ice: 0.25, rocky: 0.1, desert: 0.1, moon: 0.05 }[kind];
  const hasRings = r() < ringChance;
  const inner = radius * range(1.25, 1.5);

  const params: PlanetParams = {
    kind,
    radius,
    bump,
    craters,
    seaLevel: kind === "rocky" ? range(0.4, 0.55) : -1,
    noiseScale: range(1.2, 2.6),
    noiseOffset: Math.floor(r() * 1000),
    low: jitter(pal.low),
    high: jitter(pal.high),
    ocean: jitter([0.1, 0.25, 0.5], 0.05),
    bands,
    bandFreq: range(5, 12),
    atmosphere: r() < atmoChance ? atmoColor : null,
    rings: hasRings
      ? { inner, outer: Math.min(inner + radius * range(0.4, 0.8), radius * 1.9), tilt: range(-0.5, 0.5), color: jitter([0.75, 0.7, 0.62], 0.1), seed: Math.floor(r() * 1000) }
      : null,
    tilt: range(-0.45, 0.45),
    spin: range(0.08, 0.3),
  };
  return real ? applyLook(params, real) : params;
}

export function describePlanet(p: PlanetParams) {
  const type = p.label ?? { rocky: "Rocky world", moon: "Moon", gas: "Gas giant", ice: "Ice world", desert: "Desert world" }[p.kind];
  const size = p.radius < 0.75 ? "Small" : p.radius < 1.1 ? "Medium" : "Large";
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

// ---- stars ----
// Real stellar classification (Morgan-Keenan): spectral class O B A F G K M from hot to cool,
// a 0-9 subtype, and a luminosity class (V main sequence, III giant, I supergiant, D white dwarf).

export type StarParams = {
  spectral: string;   // e.g. "G2V"
  label: string;      // e.g. "Yellow dwarf"
  temp: number;       // surface temperature in K
  radius: number;     // in solar radii
  color: RGB;         // 0..1, the colour the star appears in a dark sky
  size: number;       // display scale, ~0.5 (white dwarf) .. ~1.8 (supergiant)
  bright: number;     // 0..1, how much glare/spikes to draw
};

// apparent colour per class (the standard "blackbody as seen by eye" table)
const CLASS_COLOR: Record<string, RGB> = {
  O: [0.608, 0.69, 1], B: [0.667, 0.749, 1], A: [0.792, 0.843, 1], F: [0.973, 0.969, 1],
  G: [1, 0.957, 0.918], K: [1, 0.824, 0.631], M: [1, 0.8, 0.435],
};
const CLASS_ORDER = ["O", "B", "A", "F", "G", "K", "M"];
// [hot end K, cool end K, main-sequence radius at subtype 0, at subtype 9]
const CLASS_DATA: Record<string, [number, number, number, number]> = {
  O: [50000, 30000, 12, 6.6], B: [30000, 10000, 6.6, 1.8], A: [10000, 7500, 1.8, 1.4],
  F: [7500, 6000, 1.4, 1.15], G: [6000, 5200, 1.1, 0.85], K: [5200, 3700, 0.8, 0.6], M: [3700, 2400, 0.55, 0.1],
};

type StarKind = { weight: number; classes: string[]; lum: "V" | "III" | "I" | "D" };
const STAR_KINDS: StarKind[] = [
  { weight: 24, classes: ["M"], lum: "V" },
  { weight: 16, classes: ["K"], lum: "V" },
  { weight: 18, classes: ["G"], lum: "V" },
  { weight: 12, classes: ["F"], lum: "V" },
  { weight: 8, classes: ["A"], lum: "V" },
  { weight: 5, classes: ["B"], lum: "V" },
  { weight: 2, classes: ["O"], lum: "V" },
  { weight: 7, classes: ["K", "M"], lum: "III" }, // red giants
  { weight: 3, classes: ["M"], lum: "I" },        // red supergiants
  { weight: 2, classes: ["B", "A"], lum: "I" },   // blue supergiants
  { weight: 3, classes: ["D"], lum: "D" },        // white dwarfs
];

const CLASS_LABEL: Record<string, string> = {
  O: "Blue star", B: "Blue-white star", A: "White star", F: "Yellow-white star", G: "Yellow dwarf", K: "Orange dwarf", M: "Red dwarf",
};

/** display size and glare from radius (solar radii) and temperature (K); luminosity ~ R^2 T^4 */
function starLook(radius: number, temp: number) {
  const size = Math.min(1.8, Math.max(0.5, 0.6 + 0.35 * Math.log10(radius / 0.1)));
  const lum = radius * radius * Math.pow(temp / 5772, 4);
  const bright = Math.min(1, Math.max(0.2, 0.35 + 0.12 * Math.log10(Math.max(lum, 1e-3)) + 0.2));
  return { size, bright };
}

const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function starParams(seed: number): StarParams {
  const real = STAR_BY_SEED.get(seed);
  if (real) {
    const cls = real.spec[0], sub = Number(real.spec[1]);
    const next = CLASS_ORDER[Math.min(CLASS_ORDER.indexOf(cls) + 1, CLASS_ORDER.length - 1)];
    return {
      spectral: real.spec, label: CLASS_LABEL[cls], temp: real.tempK, radius: real.radius,
      color: lerpRgb(CLASS_COLOR[cls], CLASS_COLOR[next], (sub / 10) * 0.6), ...starLook(real.radius, real.tempK),
    };
  }
  const r = mulberry32(seed * 31 + 7);
  for (let i = 0; i < 3; i++) r();

  let roll = r() * STAR_KINDS.reduce((s, k) => s + k.weight, 0);
  const kind = STAR_KINDS.find((k) => (roll -= k.weight) < 0) ?? STAR_KINDS[0];
  const cls = kind.classes[Math.floor(r() * kind.classes.length)];
  const sub = Math.floor(r() * 10);
  const jitter = r();

  if (kind.lum === "D") {
    // white dwarf: hot, tiny, bluish-white
    const temp = Math.round(8000 + jitter * 25000);
    const idx = Math.min(9, Math.max(1, Math.round(50400 / temp))); // DA temperature index = 50400 / T
    return { spectral: `DA${idx}`, label: "White dwarf", temp, radius: 0.012, color: [0.82, 0.88, 1], size: 0.5, bright: 0.35 };
  }

  const [hot, cool, rHot, rCool] = CLASS_DATA[cls];
  const temp = Math.round(hot + (cool - hot) * (sub / 9));
  let radius = rHot + (rCool - rHot) * (sub / 9);
  if (kind.lum === "III") radius = 12 + jitter * 40 + (cls === "M" ? 20 : 0);
  if (kind.lum === "I") radius = cls === "M" ? 250 + jitter * 600 : 30 + jitter * 60;

  // colour: class colour blended toward the next (cooler) class by subtype
  const next = CLASS_ORDER[Math.min(CLASS_ORDER.indexOf(cls) + 1, CLASS_ORDER.length - 1)];
  const color = lerpRgb(CLASS_COLOR[cls], CLASS_COLOR[next], (sub / 10) * 0.6);

  const label =
    kind.lum === "I" ? (cls === "M" ? "Red supergiant" : "Blue supergiant")
    : kind.lum === "III" ? (cls === "M" ? "Red giant" : "Orange giant")
    : CLASS_LABEL[cls];

  return { spectral: `${cls}${sub}${kind.lum}`, label, temp, radius, color, ...starLook(radius, temp) };
}

const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Sigma", "Tau", "Omega", "Kappa"];

/** e.g. "Sigma Krovan" */
export function starName(seed: number) {
  const r = mulberry32(seed * 15485863 + 11);
  return `${GREEK[Math.floor(r() * GREEK.length)]} ${planetName(seed + 5000).split(" ")[0]}`;
}

// ---- statistics ----
// Planets are made of the nine game elements (see ELEMENTS in defs.ts). Titanium, Uranium and
// Helium-3 are rare; very occasionally a planet is made of just one of them.

// common elements a world of each kind is likely to be made of, with rough relative abundance
const ELEMENT_POOL: Record<PlanetKind, [string, number][]> = {
  rocky: [["O", 10], ["Si", 8], ["Fe", 8], ["Al", 5], ["C", 3], ["H", 2]],
  moon: [["O", 9], ["Si", 8], ["Fe", 6], ["Al", 5], ["C", 0.5], ["H", 0.3]],
  desert: [["O", 9], ["Si", 8], ["Fe", 7], ["Al", 5], ["C", 1], ["H", 0.5]],
  ice: [["H", 10], ["O", 10], ["C", 4], ["Si", 2], ["Fe", 1.5], ["Al", 0.5]],
  gas: [["H", 14], ["C", 2], ["O", 1.5], ["Fe", 0.2], ["Si", 0.2]],
};
// chance that a world has a trace of each rare element at all (Helium-3 is mostly a gas giant thing)
const RARE_CHANCE: Record<PlanetKind, Record<string, number>> = {
  rocky: { Ti: 0.04, U: 0.012, He: 0.001 },
  moon: { Ti: 0.1, U: 0.02, He: 0.002 },
  desert: { Ti: 0.06, U: 0.015, He: 0.001 },
  ice: { Ti: 0.03, U: 0.008, He: 0.012 },
  gas: { Ti: 0.004, U: 0.003, He: 0.16 },
};
const RARE = new Set(["Ti", "U", "He"]);
const WHOLE_PLANET_RARE_CHANCE = 1 / 300; // a world that is entirely one rare element

export type PlanetStats = {
  diameterKm: number;
  earths: number; // diameter relative to Earth
  composition: { symbol: string; name: string; pct: number }[]; // sorted, sums to 100
};

const statsCache = new Map<number, PlanetStats>();

export function planetStats(seed: number): PlanetStats {
  const hit = statsCache.get(seed);
  if (hit) return hit;
  const stats = computePlanetStats(seed);
  statsCache.set(seed, stats);
  return stats;
}

function computePlanetStats(seed: number): PlanetStats {
  const real = BODY_BY_SEED.get(seed);
  if (real?.composition) {
    return { diameterKm: real.diameterKm, earths: real.diameterKm / 12742, composition: parseComposition(real.composition) };
  }
  const p = planetParams(seed);
  const r = mulberry32(seed * 2246822519 + 97);
  for (let i = 0; i < 4; i++) r();

  // game radius -> kilometres (Earth 12,742, Mars 6,779, Moon 3,474, Jupiter 139,820)
  const perUnit = { rocky: 11000, desert: 10500, ice: 10000, moon: 5000, gas: 95000 }[p.kind];
  const diameterKm = real ? real.diameterKm : Math.round((p.radius * perUnit * (0.92 + r() * 0.16)) / (p.kind === "gas" ? 100 : 10)) * (p.kind === "gas" ? 100 : 10);

  // very rarely the whole planet is one rare element: a jackpot world
  if (r() < WHOLE_PLANET_RARE_CHANCE) {
    const symbol = p.kind === "gas" ? "He" : r() < 0.7 ? "Ti" : "U";
    return { diameterKm, earths: diameterKm / 12742, composition: [{ symbol, name: ELEMENTS[symbol as Element].name, pct: 100 }] };
  }

  // 1d6 predominant elements; each share is its natural abundance times a random factor,
  // so a gas giant is still mostly H/He but the exact ratios differ world to world
  const n = Math.max(2, 1 + Math.floor(r() * 6)); // a d6, but never a single-element planet (that is the rare jackpot case)
  const rare = Object.entries(RARE_CHANCE[p.kind]).filter(([, chance]) => r() < chance).map(([sym]) => sym);
  const pool = [...ELEMENT_POOL[p.kind]];
  const picked: [string, number][] = [];
  for (let i = 0; i < Math.max(1, n - rare.length) && pool.length; i++) {
    let roll = r() * pool.reduce((sum, [, w]) => sum + w, 0);
    const idx = pool.findIndex(([, w]) => (roll -= w) < 0);
    picked.push(pool.splice(idx < 0 ? 0 : idx, 1)[0]);
  }
  for (const sym of rare) picked.push([sym, 1]);
  const raw = picked.map(([sym, w]) => w * (0.3 + r() * 1.4) * (RARE.has(sym) ? 0.3 : 1)); // rare elements only ever make up a small share
  const total = raw.reduce((a, b) => a + b, 0);
  // every element gets at least MIN_SHARE so its symbol always fits on the bar
  const MIN_SHARE = 8;
  const shares = raw.map((v) => Math.round((MIN_SHARE + (v / total) * (100 - MIN_SHARE * picked.length)) * 10) / 10);
  shares[0] = Math.round((shares[0] + (100 - shares.reduce((a, b) => a + b, 0))) * 10) / 10; // sum to exactly 100
  const composition = picked
    .map(([symbol], i) => ({ symbol, name: ELEMENTS[symbol as Element].name, pct: shares[i] }))
    .sort((a, b) => b.pct - a.pct);
  return { diameterKm, earths: diameterKm / 12742, composition };
}

/** Rough equilibrium temperature (Kelvin) at `orbitAU` from a star. */
export function equilibriumTempK(star: { radius: number; temp: number }, orbitAU: number) {
  const luminosity = star.radius * star.radius * Math.pow(star.temp / 5772, 4); // solar units
  return 278 * Math.pow(luminosity, 0.25) / Math.sqrt(orbitAU);
}
