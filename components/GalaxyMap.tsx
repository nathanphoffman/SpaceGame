import { starParams } from "@/lib/planetGen";
import type { GameState } from "@/lib/defs";
import { flightOf, flyingFleets, isCrossSystem } from "@/lib/flight";
import { fleetIcon } from "./ui";

type Props = { game: GameState; shownSystemId: number; now: number; onSelect: (systemId: number) => void };

/** all star systems, with fleets flying between them */
export default function GalaxyMap({ game, shownSystemId, now, onSelect }: Props) {
  const sysOf = (id: number) => game.systems.find((x) => x.id === id)!;
  const cross = flyingFleets(game).filter((f) => isCrossSystem(game, f));
  return (
    <div className="panel">
      <h2>Galaxy map</h2>
      <div className="map galaxy">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {cross.map((f) => {
            const { from, to } = flightOf(game, f, now);
            const a = sysOf(from.systemId), b = sysOf(to.systemId);
            return <line key={f.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4cc2ff55" strokeWidth="0.4" strokeDasharray="1.5 1.5" />;
          })}
        </svg>
        {game.systems.map((sy) => {
          const st = starParams(sy.seed);
          const rgb = `rgb(${st.color.map((c) => Math.round(c * 255)).join(",")})`;
          const owned = game.planets.filter((p) => p.kind === "player" && p.systemId === sy.id).length;
          // diameter on a log scale of the real stellar radius: white dwarfs tiny, supergiants huge
          const d = Math.min(38, Math.max(6, 7 + 9 * Math.log10(st.radius / 0.05)));
          return (
            <button key={sy.id} className={`gnode ${sy.id === shownSystemId ? "sel" : ""}`} style={{ left: `${sy.x}%`, top: `${sy.y}%` }}
              onClick={() => onSelect(sy.id)} title={`${sy.name} · ${st.spectral} ${st.label} · ${st.temp} K · ${st.radius < 0.1 ? st.radius.toFixed(3) : st.radius.toFixed(1)} R☉`}>
              <span className="star" style={{ ["--c" as string]: rgb, ["--d" as string]: `${d}px`, ["--b" as string]: st.bright }} />
              <span className="label">{sy.name}{owned > 0 && <b className="mine"> ● {owned}</b>}<small>{st.spectral}</small></span>
            </button>
          );
        })}
        {cross.map((f) => {
          const { from, to, k } = flightOf(game, f, now);
          const a = sysOf(from.systemId), b = sysOf(to.systemId);
          const angle = (Math.atan2(b.y - a.y, (b.x - a.x) * 1.6) * 180) / Math.PI + 90;
          return (
            <span key={f.id} className="fleet" style={{ left: `${a.x + (b.x - a.x) * k}%`, top: `${a.y + (b.y - a.y) * k}%`, transform: `translate(-50%,-50%) rotate(${angle}deg)` }}>
              <img src={fleetIcon(f)} alt="" />
            </span>
          );
        })}
      </div>
      <div className="dim" style={{ marginTop: 8 }}>Click a star to open its solar system. <b className="mine">●</b> = your bases there.</div>
    </div>
  );
}
