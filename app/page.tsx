"use client";

import { useState } from "react";
import Buildings from "@/components/panels/Buildings";
import FleetSend from "@/components/panels/FleetSend";
import FleetsPanel from "@/components/panels/FleetsPanel";
import GalaxyView from "@/components/maps/GalaxyView";
import LocalMap from "@/components/maps/LocalMap";
import PlanetPanel from "@/components/panels/PlanetPanel";
import Shipyard from "@/components/panels/Shipyard";
import SolarMap from "@/components/maps/SolarMap";
import SystemView from "@/components/maps/SystemView";
import TopBar from "@/components/panels/TopBar";
import { planetStats } from "@/lib/planetGen";
import { ELEMENTS, buildingInfo, mineType, productionRates, type Element, type Res } from "@/lib/defs";
import type { PlanetDTO } from "@/lib/defs";
import { useGame } from "@/lib/useGame";
import { CENTER } from "@/lib/galaxy/sector";

export default function Page() {
  const [sector, setSector] = useState<[number, number]>([CENTER, CENTER]); // the sector shown on the local map
  const [atGalaxy, setAtGalaxy] = useState(false); // true = showing the grid of sectors instead of one sector
  const [systemId, setSystemId] = useState<number | null>(null); // system shown on the solar map
  const { game, error, act, now } = useGame({ sx: sector[0], sy: sector[1], system: systemId ?? undefined });
  const [planetId, setPlanetId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [view3d, setView3d] = useState(true); // solar system shown in 3D (true) or as the flat map

  if (!game) return <div style={{ padding: 24 }}>{error || "Loading…"}</div>;

  const mine = game.planets.filter((p) => p.kind === "player");
  const planet = mine.find((p) => p.id === planetId) ?? mine[0];
  const target = game.planets.find((p) => p.id === targetId && p.kind !== "player") ?? null;
  const viewed = game.planets.find((p) => p.id === viewId) ?? planet;

  // look up a loaded system by id; one is always loaded for a planet we show
  const sysOf = (id: number) => game.systems.find((x) => x.id === id)!;
  const shownSystem = game.systems.find((x) => x.id === systemId) ?? sysOf(viewed.systemId); // (a just-clicked system arrives with the next update)

  const composition = planetStats(planet.seed).composition;
  const rate = productionRates(planet.buildings, composition);
  const sec = Math.max(0, (now - game.now) / 1000);

  const stock = (el: string) => (planet.resources[el] ?? 0) + (rate[el] ?? 0) * sec;

  // why something can't be bought right now (undefined = it can), used for the disabled-button tooltips
  const shortfall = (cost: Res) => {
    const missing = Object.entries(cost)
      .filter(([el, n]) => stock(el) < n)
      .map(([el, n]) => `${Math.ceil(n - stock(el))} more ${ELEMENTS[el as Element]?.name ?? el}`);

    return missing.length ? `Not enough resources: need ${missing.join(" and ")}` : undefined;
  };

  // what this planet can build: a shipyard, a mine for each element it is made of, and any mines it already has
  const buildingTypes = Array.from(new Set([
    "shipyard",
    ...composition.map((c) => mineType(c.symbol)),
    ...Object.keys(planet.buildings).filter((t) => buildingInfo(t)),
  ]));

  const activeFleets = game.fleets.filter((fleet) => fleet.status !== "done");
  const reports = game.fleets.filter((fleet) => fleet.report).slice(-6).reverse();

  // a planet's name from its id, or ? when that planet isn't loaded
  const planetName = (id: number) => game.planets.find((p) => p.id === id)?.name ?? "?";

  // this planet's queue entries of one kind (buildings or ships)
  const queueOf = (kind: "building" | "ship") => game.queue.filter((queueItem) => queueItem.planetId === planet.id && queueItem.kind === kind);

  const onSelectPlanet = (p: PlanetDTO) => { setViewId(p.id); if (p.kind === "player") setPlanetId(p.id); else setTargetId(p.id); };

  return (
    <>
      <TopBar
        planets={mine} current={planet} stock={stock} rate={rate}
        onSelect={(id) => { // picking one of your planets also moves the maps to its system and sector
          const home = sysOf(game.planets.find((p) => p.id === id)!.systemId);
          setPlanetId(id); setViewId(id); setSystemId(home.id); setSector([home.sectorX, home.sectorY]); setAtGalaxy(false);
        }}

        onReset={() => confirm("Reset the whole game?") && act({ action: "reset" })}
      />
      <div className="layout">
        <div>
          <PlanetPanel
            planet={viewed} systemSeed={sysOf(viewed.systemId).seed}
            guards={activeFleets.filter((fleet) => fleet.status === "stationed" && fleet.targetId === viewed.id)}
          />
          <div style={{ textAlign: "right", marginBottom: 6 }}>
            <button className="ghost" onClick={() => setView3d(!view3d)}>{view3d ? "Show flat map" : "Show 3D view"}</button>
          </div>
          {view3d ? (
            <SystemView game={game} system={shownSystem} viewed={viewed} now={now} onSelect={onSelectPlanet} />
          ) : (
            <SolarMap game={game} system={shownSystem} viewed={viewed} now={now} onSelect={onSelectPlanet} />
          )}

          {atGalaxy ? (
            <GalaxyView game={game} current={sector} onSelect={(sx, sy) => { setSector([sx, sy]); setAtGalaxy(false); }} />
          ) : (
            <LocalMap key={sector.join(",")} game={game} sector={sector} shownSystemId={shownSystem.id} now={now} onSelect={setSystemId} onBack={() => setAtGalaxy(true)} />
          )}

        </div>

        <div>
          {/* back to your base after sending, so its buildings/shipyard show again */}
          <FleetSend game={game} planet={planet} target={target} act={act} onSent={() => setViewId(planet.id)} />
          {error && <div className="panel err">{error}</div>}
          {viewed.kind === "player" && (
            <Buildings planet={planet} composition={composition} types={buildingTypes} queue={queueOf("building")} now={now} shortfall={shortfall} act={act} />
          )}

          <Shipyard show={viewed.kind === "player"} planet={planet} queue={queueOf("ship")} now={now} shortfall={shortfall} act={act} />
          <FleetsPanel planet={planet} showHangar={viewed.kind === "player"} fleets={activeFleets} planetName={planetName} now={now} act={act} />
          <div className="panel">
            <h2>Reports</h2>
            {reports.length === 0 && <div className="dim">No reports yet.</div>}
            {reports.map((fleet) => <div className="report" key={fleet.id}>{fleet.report}</div>)}
          </div>
        </div>
      </div>
    </>
  );
}
