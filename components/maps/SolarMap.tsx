import { planetThumb, thumbDisplaySize } from "@/components/planet/planetThumb";
import { planetParams } from "@/lib/planets/planetParams";
import { starParams } from "@/lib/planets/starParams";
import { SHIPS, type FleetDTO, type GameState, type PlanetDTO, type SystemDTO } from "@/lib/defs";
import { flightOf, flyingFleets, isCrossSystem } from "@/lib/galaxy/flight";
import { fleetIcon, fmtAU } from "@/components/ui";

const SOLAR_Y = 42; // % down the map where the planets sit
const AXIS_Y = 84;
const STAR_VISIBLE = 26; // px of the star poking into the map
const SLOT_LEFT = 12; // % from the left edge where the first planet slot starts
const SLOT_SPAN = 86; // % of the width shared by all planet slots
const MAP_WIDTH_PX = 544; // usual drawn width of the map, used to size planets
const MIN_PLANET_PX = 8;
const MAX_RADIUS = 1.45; // largest planet radius the generator makes
const CROWDED_PLANETS = 8;
const AU_STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
const MAX_TICKS = 6;

type System = { game: GameState; system: SystemDTO; viewed: PlanetDTO };

/** the ruler: nice round AU steps up to the outermost planet, and where each AU lands across the map */
function rulerScale(planets: PlanetDTO[]) {
  const maxOrbit = Math.max(0.01, ...planets.map((planet) => planet.orbit));
  const step = AU_STEPS.find((candidate) => maxOrbit / candidate <= MAX_TICKS) ?? 50;
  const max = Math.ceil(maxOrbit / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => Math.round(index * step * 1000) / 1000);

  return { max, ticks, axisX: (au: number) => 6 + (au / max) * 92 }; // % across the map; 0 AU is the star's surface
}

/** the star is a big circle mostly off the left edge: small stars show a tight arch, big stars look nearly flat */
function Sun({ seed }: { seed: number }) {
  const star = starParams(seed);

  const rgba = (alpha: number) => `rgba(${star.color.map((channel) => Math.round(channel * 255)).join(",")},${alpha})`;
  const radius = 40 + Math.min(1, Math.max(0, (star.size - 0.5) / 1.3)) * 560;

  return (
    <div className="sun" style={{
      width: radius * 2, height: radius * 2, left: STAR_VISIBLE - radius * 2, top: `calc(${SOLAR_Y}% - ${radius}px)`,
      background: `radial-gradient(circle closest-side, ${rgba(1)} 0, ${rgba(1)} 80%, #fff 100%)`,
      boxShadow: `0 0 6px 1px #fff, 0 0 26px 8px ${rgba(0.75)}, 0 0 70px 24px ${rgba(0.4)}, 0 0 140px 50px ${rgba(0.2)}`,
    }} />
  );
}

/** real-distance ruler along the bottom, with a line from each planet to its true position */
function Ruler({ planets, viewed, slotX }: { planets: PlanetDTO[]; viewed: PlanetDTO; slotX: (index: number) => number }) {
  const { max, ticks, axisX } = rulerScale(planets);

  return (
    <>
      <svg className="ruler" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={axisX(0)} y1={AXIS_Y} x2={axisX(max)} y2={AXIS_Y} stroke="#4b5878" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {planets.map((planet, index) => (
          <line key={planet.id} x1={slotX(index)} y1={SOLAR_Y + 14} x2={axisX(planet.orbit)} y2={AXIS_Y}
            stroke={planet.id === viewed.id ? "#4cc2ff" : "#4b587866"} strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        ))}

      </svg>
      {ticks.map((au) => (
        <div key={au} className="tick" style={{ left: `${axisX(au)}%`, top: `${AXIS_Y}%` }}><span>{au === 0 ? "star" : `${au} AU`}</span></div>
      ))}

      {planets.map((planet) => (
        <span key={planet.id} className={`ruler-dot ${planet.id === viewed.id ? "sel" : ""}`} style={{ left: `${axisX(planet.orbit)}%`, top: `${AXIS_Y}%` }} />
      ))}

    </>
  );
}

type NodeProps = { planet: PlanetDTO; index: number; slots: number; selected: boolean; guarded: boolean; left: number; onSelect: (planet: PlanetDTO) => void };

/** a clickable planet: its diameter in px is proportional to its size and capped by how much room each slot has */
function PlanetNode({ planet, index, slots, selected, guarded, left, onSelect }: NodeProps) {
  const cap = Math.max(14, (((MAP_WIDTH_PX * SLOT_SPAN) / 100) / slots) * 0.85);
  const body = MIN_PLANET_PX + (planetParams(planet.seed).radius / MAX_RADIUS) * (cap - MIN_PLANET_PX);
  const size = thumbDisplaySize(planet.seed, body);

  return (
    <button className={`snode ${selected ? "sel" : ""} ${index % 2 ? "below" : "above"}`}
      style={{ left: `${left}%`, top: `${SOLAR_Y}%`, ["--body" as string]: `${body}px` }}
      onClick={() => onSelect(planet)} title={`${planet.name} · ${fmtAU(planet.orbit)}`}>
      <img className="thumb" src={planetThumb(planet.seed)} alt="" style={{ width: size, height: size }} />
      <span className={`dot ${planet.kind}`} />
      {guarded && <img className="guard" src={SHIPS.fighter.icon} alt="guarded" />}
      <span className="label">{planet.name}<small>{fmtAU(planet.orbit)}</small></span>
    </button>
  );
}

/** a fleet flying between two planets of this system, drawn between their slots */
function FlyingFleet({ fleet, game, now, slotById }: { fleet: FleetDTO; game: GameState; now: number; slotById: Map<number, number> }) {
  const { from, to, k } = flightOf(game, fleet, now);
  const fromX = slotById.get(from.id) ?? SLOT_LEFT;
  const toX = slotById.get(to.id) ?? SLOT_LEFT;

  return (
    <span className="fleet" style={{ left: `${fromX + (toX - fromX) * k}%`, top: `${SOLAR_Y}%`, transform: `translate(-50%,-50%) rotate(${toX >= fromX ? 90 : -90}deg)` }}>
      <img src={fleetIcon(fleet)} alt="" />
    </span>
  );
}

/** one star system: planets are drawn evenly spaced (NOT to scale); the ruler along the bottom shows the real distances */
export default function SolarMap({ game, system, viewed, now, onSelect }: System & { now: number; onSelect: (planet: PlanetDTO) => void }) {
  const star = starParams(system.seed);
  const planets = game.planets.filter((planet) => planet.systemId === system.id).sort((first, second) => first.orbit - second.orbit);
  const guarded = new Set(game.fleets.filter((fleet) => fleet.status === "stationed").map((fleet) => fleet.targetId));

  // the system a fleet's origin planet is in
  const originSystem = (id: number) => game.planets.find((planet) => planet.id === id)!.systemId;
  const local = flyingFleets(game).filter((fleet) => !isCrossSystem(game, fleet) && originSystem(fleet.originId) === system.id);
  const slots = planets.length;

  const slotX = (index: number) => SLOT_LEFT + ((index + 0.5) * SLOT_SPAN) / slots;
  const slotById = new Map(planets.map((planet, index) => [planet.id, slotX(index)]));

  return (
    <div className="panel">
      <h2>Solar system — {system.name} <span className="dim">({star.spectral} · {star.label})</span></h2>
      <div className={`solar ${slots > CROWDED_PLANETS ? "crowded" : ""}`}>
        {slots === 0 && <div className="dim" style={{ position: "absolute", right: 12, top: 8, zIndex: 1 }}>Surveying system…</div>}
        <Sun seed={system.seed} />
        <div className="plane" style={{ top: `${SOLAR_Y}%` }} />
        <Ruler planets={planets} viewed={viewed} slotX={slotX} />
        {planets.map((planet, index) => (
          <PlanetNode key={planet.id} planet={planet} index={index} slots={slots} selected={planet.id === viewed.id} guarded={guarded.has(planet.id)} left={slotX(index)} onSelect={onSelect} />
        ))}

        {local.map((fleet) => <FlyingFleet key={fleet.id} fleet={fleet} game={game} now={now} slotById={slotById} />)}
      </div>
      <div className="dim" style={{ marginTop: 8 }}><b className="mine">●</b> yours · <b className="foe">●</b> enemy · no dot = neutral (colonize or guard). Planets are evenly spaced for readability; the ruler along the bottom shows their real distance from the star. Click a planet to view/target it.</div>
    </div>
  );
}
