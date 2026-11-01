import { useState } from "react";
import { MS_PER_SECOND, SHIPS, flightSeconds, type GameState, type PlanetDTO, type ShipType } from "@/lib/defs";
import { SHIP_TYPES, fmtTime } from "@/components/ui";

type Props = {
  game: GameState;
  planet: PlanetDTO; // where the ships leave from
  target: PlanetDTO | null;
  sendAction: (body: object) => Promise<void>;
  onSent: () => void;
};

type Quantities = Record<string, number>;

/** what sending these ships would do: attack an enemy, colonise if a colony ship is along, otherwise just guard */
function missionText(target: PlanetDTO, quantities: Quantities) {
  if (target.kind === "npc") return `Attack · enemy defense ${target.defense} · survivors guard the planet`;

  return (quantities.colony_ship ?? 0) > 0 ? "Colonize" : "Guard · add a Colony Ship to settle it";
}

function ShipRow({ type, available, value, onChange }: { type: ShipType; available: number; value: number; onChange: (value: number) => void }) {
  return (
    <div className="row">
      <span className="icon"><img src={SHIPS[type].icon} alt="" /></span>
      <span className="grow">{SHIPS[type].name} <span className="sub">({available} available)</span></span>
      <input type="number" min={0} max={available} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

/** pick ships at the current planet and send them to the targeted planet */
export default function FleetSend({ game, planet, target, sendAction: act, onSent }: Props) {
  const [quantities, setQuantities] = useState<Quantities>({});

  const send = async () => {
    await act({ action: "send", originId: planet.id, targetId: target!.id, ships: quantities });
    setQuantities({});
    onSent();
  };

  return (
    <div className="panel">
      <h2>Fleet {target ? `→ ${target.name}` : ""}</h2>
      {!target && <div className="dim">Click an enemy or empty planet on the solar map to send ships.</div>}
      {target && (
        <>
          <div className="dim" style={{ marginBottom: 6 }}>
            {missionText(target, quantities)}
            {" · "}flight {fmtTime(flightSeconds(planet, target, game.systems) * MS_PER_SECOND)} each way
          </div>
          {SHIP_TYPES.map((type) => ( // one row per ship type for choosing how many to send
            <ShipRow key={type} type={type} available={planet.ships[type] ?? 0} value={quantities[type] ?? 0} onChange={(value) => setQuantities({ ...quantities, [type]: value })} />
          ))}

          <button style={{ marginTop: 8 }} onClick={send}>Send fleet</button>
        </>
      )}

    </div>
  );
}
