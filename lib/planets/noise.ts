// Seeded random numbers and smooth noise: the same seed always gives the same numbers.

// mulberry32 constants (a small, fast generator): an odd step plus three mixing multipliers and shifts
const MULBERRY_STEP = 0x6d2b79f5;
const MULBERRY_SHIFT_A = 15;
const MULBERRY_SHIFT_B = 7;
const MULBERRY_SHIFT_C = 14;
const MULBERRY_OR_A = 1;
const MULBERRY_OR_B = 61;
const UINT32_RANGE = 4294967296; // 2^32: dividing a 32-bit unsigned number by this gives 0 up to (not including) 1
const UINT32_MAX = 4294967295;

// value-noise hashing: one large odd multiplier per input, then two scrambling steps
const HASH_X = 374761393;
const HASH_Y = 668265263;
const HASH_Z = 2147483647;
const HASH_SEED = 1274126177;
const HASH_SHIFT_A = 13;
const HASH_SHIFT_B = 16;
const CORNERS = 8; // a cube has eight corners
const OCTAVE_SEED_STEP = 101; // each octave of fractal noise uses its own seed
const DEFAULT_OCTAVES = 5;
const CONTRAST = 1.7;
const HALF = 0.5;
const SMOOTHSTEP = { cubic: 3, quadratic: 2 }; // 3t^2 - 2t^3 eases a 0..1 fraction so the blend has no visible grid lines
const CORNER = {
	first: 1,
	second: 2,
	third: 3,
	fourth: 4,
	fifth: 5,
	sixth: 6,
	seventh: 7,
}; // positions of the eight cube corners

export function mulberry32(seed: number) {
	// force the seed into an unsigned 32-bit number (>>> 0)
	let state = seed >>> 0;

	return () => {
		// step the generator state forward by a fixed odd constant, staying in 32 bits
		state = (state + MULBERRY_STEP) >>> 0;
		let mixed = state;

		// scramble the bits (xor and shift) so nearby seeds give unrelated numbers
		mixed = Math.imul(
			mixed ^ (mixed >>> MULBERRY_SHIFT_A), // bit mixing for a well-spread hash
			mixed | MULBERRY_OR_A,
		);

		// mix once more; Math.imul is a 32-bit integer multiply
		mixed ^=
			mixed +
			Math.imul(mixed ^ (mixed >>> MULBERRY_SHIFT_B), mixed | MULBERRY_OR_B); // bit mixing for a well-spread hash

		// final scramble, then divide by 2^32 to get a number from 0 up to (not including) 1
		return ((mixed ^ (mixed >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32_RANGE;
	};
}

// ---- value noise ----

/** smooth 3D value noise: random values at whole-number points, blended between them (all inline so it stays a leaf function) */
export function noise3(
	coordX: number,
	coordY: number,
	coordZ: number,
	seed: number,
) {
	const cellX = Math.floor(coordX),
		cellY = Math.floor(coordY),
		cellZ = Math.floor(coordZ);
	const fade = [coordX - cellX, coordY - cellY, coordZ - cellZ].map(
		(fraction) =>
			fraction *
			fraction *
			(SMOOTHSTEP.cubic - SMOOTHSTEP.quadratic * fraction),
	); // ease each fraction so the blend has no visible grid lines

	const corners: number[] = [];

	for (let corner = 0; corner < CORNERS; corner++) {
		// mix the corner's coordinates and the seed: multiply each by a large odd number and combine them with xor
		let hash =
			Math.imul(cellX + (corner & 1), HASH_X) ^ // x cell and corner bit
			Math.imul(cellY + ((corner >> 1) & 1), HASH_Y) ^ // y cell and corner bit
			Math.imul(cellZ + (corner >> 2), HASH_Z) ^ // z cell and corner bit
			Math.imul(seed, HASH_SEED);
		hash = Math.imul(hash ^ (hash >>> HASH_SHIFT_A), HASH_SEED); // scramble the bits again so close inputs give unrelated outputs
		hash ^= hash >>> HASH_SHIFT_B; // fold the high bits into the low bits
		corners.push((hash >>> 0) / UINT32_MAX); // make it unsigned and scale to 0..1
	}

	const [fadeX, fadeY, fadeZ] = fade;

	// blend neighbouring corners along x, then y, then z (each step is low + (high - low) * t)
	const lowLow = corners[0] + (corners[CORNER.first] - corners[0]) * fadeX,
		highLow =
			corners[CORNER.second] +
			(corners[CORNER.third] - corners[CORNER.second]) * fadeX;
	const lowHigh =
			corners[CORNER.fourth] +
			(corners[CORNER.fifth] - corners[CORNER.fourth]) * fadeX,
		highHigh =
			corners[CORNER.sixth] +
			(corners[CORNER.seventh] - corners[CORNER.sixth]) * fadeX;
	const near = lowLow + (highLow - lowLow) * fadeY,
		far = lowHigh + (highHigh - lowHigh) * fadeY;

	return near + (far - near) * fadeZ;
}

/** fractal noise, roughly 0..1 with contrast boosted around 0.5 */
export function fbm(
	coordX: number,
	coordY: number,
	coordZ: number,
	seed: number,
	octaves = DEFAULT_OCTAVES,
) {
	let total = 0,
		amplitude = HALF,
		norm = 0,
		frequency = 1;

	for (let octave = 0; octave < octaves; octave++) {
		total +=
			amplitude *
			noise3(
				coordX * frequency,
				coordY * frequency,
				coordZ * frequency,
				seed + octave * OCTAVE_SEED_STEP,
			);

		norm += amplitude;
		amplitude *= HALF;
		frequency *= 2;
	}

	return Math.min(1, Math.max(0, (total / norm - HALF) * CONTRAST + HALF));
}
