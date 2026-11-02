import { EXOPLANETS } from "@/lib/data/exoplanets";
import { bodyRadius } from "@/lib/data/realBodies";
import { SOL_BODIES } from "@/lib/data/sol";
import { STARS } from "@/lib/data/stars";
import type { BodySpec, SystemSpec } from "@/lib/data/types";

/** bump this when the catalog changes: a stored game from an older version is wiped and re-seeded */
export const GALAXY_VERSION = "local-neighbourhood-3";

/** real bodies and stars get seeds from here up; generated planets use 1..99999 */
export const SEED_BASE = 1_000_000;

const DEGREES_TO_RADIANS = Math.PI / 180;
const MINUTES_PER_DEGREE = 60; // arc-minutes in a degree, and minutes in an hour of right ascension
const DEGREES_PER_HOUR = 15; // the sky turns 15 degrees per hour of right ascension
// the north galactic pole in J2000 equatorial coordinates (degrees)
const GALACTIC_POLE_RA = 192.85948;
const GALACTIC_POLE_DEC = 27.12825;
const GALACTIC_POLE_L = 122.93192;
const HUNDREDTHS = 100;

/** J2000 equatorial coordinates -> position in the galactic plane (light-years, Sol at the origin) */
function galacticXY(
	raHours: number,
	raMinutes: number,
	decD: number,
	decM: number,
	lightYears: number,
): [number, number] {
	const rightAscension =
		(raHours + raMinutes / MINUTES_PER_DEGREE) *
		DEGREES_PER_HOUR *
		DEGREES_TO_RADIANS;
	const declination =
		(decD < 0 ? -1 : 1) *
		(Math.abs(decD) + decM / MINUTES_PER_DEGREE) *
		DEGREES_TO_RADIANS;
	const pole = {
		ra: GALACTIC_POLE_RA * DEGREES_TO_RADIANS,
		dec: GALACTIC_POLE_DEC * DEGREES_TO_RADIANS,
		l: GALACTIC_POLE_L * DEGREES_TO_RADIANS,
	};

	const latitude = Math.asin(
		Math.sin(declination) * Math.sin(pole.dec) +
			Math.cos(declination) *
				Math.cos(pole.dec) *
				Math.cos(rightAscension - pole.ra),
	);

	const longitude =
		pole.l -
		Math.atan2(
			Math.cos(declination) * Math.sin(rightAscension - pole.ra),
			Math.sin(declination) * Math.cos(pole.dec) -
				Math.cos(declination) *
					Math.sin(pole.dec) *
					Math.cos(rightAscension - pole.ra),
		);

	return [
		lightYears * Math.cos(latitude) * Math.cos(longitude),
		lightYears * Math.cos(latitude) * Math.sin(longitude),
	];
}

export const SYSTEMS: SystemSpec[] = STARS.map(
	([name, raH, raM, decD, decM, ly, spec, tempK, radius], index) => {
		// build one system per catalogue star, attaching the planets known for that star
		const id = index + 1;
		const [x, y] = galacticXY(raH, raM, decD, decM, ly);
		const bodies: BodySpec[] = [];

		const add = (b: Omit<BodySpec, "id" | "seed" | "radius">) => {
			const n = bodies.length + 1;
			bodies.push({
				...b,
				radius: bodyRadius(b.kind, b.diameterKm),
				id: id * 100 + n,
				seed: SEED_BASE + id * 100 + n,
			});
		};

		if (name === "Sol") for (const b of SOL_BODIES) add(b);

		for (const [
			star,
			pName,
			orbit,
			kind,
			diameterKm,
			candidate,
		] of EXOPLANETS) {
			if (star === name)
				add({
					name: pName,
					orbit,
					kind,
					diameterKm,
					note: candidate
						? "Candidate exoplanet (not yet confirmed)"
						: "Confirmed exoplanet",
				});
		}

		return {
			id,
			seed: SEED_BASE + id,
			name,
			spec,
			tempK,
			radius,
			x: Math.round(x * HUNDREDTHS) / HUNDREDTHS,
			y: Math.round(y * HUNDREDTHS) / HUNDREDTHS,
			ly,
			bodies,
			complete: name === "Sol",
		};
	},
);

export const BODY_BY_SEED = new Map(
	SYSTEMS.flatMap((system) => system.bodies).map((body) => [body.seed, body]),
);

export const STAR_BY_SEED = new Map(SYSTEMS.map((s) => [s.seed, s]));

/** one line for the planet panel: where this world's data comes from */
export const bodyNote = (seed: number) =>
	BODY_BY_SEED.get(seed)?.note ?? "Undiscovered: generated to fill the gaps";
