// A hammer for the shipyard, a shield for defense and a pickaxe for mining; all take the surrounding text colour.
const SHIELD = "M12 2 L21 5.5 V11.5 C21 16.8 17.4 20.7 12 22.5 C6.6 20.7 3 16.8 3 11.5 V5.5 Z";
const HAMMER_HEAD = "M3 6 L12 3 L16.5 6.5 L14.5 9 L12.5 7.8 L3 10.5 Z";
const PICK_HEAD = "M3 11 C5 5 11 2.5 17 3.5 L16 5.5 C12 5.5 8 7.5 5.5 12 Z";
const PICK_HANDLE = "M10.2 8.6 L19.8 20.4 L17.8 22 L8.2 10.2 Z";
const HAMMER_HANDLE = "M12.8 8.2 L20.6 19.3 L18.4 20.9 L10.6 9.8 Z";

/** Icon for a building button: "Defense" draws a shield, "Mining" a pickaxe, "Shipyard" a hammer. */
export function BuildingIcon({ building, size = 20 }: { building: string; size?: number }) {
	const paths = { Defense: [SHIELD], Mining: [PICK_HEAD, PICK_HANDLE] }[building] ?? [HAMMER_HEAD, HAMMER_HANDLE];

	return (
		<svg className="ship-icon" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={building}>
			{paths.map((path) => (
				<path key={path} d={path} fill="currentColor" fillOpacity="0.85" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
			))}
		</svg>
	);
}
