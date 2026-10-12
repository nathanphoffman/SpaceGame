import type { PlanetKind } from "../planetGen";
import type { Look } from "./types";

const note = "Solar System";
const D = (name: string, orbit: number, kind: PlanetKind, diameterKm: number, composition: string, look: Look, extra: { shared?: boolean; start?: boolean } = {}) =>
  ({ name, orbit, kind, diameterKm, composition, look, note, ...extra });

// Composition is mapped onto the game's nine elements (see ELEMENTS in defs.ts), so it is a gameplay
// approximation: e.g. Earth has some Titanium and Uranium so a new base can reach every ship.
// Moons sit a hair outside their planet's orbit so they sort right after it on the solar map.
export const SOL_BODIES = [
  D("Mercury", 0.387, "moon", 4879, "Fe60 Si20 O10 Al6 Ti4",
    { label: "Barren world", low: [0.32, 0.3, 0.28], high: [0.62, 0.58, 0.53], craters: 60, bump: 0.05 }),
  D("Venus", 0.723, "desert", 12104, "O40 Fe25 Si20 Al8 C4 Ti3",
    { label: "Hothouse world", low: [0.75, 0.55, 0.25], high: [0.92, 0.8, 0.5], atmosphere: [1, 0.85, 0.5], craters: 0, bump: 0.04 }),
  D("Earth", 1.0, "rocky", 12742, "Fe30 O28 Si18 Al9 Ti6 C5 U4",
    { low: [0.2, 0.5, 0.22], high: [0.5, 0.42, 0.33], ocean: [0.08, 0.25, 0.55], seaLevel: 0.52, atmosphere: [0.4, 0.65, 1], craters: 0, bump: 0.07 },
    { shared: true, start: true }),
  D("Moon", 1.003, "moon", 3474, "O40 Si20 Fe12 Al12 Ti8 He8",
    { label: "Moon", low: [0.36, 0.36, 0.37], high: [0.72, 0.71, 0.68], craters: 70 }),
  D("Mars", 1.524, "desert", 6779, "O32 Fe30 Si20 Al8 C5 Ti5",
    { low: [0.5, 0.24, 0.12], high: [0.85, 0.52, 0.3], atmosphere: [0.9, 0.6, 0.45], craters: 18, bump: 0.1 }),
  D("Ceres", 2.77, "moon", 940, "O30 H20 C15 Si15 Fe12 Al8",
    { label: "Dwarf planet", low: [0.28, 0.28, 0.29], high: [0.5, 0.49, 0.47], craters: 40 }),
  D("Jupiter", 5.204, "gas", 139820, "H82 He12 C3 O3",
    { bands: [[0.78, 0.6, 0.42], [0.93, 0.86, 0.72], [0.6, 0.4, 0.3], [0.85, 0.7, 0.55]], atmosphere: [0.9, 0.8, 0.6] }),
  D("Io", 5.206, "desert", 3643, "Si35 O30 Fe25 Al10",
    { label: "Volcanic moon", low: [0.75, 0.65, 0.25], high: [0.95, 0.9, 0.55], craters: 0, bump: 0.06 }),
  D("Europa", 5.207, "ice", 3122, "H35 O35 Si15 Fe10 C5",
    { label: "Ice moon", low: [0.8, 0.75, 0.65], high: [0.97, 0.96, 0.94], craters: 8, bump: 0.02 }),
  D("Ganymede", 5.208, "moon", 5268, "H30 O30 Si20 Fe15 C5",
    { label: "Icy moon", low: [0.38, 0.35, 0.32], high: [0.7, 0.68, 0.64], craters: 50 }),
  D("Callisto", 5.209, "moon", 4821, "H28 O28 Si20 C12 Fe12",
    { label: "Icy moon", low: [0.28, 0.25, 0.22], high: [0.55, 0.5, 0.45], craters: 80 }),
  D("Saturn", 9.58, "gas", 116460, "H85 He9 C3 O3",
    { bands: [[0.85, 0.75, 0.5], [0.95, 0.88, 0.7], [0.7, 0.6, 0.42], [0.9, 0.8, 0.6]], atmosphere: [0.9, 0.8, 0.6],
      rings: { inner: 1.3, outer: 2.2, tilt: 0.2, color: [0.8, 0.74, 0.62] } }),
  D("Titan", 9.582, "desert", 5150, "H30 C25 O25 Si12 Fe8",
    { label: "Moon", low: [0.55, 0.38, 0.12], high: [0.85, 0.62, 0.25], atmosphere: [0.95, 0.6, 0.2], craters: 0, bump: 0.02 }),
  D("Uranus", 19.2, "gas", 50724, "H55 O20 C15 He10",
    { label: "Ice giant", bands: [[0.6, 0.82, 0.85], [0.7, 0.9, 0.92], [0.55, 0.78, 0.82], [0.65, 0.85, 0.88]], atmosphere: [0.6, 0.85, 0.9] }),
  D("Neptune", 30.07, "gas", 49244, "H52 O22 C16 He10",
    { label: "Ice giant", bands: [[0.2, 0.35, 0.8], [0.3, 0.5, 0.9], [0.15, 0.28, 0.7], [0.28, 0.45, 0.85]], atmosphere: [0.3, 0.5, 0.95] }),
  D("Triton", 30.072, "ice", 2707, "H30 O30 C20 Si12 Fe8",
    { label: "Ice moon", low: [0.75, 0.7, 0.7], high: [0.95, 0.9, 0.88], craters: 4, bump: 0.03 }),
  D("Pluto", 39.5, "ice", 2377, "H35 O25 C20 Si12 Fe8",
    { label: "Dwarf planet", low: [0.55, 0.42, 0.33], high: [0.9, 0.82, 0.72], craters: 10, bump: 0.05 }),
];
