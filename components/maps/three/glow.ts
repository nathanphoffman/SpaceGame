import * as THREE from "three";

let tex: THREE.CanvasTexture | null = null;

/** soft round glow, shared by every star sprite */
function glowTexture() {
  if (tex) return tex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.15, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
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
export function backdrop(count = 1800, radius = BACKDROP_RADIUS) {
  const pos = new Float32Array(count * 3);

  for (let index = 0; index < count; index++) {
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    pos.set([radius * s * Math.cos(a), radius * z, radius * s * Math.sin(a)], index * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fb0d8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }));
}
