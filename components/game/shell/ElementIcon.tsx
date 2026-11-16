// Bohr-model atoms: the electron count per shell is the real one for each element (Helium-3 has the same two electrons as any helium).
const SHELLS: Record<string, number[]> = {
	Hydrogen: [1],
	Helium3: [2],
	Titanium: [2, 8, 10, 2],
	Iron: [2, 8, 14, 2],
};

const COLORS: Record<string, string> = {
	Hydrogen: "#7fd4ff",
	Helium3: "#ffd36b",
	Titanium: "#ff7ac8",
	Iron: "#b4502c",
};

const SIZE = 32;
const CENTER = SIZE / 2;
const FIRST_SHELL_RADIUS = 5.5;
const SHELL_GAP = 3.1;
const FULL_TURN = Math.PI * 2;
const NUCLEUS_RADIUS = 2.4;
const ELECTRON_RADIUS = 1.1;

/** Dots spread evenly around one shell, with an angle offset so the shells don't line up. */
function electronsOf(count: number, radius: number, shell: number) {
	return Array.from({ length: count }, (_, index) => {
		const angle = (index / count) * FULL_TURN + shell;

		return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
	});
}

/** A small atom picture for an element: a glowing nucleus, its electron shells and its electrons. */
export function ElementIcon({ element, size = SIZE }: { element: string; size?: number }) {
	const shells = SHELLS[element] ?? [1];
	const color = COLORS[element] ?? "#ffffff";

	return (
		<svg className="element-icon" width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={element}>
			{shells.map((count, shell) => {
				const radius = FIRST_SHELL_RADIUS + shell * SHELL_GAP;

				return (
					<g key={radius}>
						<circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="0.6" />
						{electronsOf(count, radius, shell).map((dot) => (
							<circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={ELECTRON_RADIUS} fill={color} />
						))}
					</g>
				);
			})}
			<circle cx={CENTER} cy={CENTER} r={NUCLEUS_RADIUS} fill={color} style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
		</svg>
	);
}
