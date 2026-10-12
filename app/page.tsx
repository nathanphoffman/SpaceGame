"use client";

import { useState } from "react";
import Buildings from "@/components/Buildings";
import FleetSend from "@/components/FleetSend";
import FleetsPanel from "@/components/FleetsPanel";
import GalaxyMap from "@/components/GalaxyMap";
import PlanetPanel from "@/components/PlanetPanel";
import Shipyard from "@/components/Shipyard";
import SolarMap from "@/components/SolarMap";
import TopBar from "@/components/TopBar";
import { planetStats } from "@/lib/planetGen";
import { ELEMENTS, buildingInfo, mineType, productionRates, type Element, type Res } from "@/lib/defs";
import { useGame } from "@/lib/useGame";

export default function Page() {
  const { game, error, act, now } = useGame();
  const [planetId, setPlanetId] = useState<number | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [systemId, setSystemId] = useState<number | null>(null); // system shown on the solar map

  if (!game) return <div style={{ padding: 24 }}>{error || "Loading…"}</div>;

  const mine = game.planets.filter((p) => p.kind === "player");
  const planet = mine.find((p) => p.id === planetId) ?? mine[0];
  const target = game.planets.find((p) => p.id === targetId && p.kind !== "player") ?? null;
  const viewed = game.planets.find((p) => p.id === viewId) ?? planet;
  const sysOf = (id: number) => game.systems.find((x) => x.id === id)!;
  const shownSystem = sysOf(systemId ?? viewed.systemId);

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

  const activeFleets = game.fleets.filter((f) => f.status !== "done");
  const reports = game.fleets.filter((f) => f.report).slice(-6).reverse();
  const planetName = (id: number) => game.planets.find((p) => p.id === id)?.name ?? "?";
  const queueOf = (kind: "building" | "ship") => game.queue.filter((q) => q.planetId === planet.id && q.kind === kind);

  return (
    <>
      <TopBar
        planets={mine} current={planet} stock={stock} rate={rate}
        onSelect={(id) => { setPlanetId(id); setViewId(id); setSystemId(null); }}
        onReset={() => confirm("Reset the whole game?") && act({ action: "reset" })}
      />
      <div className="layout">
        <div>
          <PlanetPanel
            planet={viewed} systemSeed={sysOf(viewed.systemId).seed}
            guards={activeFleets.filter((f) => f.status === "stationed" && f.targetId === viewed.id)}
          />
          <SolarMap
            game={game} system={shownSystem} viewed={viewed} now={now}
            onSelect={(p) => { setViewId(p.id); if (p.kind === "player") setPlanetId(p.id); else setTargetId(p.id); }}
          />
          <GalaxyMap game={game} shownSystemId={shownSystem.id} now={now} onSelect={setSystemId} />
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
            {reports.map((f) => <div className="report" key={f.id}>{f.report}</div>)}
          </div>
        </div>
      </div>
    </>
  );
}
