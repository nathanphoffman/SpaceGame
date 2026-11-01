import { SHIPS, type FleetDTO, type PlanetDTO, type ShipType, FLEET_STATUS, MISSION } from "@/lib/defs";
import { Cost, SHIP_TYPES, ShipList, fleetIcon, fmtTime } from "@/components/ui";

type Props = {
  planet: PlanetDTO; // the planet whose hangar is shown
  showHangar: boolean;
  fleets: FleetDTO[]; // active fleets
  planetName: (planetId: number) => string;
  nowMs: number;
  sendAction: (body: object) => Promise<void>;
};

const MAX_ICONS_PER_ROW = 300; // keep the page light if you build thousands
const HANGAR_ICON_PX = 22;

/** one row of the hangar: a label and an icon for each ship of one type */
function HangarRow({ type, count }: { type: ShipType; count: number }) {
  const ship = SHIPS[type];
  const shown = Math.min(count, MAX_ICONS_PER_ROW);

  return (
    <div className="hangar-row" title={`${count} × ${ship.name}`}>
      <div className="hangar-label">{ship.name} <b>×{count}</b></div>
      <div className="hangar-ships">
        {Array.from({ length: shown }, (_, index) => (
          <img key={`${type}-${index}`} src={ship.icon} style={{ width: HANGAR_ICON_PX * ship.size, height: HANGAR_ICON_PX * ship.size }} alt="" />
        ))}

        {count > shown && <span className="dim"> +{count - shown} more</span>}
      </div>
    </div>
  );
}

function Hangar({ planet }: { planet: PlanetDTO }) {
  const here = SHIP_TYPES.filter((type) => planet.ships[type] > 0);

  return (
    <div className="hangar">
      <div className="dim">Hangar — {planet.name}</div>
      {here.length === 0 && <div className="dim">No ships here.</div>}
      {here.map((type) => <HangarRow key={type} type={type} count={planet.ships[type]} />)}
    </div>
  );
}

/** what a fleet is doing: flying out, guarding, or flying home */
function statusText(fleet: FleetDTO, planetName: (id: number) => string) {
  if (fleet.status === FLEET_STATUS.outbound) return `${fleet.mission === MISSION.colonize ? "Colonizing" : "Attacking"} ${planetName(fleet.targetId)}`;

  if (fleet.status === FLEET_STATUS.stationed) return `Guarding ${planetName(fleet.targetId)}`;

  return `Returning to ${planetName(fleet.originId)}`;
}

function FleetRow({ fleet, planetName, now, act }: { fleet: FleetDTO; planetName: Props["planetName"]; now: number; act: Props["sendAction"] }) {
  const hasLoot = Object.values(fleet.loot).some((amount) => amount > 0);
  const arrival = fleet.status === FLEET_STATUS.outbound ? fleet.arriveAt : fleet.returnAt;

  return (
    <div className="row">
      <span className="icon"><img src={fleetIcon(fleet)} alt="" /></span>
      <div className="grow">
        {statusText(fleet, planetName)}
        <div className="sub"><ShipList ships={fleet.ships} />{hasLoot && <> · loot <Cost cost={fleet.loot} /></>}</div> {/* loot is shown only when at least one resource was taken */}
      </div>
      {fleet.status === FLEET_STATUS.stationed
        ? <button className="ghost" onClick={() => act({ action: "recall", fleetId: fleet.id })}>Recall</button>
        : <b>{fmtTime(arrival - now)}</b>}
    </div>
  );
}

/** ships sitting at the planet, plus every fleet that is flying or guarding somewhere */
export default function FleetsPanel({ planet, showHangar, fleets, planetName, nowMs: now, sendAction: act }: Props) {
  return (
    <div className="panel">
      <h2>Fleets</h2>
      {showHangar && <Hangar planet={planet} />}
      {fleets.length === 0 && <div className="dim">None.</div>}
      {fleets.map((fleet) => <FleetRow key={fleet.id} fleet={fleet} planetName={planetName} now={now} act={act} />)}
    </div>
  );
}
