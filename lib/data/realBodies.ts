import { ELEMENTS, type Element } from "@/lib/defs";
import type { PlanetKind, PlanetParams } from "@/lib/planets/types";
import type { BodySpec } from "@/lib/data/types";

/** on-screen size (game units, ~0.35 .. 1.45) from a real diameter */
export function bodyRadius(kind: PlanetKind, km: number) {
  if (kind === "gas") return Math.min(1.45, Math.max(1.0, 1.0 + (0.45 * (km - 40000)) / 100000));

  return Math.min(1.25, Math.max(0.35, 0.45 + 0.32 * Math.log2(km / 3000)));
}

/** "Fe30 O28 Si18" -> composition list, biggest share first */
export function parseComposition(text: string) {
  return text.split(/\s+/).map((tok) => { // split the composition text like "Fe30 O28" on spaces
    // split a token such as Fe30 into its element letters and its percentage
    const [, symbol, pct] = /^([A-Za-z]+)([\d.]+)$/.exec(tok)!;

    return { symbol, name: ELEMENTS[symbol as Element].name, pct: Number(pct) };
  }).sort((a, b) => b.pct - a.pct);
}

/** Pin a seeded random world to what we know about a real one. Bodies with a `look` are fully specified. */
export function applyLook(params: PlanetParams, body: BodySpec): PlanetParams {
  const radius = body.radius;
  const L = body.look;

  if (!L) return { ...params, radius };

  return {
    ...params,
    radius,
    label: L.label,
    low: L.low ?? params.low,
    high: L.high ?? params.high,
    ocean: L.ocean ?? params.ocean,
    bands: L.bands ?? params.bands,
    atmosphere: L.atmosphere ?? null,
    seaLevel: L.seaLevel ?? -1,
    bump: L.bump ?? params.bump,
    rings: L.rings
      ? { inner: radius * L.rings.inner, outer: radius * L.rings.outer, tilt: L.rings.tilt, color: L.rings.color, seed: params.noiseOffset }
      : null,
  };
}
