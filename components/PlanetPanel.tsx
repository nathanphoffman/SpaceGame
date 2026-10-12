import PlanetView from "@/components/PlanetView";
import { describePlanet, equilibriumTempK, planetParams, planetStats, starParams } from "@/lib/planetGen";
import type { FleetDTO, PlanetDTO } from "@/lib/defs";
import { ShipList, elementColor } from "./ui";

type Props = { planet: PlanetDTO; systemSeed: number; guards: FleetDTO[] };

/** details and 3D view of the planet currently selected */
export default function PlanetPanel({ planet, systemSeed, guards }: Props) {
  const info = describePlanet(planetParams(planet.seed));
  const stats = planetStats(planet.seed);
  return (
    <div className="panel">
      <h2>{planet.name}</h2>
      <div className="composition">
        <div className="elbar">
          {stats.composition.map((e) => (
            <div key={e.symbol} className="elseg" style={{ flexGrow: e.pct, background: elementColor(e.symbol) }} title={`${e.name} (${e.symbol}) ${e.pct}%`}>
              {e.symbol}
            </div>
          ))}
        </div>
      </div>
      <PlanetView seed={planet.seed} />
      <div className="planet-info">
        <div><b>{info.type}</b> · {info.size} · {info.surface}</div>
        <div className="dim">
          {info.craters > 0 ? `${info.craters} craters` : "No craters"} · {info.rings ? "Rings" : "No rings"} · {info.atmosphere ? "Atmosphere" : "No atmosphere"}
        </div>
        <div className="dim">
          {planet.kind === "player" ? "Your planet" : planet.kind === "npc" ? `Enemy · defense ${planet.defense}` : "Unclaimed"} · seed {planet.seed}
        </div>
        <div className="stats">
          <div><span className="dim">Diameter</span> <b>{stats.diameterKm.toLocaleString()} km</b> <span className="dim">({stats.earths.toFixed(2)} × Earth)</span></div>
          <div><span className="dim">Orbit</span> <b>{planet.orbit.toFixed(1)} AU</b> <span className="dim">· ~{Math.round(equilibriumTempK(starParams(systemSeed), planet.orbit) - 273.15)} °C</span></div>
        </div>
        {guards.map((f) => (
          <div key={f.id} className="good">Guarded by your fleet: <ShipList ships={f.ships} /></div>
        ))}
      </div>
    </div>
  );
}
