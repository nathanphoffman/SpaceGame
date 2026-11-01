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

export type StarParams = {
  spectral: string;   // e.g. "G2V"
  label: string;      // e.g. "Yellow dwarf"
  temp: number;       // surface temperature in K
  radius: number;     // in solar radii
  color: RGB;         // 0..1, the colour the star appears in a dark sky
  size: number;       // display scale, ~0.5 (white dwarf) .. ~1.8 (supergiant)
  bright: number;     // 0..1, how much glare/spikes to draw
};

export type PlanetStats = {
  diameterKm: number;
  earths: number; // diameter relative to Earth
  composition: { symbol: string; name: string; pct: number }[]; // sorted, sums to 100
};
