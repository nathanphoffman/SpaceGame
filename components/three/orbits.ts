import * as THREE from "three";
import type { PlanetDTO } from "@/lib/defs";

// Distances are compressed so Mercury and Neptune both fit on screen; orbit order stays real.
const INNER_GAP = 3;
const DISTANCE_PER_SQRT_AU = 9;
const MIN_PERIOD_SECONDS = 14;
const PERIOD_SECONDS_PER_AU = 45;
const PERIOD_EXPONENT = 0.75;
const PHASE_HASH = 2654435761;
const PHASE_STEPS = 1000;

/** compressed distance from the star in scene units */
const sceneDistance = (orbitAU: number) => INNER_GAP + DISTANCE_PER_SQRT_AU * Math.sqrt(orbitAU);

/** seconds for one lap; not real physics, just slow for far planets */
const periodSeconds = (orbitAU: number) => Math.max(MIN_PERIOD_SECONDS, PERIOD_SECONDS_PER_AU * Math.pow(orbitAU, PERIOD_EXPONENT));

/** each planet starts at a different, fixed point on its orbit */
const startPhase = (seed: number) => (((seed * PHASE_HASH) % PHASE_STEPS) / PHASE_STEPS) * Math.PI * 2;

// the farthest planet decides how big the system is on screen
export const systemRadius = (planets: PlanetDTO[]) => Math.max(0, ...planets.map((p) => sceneDistance(p.orbit)));

/** where a planet is at the given server time (ms) */
export function planetPosition(planet: PlanetDTO, nowMs: number, out: THREE.Vector3) {
  const angle = startPhase(planet.seed) - (nowMs / 1000 / periodSeconds(planet.orbit)) * Math.PI * 2;
  const distance = sceneDistance(planet.orbit);

  return out.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
}

/** the circle a planet travels along */
export function orbitRing(orbitAU: number, segments: number) {
  const distance = sceneDistance(orbitAU);
  const points = Array.from({ length: segments + 1 }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;

    return new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
  });

  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x3b4a70, transparent: true, opacity: 0.6 }));
}
