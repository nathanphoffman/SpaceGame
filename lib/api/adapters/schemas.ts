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

export const queueItemSchema = z.object({
	id: z.string(),
	building: z.string().nullable().optional(),
	element: z.string().nullable().optional(),
	ship: z.string().nullable().optional(),
	level: z.number(),
	startAt: z.number(),
	finishAt: z.number(),
	cost: countsSchema,
});

export const holdingSchema = z.object({
	planet: idSchema,
	mines: countsSchema.default({}),
	hasShipyard: z.boolean().default(false),
	hasDefense: z.boolean().default(false),
	ships: countsSchema.default({}),
	queue: z.array(queueItemSchema).default([]),
});

export const contributionSchema = z.object({
	player: z.string(),
	points: z.number().default(0),
	battlesWon: z.number().default(0),
	planetsCaptured: z.number().default(0),
});

/** Set once the game is over. The contract does not fix the shape yet, so every field is forgiving. */
export const outcomeSchema = z.object({
	winner: z.string(),
	reason: z.string().default(""),
	teamScore: z.number().optional(),
	enemyScore: z.number().optional(),
	contributions: z.array(contributionSchema).default([]),
});

export const playerViewSchema = z.object({
	version: z.number(),
	gameTime: z.number(),
	timeLeftSeconds: z.number(),
	teamScore: z.number(),
	enemyScore: z.number(),
	stockpile: countsSchema,
	/** Upgrade levels by name; the server may not send them yet. */
	upgrades: countsSchema.default({}),
	fleets: z.array(fleetViewSchema),
	holdings: z.array(holdingSchema).default([]),
	outcome: outcomeSchema.nullable().optional(),
});

export type GalaxyMapDto = z.infer<typeof galaxyMapSchema>;
export type FleetViewDto = z.infer<typeof fleetViewSchema>;
export type PlayerViewDto = z.infer<typeof playerViewSchema>;
export type PlanetInfoDto = z.infer<typeof planetInfoSchema>;
export type HoldingDto = z.infer<typeof holdingSchema>;
export type QueueItemDto = z.infer<typeof queueItemSchema>;
export type OutcomeDto = z.infer<typeof outcomeSchema>;
