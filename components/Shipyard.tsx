import { useState } from "react";
import { SHIPS, shipSeconds, type PlanetDTO, type QueueDTO, type Res, type ShipType } from "@/lib/defs";
import { Cost, SHIP_TYPES, fmtTime } from "./ui";

type Props = {
  show: boolean; // hidden (but still mounted, so quantities are remembered) when viewing a planet that isn't yours
  planet: PlanetDTO;
  queue: QueueDTO[]; // ship queue for this planet
  now: number;
  shortfall: (cost: Res) => string | undefined;
  act: (body: object) => Promise<void>;
};

export default function Shipyard({ show, planet, queue, now, shortfall, act }: Props) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [infoShip, setInfoShip] = useState<ShipType | null>(null); // ship whose description is open
  if (!show) return null;
  const level = planet.buildings.shipyard ?? 0;
  const info = infoShip && SHIPS[infoShip];
  return (
    <div className="panel">
      <h2>Shipyard {level ? `(Lv ${level})` : ""}</h2>
      {!level && <div className="dim">Build a shipyard to start building ships.</div>}
      {info && (
        <div className="ship-info">
          <span className="icon-box"><img src={info.icon} style={{ width: 36 * info.size, height: 36 * info.size }} alt="" /></span>
          <div className="grow">
            <b>{info.name}</b>
            <div>{info.desc}</div>
            <div className="sub">Atk {info.attack} · Cargo {info.cargo} · Speed {info.speed}/10 · Health {info.health}/10</div>
          </div>
          <button className="ghost" onClick={() => setInfoShip(null)}>Close</button>
        </div>
      )}
      <div className="tiles">
        {SHIP_TYPES.map((t) => {
          const s = SHIPS[t];
          const qty = qtys[t] ?? 1;
          const inQueue = queue.filter((x) => x.type === t);
          const why = !level
            ? "Build a Shipyard first"
            : !(qty >= 1 && qty <= 20)
              ? "Quantity must be between 1 and 20"
              : shortfall(Object.fromEntries(Object.entries(s.cost).map(([el, n]) => [el, n * qty])));
          return (
            <div className="tile" key={t}>
              <button className="ship-link" title="Click for details" onClick={() => setInfoShip(infoShip === t ? null : t)}>
                <span className="tile-icon-box"><img className="tile-icon" style={{ width: 36 * s.size, height: 36 * s.size }} src={s.icon} alt="" /></span>
                <b>{s.name}</b>
              </button>
              <span className="dim">×{planet.ships[t] ?? 0} · Atk {s.attack} · Cargo {s.cargo}</span>
              <div className="sub"><Cost cost={s.cost} /></div>
              <div className="sub">{fmtTime(shipSeconds(t, level) * 1000)} each</div>
              {inQueue[0] && <div className="sub good">+{inQueue.length} · next {fmtTime(inQueue[0].finishAt - now)}</div>}
              <div className="tile-actions">
                <input type="number" min={1} max={20} value={qty} onChange={(e) => setQtys({ ...qtys, [t]: Number(e.target.value) })} />
                <button disabled={!!why} title={why} onClick={() => act({ action: "ship", planetId: planet.id, type: t, qty })}>Build</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
