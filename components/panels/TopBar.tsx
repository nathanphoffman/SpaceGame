import { ELEMENTS, ELEMENT_ORDER, type PlanetDTO, type Res } from "@/lib/defs";
import { Ico } from "@/components/ui";

type Props = {
  planets: PlanetDTO[]; // your planets
  current: PlanetDTO;
  stock: (symbol: string) => number;
  rate: Res;
  onSelect: (id: number) => void;
  onReset: () => void;
};

export default function TopBar({ planets, current, stock, rate, onSelect, onReset }: Props) {
  return (
    <div className="topbar">
      <h1>Space Game</h1>
      <div className="tabs">
        {planets.map((planet) => ( // one tab per base you own
          <button key={planet.id} className={planet.id === current.id ? "on" : ""} onClick={() => onSelect(planet.id)}>
            <Ico src="/icons/planets/planet_player.svg" /> {planet.name}
          </button>
        ))}

      </div>
      <div className="spacer" />
      {ELEMENT_ORDER.map((el) => (
        <div key={el} className={`res ${ELEMENTS[el].rare ? "rare" : ""}`} title={`${ELEMENTS[el].name}${ELEMENTS[el].rare ? " (rare)" : ""}`}>
          <b style={{ color: ELEMENTS[el].color }}>{el}</b> <span>{Math.floor(stock(el))}</span>
          {rate[el] > 0 && <small>+{rate[el].toFixed(1)}/s</small>} {/* only show the income when this element is produced at all */}
        </div>
      ))}

      <button className="ghost" onClick={onReset}>Reset</button>
    </div>
  );
}
