// Fills the gaps in a star system: planets we haven't discovered yet are generated, deterministically.
import { mineType } from "./defs";
import { mulberry32, planetName, planetStats, starParams } from "./planetGen";

export type Filler = {
  id: number;
  name: string;
  orbit: number; // AU
  kind: "npc" | "empty";
  resources: Record<string, number>;
  buildings: Record<string, number>;
  defense: number;
  seed: number;
};

/** 2d6: 2 and 12 are rare (1 in 36 each), 7 is the most common. */
export function planetCount(starSeed: number) {
  const r = mulberry32(starSeed * 977 + 13);
  for (let i = 0; i < 3; i++) r();
  return 2 + Math.floor(r() * 6) + Math.floor(r() * 6); // two d6 (each 0..5, +1 each)
}

/**
 * Generate the planets we don't know about. A system gets 2d6 planets in total, so a star with
 * several confirmed planets gets few extras. `known` are the real orbits, which stay where they are.
 */
export function fillSystem(sys: { id: number; name: string; seed: number; complete: boolean }, known: { orbit: number; id: number }[]): Filler[] {
  if (sys.complete) return [];
  const want = Math.max(0, planetCount(sys.seed) - known.length);
  const r = mulberry32(sys.seed * 4801 + 29);
  for (let i = 0; i < 4; i++) r();

  // dim stars have their zone of orbits closer in: scale the orbit range with the star's brightness
  const star = starParams(sys.seed);
  const lum = star.radius * star.radius * Math.pow(star.temp / 5772, 4);
  const scale = Math.min(3, Math.max(0.15, Math.sqrt(lum)));
  const taken = known.map((k) => k.orbit);

  const out: Filler[] = [];
  for (let i = 0; i < want; i++) {
    const e = (i + 0.5 + (r() - 0.5) * 0.5) / want;
    let orbit = 0.3 * scale * Math.pow(40, e);
    for (let tries = 0; tries < 3 && taken.some((t) => orbit / t < 1.35 && t / orbit < 1.35); tries++) orbit *= 1.5;
    if (taken.some((t) => orbit / t < 1.35 && t / orbit < 1.35)) continue; // no room left here
    orbit = Math.round(orbit * 1000) / 1000;
    taken.push(orbit);

    const seed = 1 + Math.floor(r() * 99999);
    const hostile = r() < 0.3;
    // hostile bases run mines on their planet's most common elements and sit on a stockpile
    const buildings: Record<string, number> = {};
    const resources: Record<string, number> = {};
    if (hostile) {
      const comp = planetStats(seed).composition;
      for (const { symbol } of comp.slice(0, Math.min(1 + Math.floor(r() * 3), comp.length))) {
        const level = 1 + Math.floor(r() * 6);
        buildings[mineType(symbol)] = level;
        resources[symbol] = 300 * level;
      }
    }
    const n = known.length + out.length + 1;
    out.push({
      id: sys.id * 100 + n,
      name: n < 26 ? `${sys.name} ${String.fromCharCode(97 + n)}` : planetName(seed),
      orbit, kind: hostile ? "npc" : "empty", resources, buildings,
      defense: hostile ? Math.round(10 + r() * r() * 400) : 0,
      seed,
    });
  }
  return out;
}
