import * as THREE from "three";

const SUN_INTENSITY = 2.6;
const AMBIENT_INTENSITY = 0.35;
const WHITE = 0xffffff;
const SUN_POSITION = [5, 3, 5] as const;

/** one sun from the upper right plus a little ambient light, so a planet shows its day side and a faint night side */
export function lightScene(scene: THREE.Scene) {
  const sun = new THREE.DirectionalLight(WHITE, SUN_INTENSITY);
  sun.position.set(...SUN_POSITION);
  scene.add(sun, new THREE.AmbientLight(WHITE, AMBIENT_INTENSITY));
}

/** frees the GPU memory of every mesh in the scene */
export function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
}
