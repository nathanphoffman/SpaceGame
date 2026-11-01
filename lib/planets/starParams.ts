import { STAR_BY_SEED } from "@/lib/data/catalog";
import { mulberry32 } from "./noise";
import type { RGB, StarParams } from "./types";

// Real stellar classification (Morgan-Keenan): spectral class O B A F G K M from hot to cool,
// a 0-9 subtype, and a luminosity class (V main sequence, III giant, I supergiant, D white dwarf).

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

const SEED_MULTIPLIER = 31;
const SEED_OFFSET = 7;
const WARM_UP_DRAWS = 3;
const SUBTYPES = 10;
const SUBTYPE_BLEND = 0.6; // how far a star's colour moves toward the next (cooler) class at subtype 9
const SUN_TEMP_K = 5772;
const WHITE_DWARF = { radius: 0.012, color: [0.82, 0.88, 1] as RGB, size: 0.5, bright: 0.35 };

const mixColors = (first: RGB, second: RGB, t: number): RGB => [first[0] + (second[0] - first[0]) * t, first[1] + (second[1] - first[1]) * t, first[2] + (second[2] - first[2]) * t];

/** display size and glare from radius (solar radii) and temperature (K); luminosity ~ R^2 T^4 */
function starLook(radius: number, temp: number) {
  const size = Math.min(1.8, Math.max(0.5, 0.6 + 0.35 * Math.log10(radius / 0.1)));
  const luminosity = radius * radius * Math.pow(temp / SUN_TEMP_K, 4);
  const bright = Math.min(1, Math.max(0.2, 0.35 + 0.12 * Math.log10(Math.max(luminosity, 1e-3)) + 0.2));

  return { size, bright };
}

/** the class colour blended toward the next (cooler) class by subtype */
function classColor(cls: string, sub: number): RGB {
  const next = CLASS_ORDER[Math.min(CLASS_ORDER.indexOf(cls) + 1, CLASS_ORDER.length - 1)];

  return mixColors(CLASS_COLOR[cls], CLASS_COLOR[next], (sub / SUBTYPES) * SUBTYPE_BLEND);
}

/** giants are named by colour, everything else by its class */
function starLabel(kind: StarKind, cls: string) {
  if (kind.lum === "I") return cls === "M" ? "Red supergiant" : "Blue supergiant";

  if (kind.lum === "III") return cls === "M" ? "Red giant" : "Orange giant";

  return CLASS_LABEL[cls];
}

/** radius in solar radii: main-sequence stars follow their class, giants are much bigger */
function starRadius(kind: StarKind, cls: string, sub: number, jitter: number) {
  const [, , rHot, rCool] = CLASS_DATA[cls];

  if (kind.lum === "III") return 12 + jitter * 40 + (cls === "M" ? 20 : 0);

  if (kind.lum === "I") return cls === "M" ? 250 + jitter * 600 : 30 + jitter * 60;

  return rHot + (rCool - rHot) * (sub / 9);
}

export function starParams(seed: number): StarParams {
  const real = STAR_BY_SEED.get(seed);

  if (real) {
    const cls = real.spec[0], sub = Number(real.spec[1]);

    return { spectral: real.spec, label: CLASS_LABEL[cls], temp: real.tempK, radius: real.radius, color: classColor(cls, sub), ...starLook(real.radius, real.tempK) };
  }

  const random = mulberry32(seed * SEED_MULTIPLIER + SEED_OFFSET);

  for (let draw = 0; draw < WARM_UP_DRAWS; draw++) random();

  // add up the weights of every star kind, so one random roll can be mapped onto them
  let roll = random() * STAR_KINDS.reduce((total, candidate) => total + candidate.weight, 0);
  const kind = STAR_KINDS.find((candidate) => (roll -= candidate.weight) < 0) ?? STAR_KINDS[0];
  const cls = kind.classes[Math.floor(random() * kind.classes.length)];
  const sub = Math.floor(random() * SUBTYPES);
  const jitter = random();

  if (kind.lum === "D") { // white dwarf: hot, tiny, bluish-white
    const temp = Math.round(8000 + jitter * 25000);
    const index = Math.min(9, Math.max(1, Math.round(50400 / temp))); // DA temperature index = 50400 / T

    return { spectral: `DA${index}`, label: "White dwarf", temp, ...WHITE_DWARF };
  }

  const [hot, cool] = CLASS_DATA[cls];
  const temp = Math.round(hot + (cool - hot) * (sub / 9));
  const radius = starRadius(kind, cls, sub, jitter);

  return { spectral: `${cls}${sub}${kind.lum}`, label: starLabel(kind, cls), temp, radius, color: classColor(cls, sub), ...starLook(radius, temp) };
}
