import { useState } from "react";
import { SHIPS, flightSeconds, type GameState, type PlanetDTO } from "@/lib/defs";
import { SHIP_TYPES, fmtTime } from "./ui";

type Props = {
  game: GameState;
  planet: PlanetDTO; // where the ships leave from
  target: PlanetDTO | null;
  act: (body: object) => Promise<void>;
  onSent: () => void;
};

/** pick ships at the current planet and send them to the targeted planet */
export default function FleetSend({ game, planet, target, act, onSent }: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  return (
    <div className="panel">
      <h2>Fleet {target ? `→ ${target.name}` : ""}</h2>
      {!target ? (
        <div className="dim">Click an enemy or empty planet on the solar map to send ships.</div>
      ) : (
        <>
          <div className="dim" style={{ marginBottom: 6 }}>
            {target.kind === "npc"
              ? `Attack · enemy defense ${target.defense} · survivors guard the planet`
              : (qty.colony_ship ?? 0) > 0 ? "Colonize" : "Guard · add a Colony Ship to settle it"}
            {" · "}flight {fmtTime(flightSeconds(planet, target, game.systems) * 1000)} each way
          </div>
          {SHIP_TYPES.map((t) => (
            <div className="row" key={t}>
              <span className="icon"><img src={SHIPS[t].icon} alt="" /></span>
              <span className="grow">{SHIPS[t].name} <span className="sub">({planet.ships[t] ?? 0} available)</span></span>
              <input type="number" min={0} max={planet.ships[t] ?? 0} value={qty[t] ?? 0}
                onChange={(e) => setQty({ ...qty, [t]: Number(e.target.value) })} />
            </div>
          ))}
          <button style={{ marginTop: 8 }} onClick={async () => {
            await act({ action: "send", originId: planet.id, targetId: target.id, ships: qty });
            setQty({});
            onSent();
          }}>
            Send fleet
          </button>
        </>
      )}
    </div>
  );
}
