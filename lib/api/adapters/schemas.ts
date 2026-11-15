import { z } from "zod";

// Hand-written Zod schemas for the map-related API responses (until Orval output exists).
// Ids are strings in the API; richness and ship counts are keyed by name.
const idSchema = z.string();
const countsSchema = z.record(z.string(), z.number());

export const planetInfoSchema = z.object({
	id: idSchema,
	name: z.string(),
	isObjective: z.boolean(),
	richness: countsSchema,
});

export const systemInfoSchema = z.object({
	id: idSchema,
	name: z.string(),
	x: z.number(),
	y: z.number(),
	z: z.number(),
	planets: z.array(planetInfoSchema),
});

export const galaxyMapSchema = z.object({ systems: z.array(systemInfoSchema) });

export const fleetViewSchema = z.object({
	id: idSchema,
	owner: idSchema.nullable(),
	side: z.enum(["Team", "Enemy"]),
	from: idSchema,
	to: idSchema,
	launchAt: z.number(),
	departAt: z.number(),
	arriveAt: z.number(),
	ships: countsSchema,
	cargo: countsSchema,
});

export const playerViewSchema = z.object({
	version: z.number(),
	gameTime: z.number(),
	timeLeftSeconds: z.number(),
	teamScore: z.number(),
	enemyScore: z.number(),
	stockpile: countsSchema,
	fleets: z.array(fleetViewSchema),
});

export type GalaxyMapDto = z.infer<typeof galaxyMapSchema>;
export type FleetViewDto = z.infer<typeof fleetViewSchema>;
export type PlayerViewDto = z.infer<typeof playerViewSchema>;
export type PlanetInfoDto = z.infer<typeof planetInfoSchema>;
