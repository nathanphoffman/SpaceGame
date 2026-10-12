import { planetThumb, thumbDisplaySize } from "@/components/planetThumb";
import { planetParams, starParams } from "@/lib/planetGen";
import { SHIPS, type GameState, type PlanetDTO, type SystemDTO } from "@/lib/defs";
import { flightOf, flyingFleets, isCrossSystem } from "@/lib/flight";
import { fleetIcon, fmtAU } from "./ui";

type Props = { game: GameState; system: SystemDTO; viewed: PlanetDTO; now: number; onSelect: (p: PlanetDTO) => void };

const SOLAR_Y = 42; // % down the map where the planets sit
const AXIS_Y = 84;
const STAR_VISIBLE = 26; // px of the star poking into the map

/** one star system: planets are drawn evenly spaced (NOT to scale); the ruler along the bottom shows the real distances */
export default function SolarMap({ game, system, viewed, now, onSelect }: Props) {
  const star = starParams(system.seed);
  const planets = game.planets.filter((p) => p.systemId === system.id).sort((a, b) => a.orbit - b.orbit);
  const guarded = new Set(game.fleets.filter((f) => f.status === "stationed").map((f) => f.targetId));
  const planetSystem = (id: number) => game.planets.find((p) => p.id === id)!.systemId;
  const local = flyingFleets(game).filter((f) => !isCrossSystem(game, f) && planetSystem(f.originId) === system.id);

  const slots = planets.length;
  const slotX = (i: number) => 12 + ((i + 0.5) * 86) / slots;
  const slotById = new Map(planets.map((p, i) => [p.id, slotX(i)]));
  const maxOrbit = Math.max(0.01, ...planets.map((p) => p.orbit));
  const auStep = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20].find((st) => maxOrbit / st <= 6) ?? 50;
  const auMax = Math.ceil(maxOrbit / auStep) * auStep;
  const auTicks = Array.from({ length: Math.round(auMax / auStep) + 1 }, (_, i) => Math.round(i * auStep * 1000) / 1000);
  const axisX = (au: number) => 6 + (au / auMax) * 92; // % across the map; 0 AU is the star's surface

  // the star is a big circle mostly off the left edge: small stars show a tight arch, big stars look nearly flat
  const rgba = (a: number) => `rgba(${star.color.map((c) => Math.round(c * 255)).join(",")},${a})`;
  const starR = 40 + Math.min(1, Math.max(0, (star.size - 0.5) / 1.3)) * 560;

  return (
    <div className="panel">
      <h2>Solar system — {system.name} <span className="dim">({star.spectral} · {star.label})</span></h2>
      <div className={`solar ${slots > 8 ? "crowded" : ""}`}>
        <div className="sun" style={{
          width: starR * 2, height: starR * 2, left: STAR_VISIBLE - starR * 2, top: `calc(${SOLAR_Y}% - ${starR}px)`,
          background: `radial-gradient(circle closest-side, ${rgba(1)} 0, ${rgba(1)} 80%, #fff 100%)`,
          boxShadow: `0 0 6px 1px #fff, 0 0 26px 8px ${rgba(0.75)}, 0 0 70px 24px ${rgba(0.4)}, 0 0 140px 50px ${rgba(0.2)}`,
        }} />
        <div className="plane" style={{ top: `${SOLAR_Y}%` }} />

        {/* real-distance ruler along the bottom, with a line from each planet to its true position */}
        <svg className="ruler" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1={axisX(0)} y1={AXIS_Y} x2={axisX(auMax)} y2={AXIS_Y} stroke="#4b5878" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {planets.map((p, i) => (
            <line key={p.id} x1={slotX(i)} y1={SOLAR_Y + 14} x2={axisX(p.orbit)} y2={AXIS_Y}
              stroke={p.id === viewed.id ? "#4cc2ff" : "#4b587866"} strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {auTicks.map((au) => (
          <div key={au} className="tick" style={{ left: `${axisX(au)}%`, top: `${AXIS_Y}%` }}><span>{au === 0 ? "star" : `${au} AU`}</span></div>
        ))}
        {planets.map((p) => (
          <span key={p.id} className={`ruler-dot ${p.id === viewed.id ? "sel" : ""}`} style={{ left: `${axisX(p.orbit)}%`, top: `${AXIS_Y}%` }} />
        ))}

        {planets.map((p, i) => {
          const spacingPx = (440 * 86) / 100 / slots;
          const body = Math.min(14 + planetParams(p.seed).radius * 16, spacingPx * 0.8); // planet diameter in px
          const size = thumbDisplaySize(p.seed, body);
          return (
            <button key={p.id} className={`snode ${p.id === viewed.id ? "sel" : ""} ${i % 2 ? "below" : "above"}`}
              style={{ left: `${slotX(i)}%`, top: `${SOLAR_Y}%`, ["--body" as string]: `${body}px` }}
              onClick={() => onSelect(p)} title={`${p.name} · ${fmtAU(p.orbit)}`}>
              <img className="thumb" src={planetThumb(p.seed)} alt="" style={{ width: size, height: size }} />
              <span className={`dot ${p.kind}`} />
              {guarded.has(p.id) && <img className="guard" src={SHIPS.fighter.icon} alt="guarded" />}
              <span className="label">{p.name}<small>{fmtAU(p.orbit)}</small></span>
            </button>
          );
        })}
        {local.map((f) => {
          const { from, to, k } = flightOf(game, f, now);
          const fx = slotById.get(from.id) ?? 12;
          const tx = slotById.get(to.id) ?? 12;
          return (
            <span key={f.id} className="fleet" style={{ left: `${fx + (tx - fx) * k}%`, top: `${SOLAR_Y}%`, transform: `translate(-50%,-50%) rotate(${tx >= fx ? 90 : -90}deg)` }}>
              <img src={fleetIcon(f)} alt="" />
            </span>
          );
        })}
      </div>
      <div className="dim" style={{ marginTop: 8 }}><b className="mine">●</b> yours · <b className="foe">●</b> enemy · no dot = neutral (colonize or guard). Planets are evenly spaced for readability; the ruler along the bottom shows their real distance from the star. Click a planet to view/target it.</div>
    </div>
  );
}
