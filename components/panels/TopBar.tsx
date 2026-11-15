import { Icon } from "@/components/ui";
import {
	ELEMENT_ORDER,
	ELEMENTS,
	type PlanetDTO,
	type Resources,
} from "@/lib/defs";

type Props = {
	planets: PlanetDTO[]; // your planets
	current: PlanetDTO;
	stock: (symbol: string) => number;
	rate: Resources;
	onSelect: (planetId: number) => void;
	onReset: () => void;
};

export default function TopBar({
	planets,
	current,
	stock,
	rate,
	onSelect,
	onReset,
}: Props) {
	return (
		<div className="topbar">
			<h1>Space Game</h1>
			<div className="tabs">
				{/* map: one tab button per base you own */}
				{planets.map(
					(
						planet, // one tab per base you own
					) => ( // one tab button per base

						<button
							key={planet.id}
							className={planet.id === current.id ? "on" : ""}
							onClick={() => onSelect(planet.id)}
						>
							<Icon src="/icons/planets/planet_player.svg" /> {planet.name}
						</button>
					),
				)}

			</div>
			<div className="spacer" />
			{ELEMENT_ORDER.map((el) => (
				<div
					key={el}
					className={`res ${ELEMENTS[el].rare ? "rare" : ""}`}
					title={`${ELEMENTS[el].name}${ELEMENTS[el].rare ? " (rare)" : ""}`}
				>
					<b style={{ color: ELEMENTS[el].color }}>{el}</b>{" "}
					<span>{Math.floor(stock(el))}</span>
					{/* The "&&" renders the income label only when the rate is above zero. */}
					{/* income per second, shown only when above zero */ rate[el] > 0 && <small>+{rate[el].toFixed(1)}/s</small>}{" "}
					{/* only show the income when this element is produced at all */}
				</div>
			))}

			<button className="ghost" onClick={onReset}>
				Reset
			</button>
		</div>
	);
}
