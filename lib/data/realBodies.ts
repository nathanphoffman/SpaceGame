import { ELEMENTS, type Element } from "../defs";
import type { PlanetKind, PlanetParams } from "../planetGen";
import type { BodySpec } from "./types";

/** on-screen size (game units, ~0.35 .. 1.45) from a real diameter */
export function bodyRadius(kind: PlanetKind, km: number) {
  if (kind === "gas") return Math.min(1.45, Math.max(1.0, 1.0 + (0.45 * (km - 40000)) / 100000));
  return Math.min(1.25, Math.max(0.35, 0.45 + 0.32 * Math.log2(km / 3000)));
}

/** "Fe30 O28 Si18" -> composition list, biggest share first */
export function parseComposition(text: string) {
  return text.split(/\s+/).map((tok) => {
    const [, symbol, pct] = /^([A-Za-z]+)([\d.]+)$/.exec(tok)!;
    return { symbol, name: ELEMENTS[symbol as Element].name, pct: Number(pct) };
  }).sort((a, b) => b.pct - a.pct);
}

/** Pin a seeded random world to what we know about a real one. Bodies with a `look` are fully specified. */
export function applyLook(p: PlanetParams, b: BodySpec): PlanetParams {
  const radius = bodyRadius(b.kind, b.diameterKm);
  const L = b.look;
  if (!L) return { ...p, radius };
  return {
    ...p,
    radius,
    label: L.label,
    low: L.low ?? p.low,
    high: L.high ?? p.high,
    ocean: L.ocean ?? p.ocean,
    bands: L.bands ?? p.bands,
    atmosphere: L.atmosphere ?? null,
    seaLevel: L.seaLevel ?? -1,
    bump: L.bump ?? p.bump,
    rings: L.rings
      ? { inner: radius * L.rings.inner, outer: radius * L.rings.outer, tilt: L.rings.tilt, color: L.rings.color, seed: p.noiseOffset }
      : null,
  };
}
