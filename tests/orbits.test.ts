import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { PlanetDTO } from "@/lib/defs";
import { planetPosition, systemRadius } from "@/components/three/orbits";
import { flightOf, flyingFleets, isCrossSystem } from "@/lib/flight";
import type { FleetDTO, GameState } from "@/lib/defs";

const planet = (id: number, orbit: number, systemId = 1): PlanetDTO => ({
  id, name: `P${id}`, systemId, orbit, kind: "empty", resources: {}, buildings: {}, ships: {}, defense: 0, seed: id * 1000, shared: false,
});

describe("3D orbits", () => {
  it("keeps a planet at the same distance from the star as it moves", () => {
    const earth = planet(1, 1);
    const early = planetPosition(earth, 0, new THREE.Vector3());
    const later = planetPosition(earth, 25_000, new THREE.Vector3());
    expect(early.length()).toBeCloseTo(later.length(), 5);
    expect(early.distanceTo(later)).toBeGreaterThan(0);
  });

  it("keeps outer planets further out", () => {
    const near = planetPosition(planet(1, 0.4), 0, new THREE.Vector3()).length();
    const far = planetPosition(planet(2, 30), 0, new THREE.Vector3()).length();
    expect(far).toBeGreaterThan(near);
  });

  it("sizes the system by its outermost planet", () => {
    expect(systemRadius([planet(1, 1), planet(2, 30)])).toBeGreaterThan(systemRadius([planet(1, 1)]));
    expect(systemRadius([])).toBe(0);
  });
});

describe("fleet flights", () => {
  const game = {
    now: 0, systems: [], queue: [],
    planets: [planet(1, 1, 1), planet(2, 5, 1), planet(3, 1, 2)],
    fleets: [] as FleetDTO[],
  } as GameState;

  const fleet = (over: Partial<FleetDTO>): FleetDTO => ({ id: "f", originId: 1, targetId: 2, mission: "attack", ships: {}, loot: {}, departAt: 0, arriveAt: 100, returnAt: 200, status: "outbound", report: "", ...over });

  it("reports how far along a flight is", () => {
    expect(flightOf(game, fleet({}), 50).k).toBe(0.5);
    expect(flightOf(game, fleet({}), 500).k).toBe(1);
  });

  it("flies back from the target when returning", () => {
    const back = flightOf(game, fleet({ status: "returning" }), 150);
    expect(back.from.id).toBe(2);
    expect(back.k).toBe(0.5);
  });

  it("tells flights between stars from flights inside one", () => {
    expect(isCrossSystem(game, fleet({}))).toBe(false);
    expect(isCrossSystem(game, fleet({ targetId: 3 }))).toBe(true);
  });

  it("only counts fleets that are in the air", () => {
    const all = { ...game, fleets: [fleet({}), fleet({ id: "g", status: "stationed" }), fleet({ id: "h", status: "done" })] };
    expect(flyingFleets(all).map((f) => f.id)).toEqual(["f"]);
  });
});
