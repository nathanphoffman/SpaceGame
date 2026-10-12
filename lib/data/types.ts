import type { PlanetKind, RGB } from "../planetGen";

/** Hand-picked appearance for a real body. Anything left out falls back to a seeded random value. */
export type Look = {
  label?: string;          // shown instead of the generic kind name, e.g. "Ice giant"
  low?: RGB;
  high?: RGB;
  ocean?: RGB;
  bands?: RGB[];           // gas giant bands
  atmosphere?: RGB;
  seaLevel?: number;
  bump?: number;
  craters?: number;
  rings?: { inner: number; outer: number; tilt: number; color: RGB }; // inner/outer in planet radii
};

export type BodySpec = {
  id: number;              // planet id = system id * 100 + n
  seed: number;            // drives the look; real bodies use seeds >= SEED_BASE so they never clash with generated ones
  name: string;
  orbit: number;           // AU from its star
  kind: PlanetKind;
  diameterKm: number;
  composition?: string;    // e.g. "Fe30 O28 Si18"; left out = generated from the seed
  look?: Look;
  note: string;            // where the data comes from, shown in the planet panel
  shared?: boolean;        // safe haven: everyone can have a base here
  start?: boolean;         // where a new game begins
};

export type SystemSpec = {
  id: number;
  seed: number;
  name: string;
  spec: string;            // spectral type, e.g. "G2V"
  tempK: number;
  radius: number;          // solar radii
  x: number;               // light-years in the galactic plane, Sol at 0,0
  y: number;
  ly: number;              // distance from Sol
  bodies: BodySpec[];
  complete: boolean;       // true = we know every body, so nothing is generated to fill gaps
};
