import { useState } from "react";
import { MS_PER_SECOND, SHIPS, shipSeconds, type PlanetDTO, type QueueDTO, type Res, type ShipType, ACTION } from "@/lib/defs";
import { Cost, SHIP_TYPES, fmtTime } from "@/components/ui";

type Props = {
  show: boolean; // hidden (but still mounted, so quantities are remembered) when viewing a planet that isn't yours
  planet: PlanetDTO;
  queue: QueueDTO[]; // ship queue for this planet
  nowMs: number;
  shortfall: (cost: Res) => string | undefined;
  sendAction: (body: object) => Promise<void>;
};

const MIN_BATCH = 1;
const MAX_BATCH = 20;
const ICON_PX = 36;

type Ship = (typeof SHIPS)[ShipType];

/** the open description card for one ship: what it is good at and its stats */
function ShipInfo({ ship, onClose }: { ship: Ship; onClose: () => void }) {
  return (
    <div className="ship-info">
      <span className="icon-box"><img src={ship.icon} style={{ width: ICON_PX * ship.size, height: ICON_PX * ship.size }} alt="" /></span>
      <div className="grow">
        <b>{ship.name}</b>
        <div>{ship.desc}</div>
        <div className="sub">Atk {ship.attack} · Cargo {ship.cargo} · Speed {ship.speed}/10 · Health {ship.health}/10</div> {/* ship stats */}
      </div>
      <button className="ghost" onClick={onClose}>Close</button>
    </div>
  );
}

/** why the build button is disabled (undefined = it can be pressed) */
function buildBlocker(ship: Ship, level: number, quantity: number, shortfall: Props["shortfall"]) {
  if (!level) return "Build a Shipyard first";

  if (!(quantity >= MIN_BATCH && quantity <= MAX_BATCH)) return `Quantity must be between ${MIN_BATCH} and ${MAX_BATCH}`;

  return shortfall(Object.fromEntries(Object.entries(ship.cost).map(([element, amount]) => [element, amount * quantity])));
}

type TileProps = { type: ShipType; props: Props; level: number; quantity: number; onQuantity: (value: number) => void; onInfo: () => void };

function ShipTile({ type, props, level, quantity, onQuantity, onInfo }: TileProps) {
  const ship = SHIPS[type];
  const queued = props.queue.filter((item) => item.type === type);
  const why = buildBlocker(ship, level, quantity, props.shortfall);

  return (
    <div className="tile">
      <button className="ship-link" title="Click for details" onClick={onInfo}>
        <span className="tile-icon-box"><img className="tile-icon" style={{ width: ICON_PX * ship.size, height: ICON_PX * ship.size }} src={ship.icon} alt="" /></span>
        <b>{ship.name}</b>
      </button>
      <span className="dim">×{props.planet.ships[type] ?? 0} · Atk {ship.attack} · Cargo {ship.cargo}</span>
      <div className="sub"><Cost cost={ship.cost} /></div> {/* price of one ship */}
      <div className="sub">{fmtTime(shipSeconds(type, level) * MS_PER_SECOND)} each</div>
      {queued[0] && <div className="sub good">+{queued.length} · next {fmtTime(queued[0].finishAt - props.nowMs)}</div>}
      <div className="tile-actions">
        <input type="number" min={MIN_BATCH} max={MAX_BATCH} value={quantity} onChange={(event) => onQuantity(Number(event.target.value))} />
        <button disabled={!!why} title={why} onClick={() => props.sendAction({ action: ACTION.ship, planetId: props.planet.id, type, qty: quantity })}>Build</button>
      </div>
    </div>
  );
}

export default function Shipyard(props: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [infoShip, setInfoShip] = useState<ShipType | null>(null); // ship whose description is open

  if (!props.show) return null;

  const level = props.planet.buildings.shipyard ?? 0;

  return (
    <div className="panel">
      <h2>Shipyard {level ? `(Lv ${level})` : ""}</h2>
      {!level && <div className="dim">Build a shipyard to start building ships.</div>}
      {infoShip && <ShipInfo ship={SHIPS[infoShip]} onClose={() => setInfoShip(null)} />}
      <div className="tiles">
        {SHIP_TYPES.map((type) => ( // one tile per ship type
          <ShipTile key={type} type={type} props={props} level={level} quantity={quantities[type] ?? 1}
            onQuantity={(value) => setQuantities({ ...quantities, [type]: value })} onInfo={() => setInfoShip(infoShip === type ? null : type)} />
        ))}

      </div>
    </div>
  );
}
