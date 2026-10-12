// Deterministic solar system layout: how many planets a system has and where they orbit.
import { mineType } from "./defs";
import { mulberry32, planetName, planetStats } from "./planetGen";

export type GeneratedPlanet = {
  id: number;
  orbit: number; // AU
  /** present only for planets created by the generator (hand-made seed planets are placed, not re-created) */
  fresh?: {
    name: string;
    kind: "npc" | "empty";
    resources: Record<string, number>;
    buildings: Record<string, number>;
    defense: number;
    seed: number;
  };
};

/** 2d6: 2 and 12 are rare (1 in 36 each), 7 is the most common. */
export function planetCount(starSeed: number) {
  const r = mulberry32(starSeed * 977 + 13);
  for (let i = 0; i < 3; i++) r();
  return 2 + Math.floor(r() * 6) + Math.floor(r() * 6); // two d6 (each 0..5, +1 each)
}

/**
 * Lay out a system. `existing` planets keep their identity (id) and are slotted into the orbits;
 * extra planets are generated until the system reaches its 2d6 count.
 */
export function layoutSystem(
  systemId: number,
  starSeed: number,
  existing: { id: number; orbit: number }[],
  safe = false, // true = only neutral planets (the home system)
): GeneratedPlanet[] {
  const n = Math.max(planetCount(starSeed), existing.length);
  const r = mulberry32(starSeed * 4801 + 29);
  for (let i = 0; i < 4; i++) r();

  // orbits spread evenly in log space between 0.3 and 12 AU
  const slots = Array.from({ length: n }, (_, i) => {
    const e = (i + 0.5 + (r() - 0.5) * 0.5) / n;
    return Math.round(0.3 * Math.pow(40, e) * 10) / 10;
  }).sort((a, b) => a - b);

  // choose which slots the generated planets take, existing planets fill the rest in orbit order
  const order = slots.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const fresh = n - existing.length;
  const freshSlots = new Set(order.slice(0, fresh));
  const existingSorted = [...existing].sort((a, b) => a.orbit - b.orbit);

  const out: GeneratedPlanet[] = [];
  let g = 0;
  let e = 0;
  slots.forEach((orbit, i) => {
    if (!freshSlots.has(i)) {
      out.push({ id: existingSorted[e++].id, orbit });
      return;
    }
    g++;
    const seed = 1 + Math.floor(r() * 99999);
    const hostile = !safe && r() < 0.3;
    // hostile bases run mines on their planet's most common elements and sit on a stockpile
    const buildings: Record<string, number> = {};
    const resources: Record<string, number> = {};
    if (hostile) {
      const mines = Math.min(1 + Math.floor(r() * 3), planetStats(seed).composition.length);
      for (const { symbol } of planetStats(seed).composition.slice(0, mines)) {
        const level = 1 + Math.floor(r() * 6);
        buildings[mineType(symbol)] = level;
        resources[symbol] = 300 * level;
      }
    }
    out.push({
      id: systemId * 100 + g,
      orbit,
      fresh: {
        name: planetName(seed),
        kind: hostile ? "npc" : "empty",
        resources,
        buildings,
        defense: hostile ? Math.round(10 + r() * r() * 400) : 0,
        seed,
      },
    });
  });
  return out;
}
