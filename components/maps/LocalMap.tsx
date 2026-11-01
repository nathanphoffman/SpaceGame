import { starParams } from "@/lib/planets/starParams";
import type { FleetDTO, GameState, SystemDTO } from "@/lib/defs";
import { flightOf, flyingFleets } from "@/lib/galaxy/flight";
import { mapPositions } from "@/lib/galaxy/galaxyLayout";
import { CENTER, SECTOR_LY, sectorCentre } from "@/lib/galaxy/sector";
import { fleetIcon } from "@/components/ui";
import { useMapZoom } from "@/components/maps/useMapZoom";

type Props = {
  game: GameState;
  sector: [number, number];
  shownSystemId: number;
  now: number;
  onSelect: (systemId: number) => void;
  onBack: () => void;
};

const CROWDED_STARS = 12;
const CROWDED_ZOOM = 2.5;
const EDGE_MARGIN = 5; // stars this far outside the map box (in %) are still drawn
const MIN_STAR_PX = 4.25;
const MAX_STAR_PX = 25;

type Point = { x: number; y: number };
type Positions = Map<number, Point>;

/** star diameter on a log scale of the real stellar radius: small stars are near a point of light, supergiants about 6x that (kept modest so stars are easy to click and tell apart) */
const starDiameter = (radius: number) => Math.min(MAX_STAR_PX, Math.max(MIN_STAR_PX, 6.6 + 5.75 * Math.log10(radius / 0.1)));

const isOnMap = (point: Point) => point.x > -EDGE_MARGIN && point.x < 100 + EDGE_MARGIN && point.y > -EDGE_MARGIN && point.y < 100 + EDGE_MARGIN;

function ZoomControls({ view }: { view: ReturnType<typeof useMapZoom> }) {
  return (
    <div className="zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
      <button onClick={view.zoomIn} title="Zoom in">+</button>
      <button onClick={view.zoomOut} title="Zoom out">−</button>
      <button className="ghost" onClick={view.reset} title="Show the whole sector">×{view.zoom.toFixed(1)}</button>
    </div>
  );
}

function FlightLines({ fleets, game, now, positions }: { fleets: FleetDTO[]; game: GameState; now: number; positions: Positions }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      {fleets.map((fleet) => {
        const { from, to } = flightOf(game, fleet, now);
        const start = positions.get(from.systemId)!, end = positions.get(to.systemId)!;

        return <line key={fleet.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#4cc2ff55" strokeWidth="0.4" strokeDasharray="1.5 1.5" />;
      })}
    </svg>
  );
}

type StarProps = { system: SystemDTO; at: Point; owned: number; selected: boolean; onOpen: () => void };

/** one clickable star: coloured and sized by its real class, with a marker when you have bases there */
function StarButton({ system, at, owned, selected, onOpen }: StarProps) {
  const star = starParams(system.seed);
  const color = `rgb(${star.color.map((channel) => Math.round(channel * 255)).join(",")})`;
  const radius = star.radius < 0.1 ? star.radius.toFixed(3) : star.radius.toFixed(1);

  return (
    <button className={`gnode ${selected ? "sel" : ""} ${owned > 0 ? "home" : ""}`} style={{ left: `${at.x}%`, top: `${at.y}%` }}
      onClick={onOpen} title={`${system.name} · ${star.spectral} ${star.label} · ${star.temp} K · ${radius} R☉`}>
      <span className="star" style={{ ["--c" as string]: color, ["--d" as string]: `${starDiameter(star.radius)}px`, ["--b" as string]: star.bright }} />
      <span className="label">{system.name}{owned > 0 && <b className="mine"> ● {owned}</b>}<small>{star.spectral}</small></span>
    </button>
  );
}

/** a fleet flying between two stars, turned to face where it is going */
function FlyingFleet({ fleet, game, now, positions }: { fleet: FleetDTO; game: GameState; now: number; positions: Positions }) {
  const { from, to, k } = flightOf(game, fleet, now);
  const start = positions.get(from.systemId)!, end = positions.get(to.systemId)!;
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 90;

  return (
    <span className="fleet" style={{ left: `${start.x + (end.x - start.x) * k}%`, top: `${start.y + (end.y - start.y) * k}%`, transform: `translate(-50%,-50%) rotate(${angle}deg)` }}>
      <img src={fleetIcon(fleet)} alt="" />
    </span>
  );
}

/** the stars of one sector; click a star to open its solar system */
export default function LocalMap({ game, sector, shownSystemId, now, onSelect, onBack }: Props) {
  const [sx, sy] = sector;
  const systems = game.systems.filter((system) => system.sectorX === sx && system.sectorY === sy);
  const view = useMapZoom();
  const base = mapPositions(systems, sectorCentre(sx, sy), SECTOR_LY / 2);
  const positions: Positions = new Map([...base].map(([id, point]) => [id, view.project(point)])); // where each star is drawn at this zoom
  const flying = flyingFleets(game).filter((fleet) => {
    const { from, to } = flightOf(game, fleet, now);

    return positions.has(from.systemId) && positions.has(to.systemId) && from.systemId !== to.systemId;
  });
  const title = sx === CENTER && sy === CENTER ? "Local map — Sol's sector" : `Local map — sector ${sx - CENTER}, ${sy - CENTER}`;
  const visible = systems.filter((system) => isOnMap(positions.get(system.id)!)); // only draw stars inside the map box (plus a small margin) when zoomed in
  const ownedIn = (systemId: number) => game.planets.filter((planet) => planet.kind === "player" && planet.systemId === systemId).length;

  return (
    <div className="panel">
      <h2>
        {title} <span className="dim">({SECTOR_LY} ly across)</span>
        <button className="ghost" style={{ float: "right", marginTop: -4 }} onClick={onBack}>← Galaxy</button>
      </h2>
      <div ref={view.ref} onPointerDown={view.onPointerDown} className={`map galaxy ${systems.length > CROWDED_STARS && view.zoom < CROWDED_ZOOM ? "crowded" : ""}`}>
        <ZoomControls view={view} />
        <FlightLines fleets={flying} game={game} now={now} positions={positions} />
        {systems.length === 0 && <div className="dim" style={{ padding: 12 }}>Surveying sector…</div>}
        {visible.map((system) => (
          <StarButton key={system.id} system={system} at={positions.get(system.id)!} owned={ownedIn(system.id)} selected={system.id === shownSystemId}
            onOpen={() => !view.moved.current && onSelect(system.id)} />
        ))}
        {flying.map((fleet) => <FlyingFleet key={fleet.id} fleet={fleet} game={game} now={now} positions={positions} />)}
      </div>
      <div className="dim" style={{ marginTop: 8 }}>Scroll or use +/− to zoom, drag to move, click a star to open its solar system. <b className="mine">●</b> = your bases there.</div>
    </div>
  );
}
