import type { Look } from "@/lib/data/types";
import type { PlanetKind } from "@/lib/planets/types";

const note = "Solar System";

type SolBodyOptions = {
	name: string;
	orbit: number;
	kind: PlanetKind;
	diameterKm: number;
	composition: string;
	look: Look;
	shared?: boolean;
	start?: boolean;
};

const solBody = (options: SolBodyOptions) => ({ ...options, note });

// Composition is mapped onto the game's nine elements (see ELEMENTS in defs.ts), so it is a gameplay
// approximation: e.g. Earth has some Titanium and Uranium so a new base can reach every ship.
export const SOL_BODIES = [
	solBody({
		name: "Mercury",
		orbit: 0.387,
		kind: "moon",
		diameterKm: 4879,
		composition: "Fe60 Si20 O10 Al6 Ti4",
		look: {
			label: "Barren world",
			low: [0.32, 0.3, 0.28],
			high: [0.62, 0.58, 0.53],
			craters: 60,
			bump: 0.05,
		},
	}),
	solBody({
		name: "Venus",
		orbit: 0.723,
		kind: "desert",
		diameterKm: 12104,
		composition: "O40 Fe25 Si20 Al8 C4 Ti3",
		look: {
			label: "Hothouse world",
			low: [0.75, 0.55, 0.25],
			high: [0.92, 0.8, 0.5],
			atmosphere: [1, 0.85, 0.5],
			craters: 0,
			bump: 0.04,
		},
	}),
	solBody({
		name: "Earth",
		orbit: 1.0,
		kind: "rocky",
		diameterKm: 12742,
		composition: "Fe30 O28 Si18 Al9 Ti6 C5 U4",
		shared: true,
		start: true,
		look: {
			low: [0.2, 0.5, 0.22],
			high: [0.5, 0.42, 0.33],
			ocean: [0.08, 0.25, 0.55],
			seaLevel: 0.52,
			atmosphere: [0.4, 0.65, 1],
			craters: 0,
			bump: 0.07,
		},
	}),
	solBody({
		name: "Mars",
		orbit: 1.524,
		kind: "desert",
		diameterKm: 6779,
		composition: "O32 Fe30 Si20 Al8 C5 Ti5",
		look: {
			low: [0.5, 0.24, 0.12],
			high: [0.85, 0.52, 0.3],
			atmosphere: [0.9, 0.6, 0.45],
			craters: 18,
			bump: 0.1,
		},
	}),
	solBody({
		name: "Jupiter",
		orbit: 5.204,
		kind: "gas",
		diameterKm: 139820,
		composition: "H82 He12 C3 O3",
		look: {
			bands: [
				[0.78, 0.6, 0.42],
				[0.93, 0.86, 0.72],
				[0.6, 0.4, 0.3],
				[0.85, 0.7, 0.55],
			],
			atmosphere: [0.9, 0.8, 0.6],
		},
	}),
	solBody({
		name: "Saturn",
		orbit: 9.58,
		kind: "gas",
		diameterKm: 116460,
		composition: "H85 He9 C3 O3",
		look: {
			bands: [
				[0.85, 0.75, 0.5],
				[0.95, 0.88, 0.7],
				[0.7, 0.6, 0.42],
				[0.9, 0.8, 0.6],
			],
			atmosphere: [0.9, 0.8, 0.6],
			rings: { inner: 1.3, outer: 2.2, tilt: 0.2, color: [0.8, 0.74, 0.62] },
		},
	}),
	solBody({
		name: "Uranus",
		orbit: 19.2,
		kind: "gas",
		diameterKm: 50724,
		composition: "H55 O20 C15 He10",
		look: {
			label: "Ice giant",
			bands: [
				[0.6, 0.82, 0.85],
				[0.7, 0.9, 0.92],
				[0.55, 0.78, 0.82],
				[0.65, 0.85, 0.88],
			],
			atmosphere: [0.6, 0.85, 0.9],
		},
	}),
	solBody({
		name: "Neptune",
		orbit: 30.07,
		kind: "gas",
		diameterKm: 49244,
		composition: "H52 O22 C16 He10",
		look: {
			label: "Ice giant",
			bands: [
				[0.2, 0.35, 0.8],
				[0.3, 0.5, 0.9],
				[0.15, 0.28, 0.7],
				[0.28, 0.45, 0.85],
			],
			atmosphere: [0.3, 0.5, 0.95],
		},
	}),
	solBody({
		name: "Pluto",
		orbit: 39.5,
		kind: "ice",
		diameterKm: 2377,
		composition: "H35 O25 C20 Si12 Fe8",
		look: {
			label: "Dwarf planet",
			low: [0.55, 0.42, 0.33],
			high: [0.9, 0.82, 0.72],
			craters: 10,
			bump: 0.05,
		},
	}),
];
