import { ELEMENTS, ELEMENT_ORDER, type PlanetDTO, type Res } from "@/lib/defs";
import { Ico } from "./ui";

type Props = {
  planets: PlanetDTO[]; // your planets
  current: PlanetDTO;
  stock: (el: string) => number;
  rate: Res;
  onSelect: (id: number) => void;
  onReset: () => void;
};

export default function TopBar({ planets, current, stock, rate, onSelect, onReset }: Props) {
  return (
    <div className="topbar">
      <h1>Space Game</h1>
      <div className="tabs">
        {planets.map((p) => (
          <button key={p.id} className={p.id === current.id ? "on" : ""} onClick={() => onSelect(p.id)}>
            <Ico src="/icons/planet_player.svg" /> {p.name}
          </button>
        ))}
      </div>
      <div className="spacer" />
      {ELEMENT_ORDER.map((el) => (
        <div key={el} className={`res ${ELEMENTS[el].rare ? "rare" : ""}`} title={`${ELEMENTS[el].name}${ELEMENTS[el].rare ? " (rare)" : ""}`}>
          <b style={{ color: ELEMENTS[el].color }}>{el}</b> <span>{Math.floor(stock(el))}</span>
          {rate[el] > 0 && <small>+{rate[el].toFixed(1)}/s</small>}
        </div>
      ))}
      <button className="ghost" onClick={onReset}>Reset</button>
    </div>
  );
}
