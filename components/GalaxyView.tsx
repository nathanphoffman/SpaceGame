import type { GameState } from "@/lib/defs";
import { CENTER, GRID, SECTOR_LY, sectorStarCount } from "@/lib/sector";
import { SYSTEMS } from "@/lib/data/catalog";

type Props = { game: GameState; current: [number, number]; onSelect: (sx: number, sy: number) => void };

/** the whole galaxy as a grid of sectors; Sol's sector is the exact centre */
export default function GalaxyView({ game, current, onSelect }: Props) {
  // sectors where you own a planet
  const sectorOfSystem = new Map(game.systems.map((s) => [s.id, `${s.sectorX},${s.sectorY}`]));
  const mine = new Set(game.planets.filter((p) => p.kind === "player").map((p) => sectorOfSystem.get(p.systemId)));

  const rows = [];
  for (let sy = GRID - 1; sy >= 0; sy--) { // north (high y) at the top
    for (let sx = 0; sx < GRID; sx++) {
      const home = sx === CENTER && sy === CENTER;
      const stars = home ? SYSTEMS.length : sectorStarCount(sx, sy);
      const here = sx === current[0] && sy === current[1];
      rows.push(
        <button key={`${sx},${sy}`} className={`gal-cell ${here ? "sel" : ""} ${home ? "sol" : ""}`}
          style={{ background: `rgba(76,194,255,${(0.05 + (stars / 40) * 0.35).toFixed(2)})` }}
          title={`Sector ${sx - CENTER}, ${sy - CENTER}${home ? " · Sol" : ""} · ${stars} stars`}
          onClick={() => onSelect(sx, sy)}>
          {mine.has(`${sx},${sy}`) ? <b className="mine">●</b> : home ? "☉" : ""}
        </button>,
      );
    }
  }
  return (
    <div className="panel">
      <h2>Galaxy map <span className="dim">({GRID} × {GRID} sectors, {SECTOR_LY} ly each)</span></h2>
      <div className="gal-grid">{rows}</div>
      <div className="dim" style={{ marginTop: 8 }}>Click a square to see its stars. ☉ = Sol&apos;s sector, <b className="mine">●</b> = your bases. Brighter squares have more stars.</div>
    </div>
  );
}
