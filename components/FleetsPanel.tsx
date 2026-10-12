import { SHIPS, type FleetDTO, type PlanetDTO } from "@/lib/defs";
import { Cost, SHIP_TYPES, ShipList, fleetIcon, fmtTime } from "./ui";

type Props = {
  planet: PlanetDTO; // the planet whose hangar is shown
  showHangar: boolean;
  fleets: FleetDTO[]; // active fleets
  planetName: (id: number) => string;
  now: number;
  act: (body: object) => Promise<void>;
};

/** ships sitting at the planet, plus every fleet that is flying or guarding somewhere */
export default function FleetsPanel({ planet, showHangar, fleets, planetName, now, act }: Props) {
  const here = SHIP_TYPES.filter((t) => planet.ships[t] > 0);
  return (
    <div className="panel">
      <h2>Fleets</h2>
      {showHangar && (
        <div className="hangar">
          <div className="dim">Hangar — {planet.name}</div>
          {here.length === 0 && <div className="dim">No ships here.</div>}
          {here.map((t) => {
            const n = planet.ships[t];
            const shown = Math.min(n, 300); // keep the page light if you build thousands
            return (
              <div className="hangar-row" key={t} title={`${n} × ${SHIPS[t].name}`}>
                <div className="hangar-label">{SHIPS[t].name} <b>×{n}</b></div>
                <div className="hangar-ships">
                  {Array.from({ length: shown }, (_, i) => (
                    <img key={i} src={SHIPS[t].icon} style={{ width: 22 * SHIPS[t].size, height: 22 * SHIPS[t].size }} alt="" />
                  ))}
                  {n > shown && <span className="dim"> +{n - shown} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {fleets.length === 0 && <div className="dim">None.</div>}
      {fleets.map((f) => (
        <div className="row" key={f.id}>
          <span className="icon"><img src={fleetIcon(f)} alt="" /></span>
          <div className="grow">
            {f.status === "outbound" ? `${f.mission === "colonize" ? "Colonizing" : "Attacking"} ${planetName(f.targetId)}`
              : f.status === "stationed" ? `Guarding ${planetName(f.targetId)}`
              : `Returning to ${planetName(f.originId)}`}
            <div className="sub"><ShipList ships={f.ships} />{Object.values(f.loot).some((n) => n > 0) && <> · loot <Cost cost={f.loot} /></>}</div>
          </div>
          {f.status === "stationed"
            ? <button className="ghost" onClick={() => act({ action: "recall", fleetId: f.id })}>Recall</button>
            : <b>{fmtTime((f.status === "outbound" ? f.arriveAt : f.returnAt) - now)}</b>}
        </div>
      ))}
    </div>
  );
}
