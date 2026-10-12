import * as THREE from "three";
import { planetParams } from "@/lib/planetGen";
import { createPlanetGroup, planetExtent } from "./planetMesh";

// One shared offscreen renderer renders every planet once to a PNG, so the solar map
// can show many small planets without a WebGL context each.
let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<number, string>();
const SIZE = 192;

export function planetThumb(seed: number): string {
  const hit = cache.get(seed);
  if (hit) return hit;

  renderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);

  const p = planetParams(seed);
  const scene = new THREE.Scene();
  const half = planetExtent(p) * 1.05; // world units from centre to frame edge
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const z = half / Math.tan((20 * Math.PI) / 180);
  camera.position.set(0, 0, z);
  camera.lookAt(0, 0, 0);

  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(5, 3, 5);
  scene.add(sun, new THREE.AmbientLight(0xffffff, 0.35));

  const { group, planet } = createPlanetGroup(p, 0.5);
  planet.rotation.y = (seed % 628) / 100; // varied side facing the viewer
  scene.add(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  cache.set(seed, url);
  return url;
}

/** Display width (px) so the planet body is `bodyPx` across, with room for rings/atmosphere. */
export function thumbDisplaySize(seed: number, bodyPx: number) {
  const p = planetParams(seed);
  return bodyPx * ((planetExtent(p) * 1.05) / p.radius);
}
