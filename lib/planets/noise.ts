// Seeded random numbers and smooth noise: the same seed always gives the same numbers.

export function mulberry32(seed: number) {
  // force the seed into an unsigned 32-bit number (>>> 0)
  let a = seed >>> 0;

  return () => {
    // step the generator state forward by a fixed odd constant, staying in 32 bits
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    // scramble the bits (xor and shift) so nearby seeds give unrelated numbers
    t = Math.imul(t ^ (t >>> 15), t | 1);

    // mix once more; Math.imul is a 32-bit integer multiply
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    // final scramble, then divide by 2^32 to get a number from 0 up to (not including) 1
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- value noise ----

/** smooth 3D value noise: random values at whole-number points, blended between them (all inline so it stays a leaf function) */
export function noise3(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fade = [x - xi, y - yi, z - zi].map((t) => t * t * (3 - 2 * t)); // ease each fraction so the blend has no visible grid lines
  const corners: number[] = [];

  for (let corner = 0; corner < 8; corner++) {
    // mix the corner's coordinates and the seed: multiply each by a large odd number and combine them with xor
    let h = Math.imul(xi + (corner & 1), 374761393) ^ Math.imul(yi + ((corner >> 1) & 1), 668265263) ^ Math.imul(zi + (corner >> 2), 2147483647) ^ Math.imul(s, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177); // scramble the bits again so close inputs give unrelated outputs
    h ^= h >>> 16; // fold the high bits into the low bits
    corners.push((h >>> 0) / 4294967295); // make it unsigned and scale to 0..1
  }

  const [u, v, w] = fade;

  // blend neighbouring corners along x, then y, then z (each step is low + (high - low) * t)
  const x00 = corners[0] + (corners[1] - corners[0]) * u, x10 = corners[2] + (corners[3] - corners[2]) * u;
  const x01 = corners[4] + (corners[5] - corners[4]) * u, x11 = corners[6] + (corners[7] - corners[6]) * u;
  const near = x00 + (x10 - x00) * v, far = x01 + (x11 - x01) * v;

  return near + (far - near) * w;
}

/** fractal noise, roughly 0..1 with contrast boosted around 0.5 */
export function fbm(x: number, y: number, z: number, s: number, octaves = 5) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;

  for (let index = 0; index < octaves; index++) {
    sum += amp * noise3(x * f, y * f, z * f, s + index * 101);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }

  return Math.min(1, Math.max(0, ((sum / norm) - 0.5) * 1.7 + 0.5));
}
