import { describe, expect, it } from "vitest";
import { CENTER, GRID, SECTOR_LY, sectorCentre, sectorOf, sectorStarCount, sectorStars, validSector } from "@/lib/sector";
import { mapPositions } from "@/lib/galaxyLayout";
import { flightSeconds, productionRates, buildCost, toRoman, shipSeconds } from "@/lib/defs";
import { fillSystem, planetCount } from "@/lib/systemGen";
import { planetParams, planetStats } from "@/lib/planetGen";

describe("sectors", () => {
  it("puts Sol in the middle of the grid", () => {
    expect(sectorCentre(CENTER, CENTER)).toEqual({ x: 0, y: 0 });
    expect(sectorOf(0, 0)).toEqual([CENTER, CENTER]);
  });

  it("only accepts whole sector numbers inside the grid", () => {
    expect(validSector(0, GRID - 1)).toBe(true);
    expect(validSector(-1, 0)).toBe(false);
    expect(validSector(GRID, 0)).toBe(false);
    expect(validSector(1.5, 2)).toBe(false);
  });

  it("makes the same stars every time, all inside their sector", () => {
    const first = sectorStars(3, 4), second = sectorStars(3, 4);
    expect(first).toEqual(second);
    expect(first).toHaveLength(sectorStarCount(3, 4));
    const centre = sectorCentre(3, 4);

    for (const star of first) {
      expect(Math.abs(star.x - centre.x)).toBeLessThanOrEqual(SECTOR_LY / 2);
      expect(Math.abs(star.y - centre.y)).toBeLessThanOrEqual(SECTOR_LY / 2);
    }
  });
});

describe("local map layout", () => {
  it("keeps every star inside the map and apart from the others", () => {
    const systems = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 0.2, y: 0 }, { id: 3, x: 10, y: -5 }];
    const positions = [...mapPositions(systems, { x: 0, y: 0 }, SECTOR_LY / 2).values()];
    expect(positions).toHaveLength(3);

    for (const point of positions) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(100);
    }

    expect(Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y)).toBeGreaterThan(3);
  });
});

describe("game rules", () => {
  it("takes longer to fly between stars than inside one system", () => {
    const systems = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 4, y: 0 }];
    const inside = flightSeconds({ systemId: 1, orbit: 1 }, { systemId: 1, orbit: 5 }, systems);
    const between = flightSeconds({ systemId: 1, orbit: 1 }, { systemId: 2, orbit: 1 }, systems);
    expect(between).toBeGreaterThan(inside);
  });

  it("always gives a base some iron and silicon income", () => {
    const rates = productionRates({}, []);
    expect(rates.Fe).toBeGreaterThan(0);
    expect(rates.Si).toBeGreaterThan(0);
  });

  it("makes each building level cost more", () => {
    expect(buildCost("shipyard", 3).Fe).toBeGreaterThan(buildCost("shipyard", 2).Fe);
  });

  it("builds ships faster with a better shipyard", () => {
    expect(shipSeconds("cruiser", 5)).toBeLessThan(shipSeconds("cruiser", 0));
  });

  it("writes roman numerals", () => {
    expect([0, 1, 4, 9, 10].map(toRoman)).toEqual(["0", "I", "IV", "IX", "X"]);
  });
});

describe("generated worlds", () => {
  it("gives a planet the same look every time for a seed", () => {
    expect(planetParams(123)).toEqual(planetParams(123));
    expect(planetStats(123)).toEqual(planetStats(123));
  });

  it("fills a system with between 2 and 12 planets, none sharing an orbit", () => {
    const system = { id: 5000, name: "Test", seed: 777, complete: false };
    const planets = fillSystem(system, []);
    expect(planetCount(system.seed)).toBeGreaterThanOrEqual(2);
    expect(planets.length).toBeGreaterThan(0);
    expect(planets.length).toBeLessThanOrEqual(12);
    expect(new Set(planets.map((planet) => planet.orbit)).size).toBe(planets.length);
  });

  it("adds nothing to a system where every planet is already known", () => {
    expect(fillSystem({ id: 1, name: "Sol", seed: 1, complete: true }, [])).toEqual([]);
  });
});
