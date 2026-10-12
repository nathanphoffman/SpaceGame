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
  const r = mulberry32(seed * 7919 + 17);
  const range = (a: number, b: number) => a + (b - a) * r();
  const jitter = (c: RGB, amt = 0.08): RGB => c.map((v) => Math.min(1, Math.max(0, v + (r() - 0.5) * amt * 2))) as RGB;

  const roll = r();
  const kind: PlanetKind = roll < 0.25 ? "rocky" : roll < 0.5 ? "moon" : roll < 0.7 ? "gas" : roll < 0.85 ? "ice" : "desert";

  const radius = {
    moon: range(0.45, 0.8), rocky: range(0.7, 1.15), desert: range(0.7, 1.1), ice: range(0.65, 1.1), gas: range(1.1, 1.45),
  }[kind];
  const bumpMax = { moon: 0.08, rocky: 0.13, desert: 0.12, ice: 0.06, gas: 0 }[kind];
  const bump = bumpMax * Math.pow(r(), 0.8);
  const craterMax = { moon: 80, rocky: 20, desert: 30, ice: 25, gas: 0 }[kind];
  const craterCount = Math.floor(craterMax * Math.pow(r(), 1.2));

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

  return {
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
}

export function describePlanet(p: PlanetParams) {
  const type = { rocky: "Rocky world", moon: "Moon", gas: "Gas giant", ice: "Ice world", desert: "Desert world" }[p.kind];
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

export type StarParams = { label: string; color: RGB; size: number };

const STAR_TYPES: StarParams[] = [
  { label: "Red dwarf", color: [1, 0.45, 0.3], size: 0.7 },
  { label: "Orange dwarf", color: [1, 0.65, 0.3], size: 0.85 },
  { label: "Yellow dwarf", color: [1, 0.9, 0.5], size: 1 },
  { label: "White star", color: [0.95, 0.97, 1], size: 1.15 },
  { label: "Blue giant", color: [0.55, 0.7, 1], size: 1.5 },
];

export function starParams(seed: number): StarParams {
  const r = mulberry32(seed * 31 + 7);
  for (let i = 0; i < 3; i++) r();
  const t = STAR_TYPES[Math.floor(r() * STAR_TYPES.length)];
  return { ...t, size: t.size * (0.9 + r() * 0.2) };
}

const GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Sigma", "Tau", "Omega", "Kappa"];

/** e.g. "Sigma Krovan" */
export function starName(seed: number) {
  const r = mulberry32(seed * 15485863 + 11);
  return `${GREEK[Math.floor(r() * GREEK.length)]} ${planetName(seed + 5000).split(" ")[0]}`;
}
