import { starParams } from "@/lib/planetGen";
import type { GameState } from "@/lib/defs";
import { flightOf, flyingFleets } from "@/lib/flight";
import { mapPositions } from "@/lib/galaxyLayout";
import { CENTER, SECTOR_LY, sectorCentre } from "@/lib/sector";
import { fleetIcon } from "./ui";
import { useMapZoom } from "./useMapZoom";

type Props = {
  game: GameState;
  sector: [number, number];
  shownSystemId: number;
  now: number;
  onSelect: (systemId: number) => void;
  onBack: () => void;
};

/** the stars of one sector; click a star to open its solar system */
export default function LocalMap({ game, sector, shownSystemId, now, onSelect, onBack }: Props) {
  const [sx, sy] = sector;
  const systems = game.systems.filter((s) => s.sectorX === sx && s.sectorY === sy);
  const view = useMapZoom();
  const base = mapPositions(systems, sectorCentre(sx, sy), SECTOR_LY / 2);
  const pos = new Map([...base].map(([id, point]) => [id, view.project(point)])); // where each star is drawn at this zoom
  const flying = flyingFleets(game).filter((f) => {
    const { from, to } = flightOf(game, f, now);
    return pos.has(from.systemId) && pos.has(to.systemId) && from.systemId !== to.systemId;
  });
  const title = sx === CENTER && sy === CENTER ? "Local map — Sol's sector" : `Local map — sector ${sx - CENTER}, ${sy - CENTER}`;

  return (
    <div className="panel">
      <h2>
        {title} <span className="dim">({SECTOR_LY} ly across)</span>
        <button className="ghost" style={{ float: "right", marginTop: -4 }} onClick={onBack}>← Galaxy</button>
      </h2>
      <div ref={view.ref} onPointerDown={view.onPointerDown} className={`map galaxy ${systems.length > 12 && view.zoom < 2.5 ? "crowded" : ""}`}>
        <div className="zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={view.zoomIn} title="Zoom in">+</button>
          <button onClick={view.zoomOut} title="Zoom out">−</button>
          <button className="ghost" onClick={view.reset} title="Show the whole sector">×{view.zoom.toFixed(1)}</button>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          {flying.map((f) => {
            const { from, to } = flightOf(game, f, now);
            const a = pos.get(from.systemId)!, b = pos.get(to.systemId)!;
            return <line key={f.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4cc2ff55" strokeWidth="0.4" strokeDasharray="1.5 1.5" />;
          })}
        </svg>
        {systems.length === 0 && <div className="dim" style={{ padding: 12 }}>Surveying sector…</div>}
        {systems.filter((s2) => { const point = pos.get(s2.id)!; return point.x > -5 && point.x < 105 && point.y > -5 && point.y < 105; }).map((sy2) => {
          const st = starParams(sy2.seed);
          const rgb = `rgb(${st.color.map((c) => Math.round(c * 255)).join(",")})`;
          const owned = game.planets.filter((planet) => planet.kind === "player" && planet.systemId === sy2.id).length;
          const at = pos.get(sy2.id)!;
          // diameter on a log scale of the real stellar radius: small stars are near a point of light,
          // supergiants about 6x that (kept modest so stars are easy to click and tell apart)
          const d = Math.min(25, Math.max(4.25, 6.6 + 5.75 * Math.log10(st.radius / 0.1)));
          return (
            <button key={sy2.id} className={`gnode ${sy2.id === shownSystemId ? "sel" : ""} ${owned > 0 ? "home" : ""}`} style={{ left: `${at.x}%`, top: `${at.y}%` }}
              onClick={() => !view.moved.current && onSelect(sy2.id)} title={`${sy2.name} · ${st.spectral} ${st.label} · ${st.temp} K · ${st.radius < 0.1 ? st.radius.toFixed(3) : st.radius.toFixed(1)} R☉`}>
              <span className="star" style={{ ["--c" as string]: rgb, ["--d" as string]: `${d}px`, ["--b" as string]: st.bright }} />
              <span className="label">{sy2.name}{owned > 0 && <b className="mine"> ● {owned}</b>}<small>{st.spectral}</small></span>
            </button>
          );
        })}
        {flying.map((f) => {
          const { from, to, k } = flightOf(game, f, now);
          const a = pos.get(from.systemId)!, b = pos.get(to.systemId)!;
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
          return (
            <span key={f.id} className="fleet" style={{ left: `${a.x + (b.x - a.x) * k}%`, top: `${a.y + (b.y - a.y) * k}%`, transform: `translate(-50%,-50%) rotate(${angle}deg)` }}>
              <img src={fleetIcon(f)} alt="" />
            </span>
          );
        })}
      </div>
      <div className="dim" style={{ marginTop: 8 }}>Scroll or use +/− to zoom, drag to move, click a star to open its solar system. <b className="mine">●</b> = your bases there.</div>
    </div>
  );
}
