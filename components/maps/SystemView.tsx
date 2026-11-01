"use client";

import { useEffect, useRef } from "react";
import { starParams } from "@/lib/planetGen";
import type { GameState, PlanetDTO, SystemDTO } from "@/lib/defs";
import { SystemEngine } from "@/components/maps/three/SystemEngine";

type Props = { game: GameState; system: SystemDTO; viewed: PlanetDTO; now: number; onSelect: (planet: PlanetDTO) => void };

/** one star system in 3D: drag to rotate, scroll to zoom, click a planet to fly to it. Ships on route fly between planets. */
export default function SystemView({ game, system, viewed, now, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const engine = useRef<SystemEngine | null>(null);

  const select = useRef(onSelect);
  const latest = useRef(game);
  useEffect(() => { select.current = onSelect; latest.current = game; });
  const star = starParams(system.seed);

  useEffect(() => {
    const e = new SystemEngine(box.current!, {
      onPlanet: (id) => { const p = latest.current.planets.find((x) => x.id === id); if (p) select.current(p); }, // clicks from the 3D scene come back as a planet id; look up the full planet and pass it up
    });

    engine.current = e;

    return () => { e.dispose(); engine.current = null; };
  }, []);

  useEffect(() => {
    engine.current?.update(game, system, now, viewed.systemId === system.id ? viewed.id : null);
  }, [game, system, viewed]); // eslint-disable-line react-hooks/exhaustive-deps -- `now` is left out on purpose: the engine keeps its own clock between server updates

  return (
    <div className="panel">
      <h2>
        Solar system — {system.name} <span className="dim">({star.spectral} · {star.label})</span>
        <button className="ghost" style={{ float: "right", padding: "1px 8px" }} onClick={() => engine.current?.overview()}>Zoom out</button>
      </h2>
      <div className="system3d" ref={box} />
      <div className="dim" style={{ marginTop: 8 }}>
        <b className="mine">●</b> yours · <b className="foe">●</b> enemy · grey = neutral. Drag to rotate, scroll to zoom, click a planet to fly to it.
        Distances are compressed and planets enlarged so everything fits; orbit order is real.
      </div>
    </div>
  );
}
