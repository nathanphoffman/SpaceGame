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
          {here.map((t) => { // one row per ship type waiting at this planet
            const n = planet.ships[t];
            const shown = Math.min(n, 300); // keep the page light if you build thousands

            return (
              <div className="hangar-row" key={t} title={`${n} × ${SHIPS[t].name}`}>
                <div className="hangar-label">{SHIPS[t].name} <b>×{n}</b></div>
                <div className="hangar-ships">
                  {Array.from({ length: shown }, (_, index) => (
                    <img key={`${t}-${index}`} src={SHIPS[t].icon} style={{ width: 22 * SHIPS[t].size, height: 22 * SHIPS[t].size }} alt="" />
                  ))}

                  {n > shown && <span className="dim"> +{n - shown} more</span>}
                </div>
              </div>
            );
          })}

        </div>
      )}

      {fleets.length === 0 && <div className="dim">None.</div>}
      {fleets.map((fleet) => ( // one row per fleet in the air or on guard
        <div className="row" key={fleet.id}>
          <span className="icon"><img src={fleetIcon(fleet)} alt="" /></span>
          <div className="grow">
            {fleet.status === "outbound" ? `${fleet.mission === "colonize" ? "Colonizing" : "Attacking"} ${planetName(fleet.targetId)}`
              : fleet.status === "stationed" ? `Guarding ${planetName(fleet.targetId)}` // status text for a fleet: flying out, guarding, or flying home
              : `Returning to ${planetName(fleet.originId)}`}
            <div className="sub"><ShipList ships={fleet.ships} />{Object.values(fleet.loot).some((n) => n > 0) && <> · loot <Cost cost={fleet.loot} /></>}</div> {/* show loot only when at least one resource was taken */}
          </div>
          {fleet.status === "stationed"
            ? <button className="ghost" onClick={() => act({ action: "recall", fleetId: fleet.id })}>Recall</button>
            : <b>{fmtTime((fleet.status === "outbound" ? fleet.arriveAt : fleet.returnAt) - now)}</b>}
        </div>
      ))}

    </div>
  );
}
