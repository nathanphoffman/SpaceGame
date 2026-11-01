import * as THREE from "three";

let tex: THREE.CanvasTexture | null = null;

const TEXTURE_SIZE = 128;
const GLOW_STOPS: [number, number][] = [[0, 1], [0.15, 0.85], [0.4, 0.25], [1, 0]]; // [distance from centre 0..1, opacity]
const COORDS_PER_POINT = 3;
const BACKDROP_STARS = 1800;
const BACKDROP_COLOR = 0x9fb0d8;
const BACKDROP_POINT_PX = 1.6;
const BACKDROP_OPACITY = 0.55;

/** soft round glow, shared by every star sprite */
function glowTexture() {
  if (tex) return tex;
  const c = document.createElement("canvas");
  c.width = c.height = TEXTURE_SIZE;
  const g = c.getContext("2d")!;
  const middle = TEXTURE_SIZE / 2;
  const grad = g.createRadialGradient(middle, middle, 0, middle, middle, middle);

  for (const [stop, opacity] of GLOW_STOPS) grad.addColorStop(stop, `rgba(255,255,255,${opacity})`);

  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  tex = new THREE.CanvasTexture(c);

  return tex;
}

export function glowSprite(color: THREE.ColorRepresentation, size: number, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);

  return s;
}

export const BACKDROP_RADIUS = 1500;

/** faint background stars on a big sphere */
export function backdrop(count = BACKDROP_STARS, radius = BACKDROP_RADIUS) {
  const position = new Float32Array(count * COORDS_PER_POINT);

  for (let index = 0; index < count; index++) {
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    position.set([radius * s * Math.cos(a), radius * z, radius * s * Math.sin(a)], index * COORDS_PER_POINT);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, COORDS_PER_POINT));

  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: BACKDROP_COLOR, size: BACKDROP_POINT_PX, sizeAttenuation: false, transparent: true, opacity: BACKDROP_OPACITY, depthWrite: false }));
}
