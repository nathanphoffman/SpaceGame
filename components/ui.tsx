import { MID_ORBIT_AU, TIGHT_ORBIT_AU } from "@/lib/constants";

/** orbit distance: more decimals for the tight orbits of red-dwarf planets */
const AU_DECIMALS = [
	[TIGHT_ORBIT_AU, 3],
	[MID_ORBIT_AU, 2],
]; // [orbit below this, decimals shown]; further out one decimal is enough

const FAR_AU_DECIMALS = 1;

export const fmtAU = (distanceAU: number) =>
	`${distanceAU.toFixed(AU_DECIMALS.find(([limit]) => distanceAU < limit)?.[1] ?? FAR_AU_DECIMALS)} AU`;
