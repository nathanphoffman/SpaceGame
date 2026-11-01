import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { planetParams } from "@/lib/planets/planetParams";
import { starParams } from "@/lib/planets/starParams";
import { type FleetDTO, type PlanetDTO, type SystemDTO, MISSION } from "@/lib/defs";
import { createPlanetGroup } from "@/components/planet/planetMesh";
import { glowSprite } from "@/components/maps/three/glow";

const STAR_WHITEN = 0.35;
const LIGHT_WHITEN = 0.3;
const LIGHT_INTENSITY = 5;
const AMBIENT_INTENSITY = 0.14;
const STAR_BASE_RADIUS = 1;
const STAR_RADIUS_PER_SIZE = 0.9;
const STAR_GLOW_SCALE = 7;
const STAR_HALO_SCALE = 16;
const PLANET_SCALE = 0.42; // planets are drawn bigger than life
const OWNER_DOT_SIZE = 0.03;
const SHIP_LENGTH = 0.6;
const SHIP_WIDTH = 0.16;
const COLONY_COLOR = 0x5be08a;
const ATTACK_COLOR = 0x4cc2ff;
const OWNER_COLOR = { player: 0x5be08a, npc: 0xff6b6b, empty: 0x8794b5 } as const;
const WHITE_HEX = 0xffffff;
const white = new THREE.Color(1, 1, 1);
const STAR_SEGMENTS = { around: 48, across: 32 };
const STAR_GLOW_OPACITY = 0.9;
const STAR_HALO_OPACITY = 0.22;
const OWNER_DOT_OPACITY = 0.9;
const OWNER_DOT_GLOW = 0.9;
const SHIP_SEGMENTS = 10;
const SHIP_GLOW_OPACITY = 0.8;
const TRAIL_OPACITY = 0.45;
const TRAIL_DASH = { dash: 0.4, gap: 0.3 };

export const LOW_DETAIL = 0.55;
export const HIGH_DETAIL = 1.2;

export type PlanetNode = { dto: PlanetDTO; holder: THREE.Group; mesh: THREE.Group; spin: number; radius: number; detail: number; label: HTMLElement };
export type ShipNode = { holder: THREE.Group; trail: THREE.Line; fleet: FleetDTO };

function addLabel(parent: THREE.Object3D, text: string, starClass: string) {
  const element = document.createElement("div");
  element.className = `lbl ${starClass}`;
  element.textContent = text;
  parent.add(new CSS2DObject(element));

  return element;
}

/** frees the geometry and materials under an object */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => { // visit every mesh under this object
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;

    // a material can be one material, a list of them, or missing; handle all three
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
}

/** an unlit star with glow, plus the lights everything else is seen by */
export function createStar(system: SystemDTO) {
  const look = starParams(system.seed);
  const color = new THREE.Color(...look.color);
  const radius = STAR_BASE_RADIUS + look.size * STAR_RADIUS_PER_SIZE;
  const star = new THREE.Mesh(new THREE.SphereGeometry(radius, STAR_SEGMENTS.around, STAR_SEGMENTS.across), new THREE.MeshBasicMaterial({ color: color.clone().lerp(white, STAR_WHITEN) }));
  star.add(glowSprite(color, radius * STAR_GLOW_SCALE, STAR_GLOW_OPACITY), glowSprite(color, radius * STAR_HALO_SCALE, STAR_HALO_OPACITY));
  addLabel(star, system.name, "star");
  const light = new THREE.PointLight(color.clone().lerp(white, LIGHT_WHITEN), LIGHT_INTENSITY, 0, 0);

  return { star, lights: [light, new THREE.AmbientLight(WHITE_HEX, AMBIENT_INTENSITY)] };
}

/** swaps the planet's mesh for one built at the given detail level */
export function setDetail(node: PlanetNode, detail: number) {
  disposeTree(node.mesh);
  node.mesh.clear();
  const { group } = createPlanetGroup(planetParams(node.dto.seed), detail);
  group.scale.setScalar(PLANET_SCALE);
  node.mesh.add(group);
  node.detail = detail;
}

export function createPlanetNode(planet: PlanetDTO): PlanetNode {
  const params = planetParams(planet.seed);
  const holder = new THREE.Group(), mesh = new THREE.Group();
  const dot = glowSprite(OWNER_COLOR[planet.kind], OWNER_DOT_GLOW, OWNER_DOT_OPACITY); // a screen-size dot so far-away planets can still be found
  dot.material.sizeAttenuation = false;
  dot.scale.setScalar(OWNER_DOT_SIZE);
  holder.add(mesh, dot);

  return { dto: planet, holder, mesh, spin: params.spin, radius: params.radius * PLANET_SCALE, detail: 0, label: addLabel(holder, planet.name, `body ${planet.kind}`) };
}

/** a small ship (a cone pointing the way it flies) and a dashed line to where it is going */
export function createShip(fleet: FleetDTO): ShipNode {
  const color = fleet.mission === MISSION.colonize ? COLONY_COLOR : ATTACK_COLOR;
  const hull = new THREE.Mesh(new THREE.ConeGeometry(SHIP_WIDTH, SHIP_LENGTH, SHIP_SEGMENTS), new THREE.MeshBasicMaterial({ color }));
  hull.rotation.x = Math.PI / 2; // a cone points along +y; turn it to +z, the way lookAt() faces
  const holder = new THREE.Group();
  holder.add(hull, glowSprite(color, SHIP_LENGTH, SHIP_GLOW_OPACITY));

  // total ships in the fleet: add up the count of every ship type
  const count = Object.values(fleet.ships).reduce((total, n) => total + n, 0);
  addLabel(holder, `${fleet.mission === MISSION.colonize ? "Colony" : "Fleet"} ×${count}`, "ship");
  const trailGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const trail = new THREE.Line(trailGeometry, new THREE.LineDashedMaterial({ color, transparent: true, opacity: TRAIL_OPACITY, dashSize: TRAIL_DASH.dash, gapSize: TRAIL_DASH.gap }));

  return { holder, trail, fleet };
}

/** points the ship and its trail from one planet to the other, `progress` (0..1) of the way along */
export function placeShip(ship: ShipNode, from: THREE.Vector3, to: THREE.Vector3, progress: number) {
  ship.holder.position.lerpVectors(from, to, progress);
  ship.holder.lookAt(to);
  const points = ship.trail.geometry.attributes.position as THREE.BufferAttribute;
  points.setXYZ(0, from.x, from.y, from.z);
  points.setXYZ(1, to.x, to.y, to.z);
  points.needsUpdate = true;
  ship.trail.computeLineDistances();
}
