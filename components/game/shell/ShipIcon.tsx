import type { FleetDTO } from "@/lib/defs";

// Simple ship symbols, all drawn pointing up so the maps can turn them toward where the fleet is flying.
const SHAPES: Record<string, string> = {
	Fighter: "M12 2 L16 22 L8 22 Z", // small narrow triangle
	Hauler: "M9 2 H15 V22 H9 Z", // long rectangle
	Colony: "M6 6 H18 V18 H6 Z", // square
	Battleship: "M12 0.5 L17 12 L12 23.5 L7 12 Z", // long diamond
	Dreadnought: "M12 1.5 L21 6.75 V17.25 L12 22.5 L3 17.25 V6.75 Z", // hexagon
	Scout: "M12 8 A4 4 0 1 1 11.99 8 Z", // a small dot
};

// The biggest ship in a fleet is the one drawn for it.
const BIGGEST_FIRST = ["Dreadnought", "Battleship", "Colony", "Hauler", "Fighter", "Scout"];

/** The ship type that stands for a whole fleet on the map. */
export function leadShip(ships: Record<string, number>): string {
	return BIGGEST_FIRST.find((name) => (ships[name] ?? 0) > 0) ?? "Fighter";
}

/** The symbol of one ship type: a triangle, rectangle, square, diamond or hexagon. Coloured with the surrounding text colour. */
export function ShipIcon({ ship, size = 20 }: { ship: string; size?: number }) {
	return (
		<svg className="ship-icon" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={ship}>
			<path d={SHAPES[ship] ?? SHAPES.Fighter} fill="currentColor" fillOpacity="0.85" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
		</svg>
	);
}

/** The symbol for a fleet on the map: its biggest ship, filling its box. */
export function FleetSymbol({ fleet }: { fleet: FleetDTO }) {
	return <ShipIcon ship={leadShip(fleet.ships)} size={26} />;
}
