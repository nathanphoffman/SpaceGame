import PlanetView from "@/components/planet/PlanetView";
import { describePlanet } from "@/lib/planets/names";
import { equilibriumTempK, planetStats } from "@/lib/planets/planetStats";
import { planetParams } from "@/lib/planets/planetParams";
import { starParams } from "@/lib/planets/starParams";
import { type FleetDTO, type PlanetDTO, PLANET_KIND } from "@/lib/defs";
import { bodyNote } from "@/lib/data/catalog";
import { ShipList, elementColor, fmtAU } from "@/components/ui";

type Props = { planet: PlanetDTO; systemSeed: number; guards: FleetDTO[] };

const KELVIN_AT_ZERO_CELSIUS = 273.15;

/** who the planet belongs to */
function ownerText(planet: PlanetDTO) {
  if (planet.kind === PLANET_KIND.player) return "Your planet";

  return planet.kind === PLANET_KIND.npc ? `Enemy · defense ${planet.defense}` : "Unclaimed";
}

/** a bar split by element, each segment as wide as that element's share */
function CompositionBar({ composition }: { composition: { symbol: string; name: string; pct: number }[] }) {
  return (
    <div className="composition">
      <div className="elbar">
        {composition.map((part) => (
          <div key={part.symbol} className="elseg" style={{ flexGrow: part.pct, background: elementColor(part.symbol) }} title={`${part.name} (${part.symbol}) ${part.pct}%`}>
            {part.symbol}
          </div>
        ))}

      </div>
    </div>
  );
}

/** details and 3D view of the planet currently selected */
export default function PlanetPanel({ planet, systemSeed, guards }: Props) {
  const info = describePlanet(planetParams(planet.seed));
  const stats = planetStats(planet.seed);
  const celsius = Math.round(equilibriumTempK(starParams(systemSeed), planet.orbit) - KELVIN_AT_ZERO_CELSIUS);

  return (
    <div className="panel">
      <h2>{planet.name}</h2>
      <CompositionBar composition={stats.composition} />
      <PlanetView seed={planet.seed} />
      <div className="planet-info">
        <div><b>{info.type}</b> · {info.size} · {info.surface}</div>
        <div className="dim">
          {info.craters > 0 ? `${info.craters} craters` : "No craters"} · {info.rings ? "Rings" : "No rings"} · {info.atmosphere ? "Atmosphere" : "No atmosphere"}
        </div>
        <div className="dim">{ownerText(planet)} · seed {planet.seed}</div>
        <div className="dim">{bodyNote(planet.seed)}</div>
        {planet.shared && <div className="good">Safe haven · everyone can have a base here, and it can never be attacked</div>}
        <div className="stats">
          <div><span className="dim">Diameter</span> <b>{stats.diameterKm.toLocaleString()} km</b> <span className="dim">({stats.earths.toFixed(2)} × Earth)</span></div>
          <div><span className="dim">Orbit</span> <b>{fmtAU(planet.orbit)}</b> <span className="dim">· ~{celsius} °C</span></div>
        </div>
        {guards.map((fleet) => <div key={fleet.id} className="good">Guarded by your fleet: <ShipList ships={fleet.ships} /></div>)} {/* one line per fleet guarding this planet */}
      </div>
    </div>
  );
}
