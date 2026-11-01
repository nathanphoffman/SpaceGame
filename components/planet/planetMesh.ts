import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm, noise3 } from "@/lib/planets/noise";
import { type PlanetParams, type RGB } from "@/lib/planets/types";

const SPHERE_WIDTH_SEGMENTS = 160;
const SPHERE_HEIGHT_SEGMENTS = 110;
const WELD_TOLERANCE = 1e-4;
// gas giants: bands wobble with noise, then two band patterns are blended
const GAS_WARP_SCALE = 3;
const GAS_WARP_STRENGTH = 0.35;
const GAS_WARP_OFFSET = 5;
const GAS_LATITUDE_SHIFT = 0.17;
const GAS_BAND2_FREQ = 2.3;
const GAS_BAND2_PHASE = 1.3;
const GAS_BLEND_BASE = 0.35;
const GAS_BLEND_NOISE = 0.3;
const GAS_NOISE_OCTAVES = 3;
const GAS_BLEND_SEED_OFFSET = 7;
// rocky surfaces
const TERRAIN_OFFSET = [3.1, 1.7, 9.3];
const DEEP_OCEAN_DARKEN: RGB = [0.5, 0.5, 0.7];
const SNOW_LINE = 0.82;
const SNOW_BLEND_SPAN = 0.18;
const SNOW_COLOR: RGB = [0.95, 0.96, 0.98];
const GRAIN_SCALE = 25;
const GRAIN_BASE = 0.9;
const GRAIN_AMOUNT = 0.2;
const GRAIN_SEED_OFFSET = 3;
const MIN_CRATER_SHADE = 0.35;
const CRATER_FLOOR_DEPTH = 0.6;
const CRATER_FLOOR_SHADE = 0.25;
const CRATER_RIM_WIDTH = 0.3;
const CRATER_RIM_HEIGHT = 0.25 * 4 * 0.5; // the raised rim is a quarter of the crater depth, shaped by (1 - k) * k * 4, halved

type Vec3 = [number, number, number];

const mixColors = (first: RGB, second: RGB, t: number): RGB => [first[0] + (second[0] - first[0]) * t, first[1] + (second[1] - first[1]) * t, first[2] + (second[2] - first[2]) * t];

/** colour of a gas giant at a point: two wobbling band patterns blended together (`warp` and `blend` are noise values there) */
function gasColor(params: PlanetParams, north: number, warp: number, blend: number): RGB {
  const latitude = (north + warp * GAS_WARP_STRENGTH - GAS_LATITUDE_SHIFT) * params.bandFreq;
  const band = Math.sin(latitude * Math.PI) * 0.5 + 0.5;
  const band2 = Math.sin(latitude * Math.PI * GAS_BAND2_FREQ + GAS_BAND2_PHASE) * 0.5 + 0.5;

  return mixColors(mixColors(params.bands[0], params.bands[1], band), mixColors(params.bands[2], params.bands[3], band2), GAS_BLEND_BASE + GAS_BLEND_NOISE * blend);
}

/** how much the craters push the ground up or down at a point, and how dark they make it */
function craterEffect(craters: PlanetParams["craters"], direction: Vec3) {
  let lift = 0;
  let shade = 1;

  for (const crater of craters) {
    const dot = direction[0] * crater.dir[0] + direction[1] * crater.dir[1] + direction[2] * crater.dir[2];
    const across = Math.acos(Math.min(1, Math.max(-1, dot))) / crater.size; // distance from the crater's centre, 1 = its edge

    if (across < 1) {
      lift -= crater.depth * (1 - across * across) * CRATER_FLOOR_DEPTH;
      shade -= CRATER_FLOOR_SHADE * (1 - across);
    } else if (across < 1 + CRATER_RIM_WIDTH) {
      const rim = (across - 1) / CRATER_RIM_WIDTH;
      lift += crater.depth * (1 - rim) * rim * CRATER_RIM_HEIGHT;
    }
  }

  return { lift, shade: Math.max(MIN_CRATER_SHADE, shade) };
}

/** colour of rocky ground at height `h` (0..1): ocean below sea level, a low-to-high gradient above it, snow on the peaks of rocky worlds */
function groundColor(params: PlanetParams, h: number): RGB {
  const { seaLevel, ocean } = params;

  if (h < seaLevel) return mixColors(ocean, [ocean[0] * DEEP_OCEAN_DARKEN[0], ocean[1] * DEEP_OCEAN_DARKEN[1], ocean[2] * DEEP_OCEAN_DARKEN[2]], 1 - h / seaLevel);

  const land = seaLevel < 0 ? h : (h - seaLevel) / (1 - seaLevel);
  const color = mixColors(params.low, params.high, land);

  if (params.kind === "rocky" && land > SNOW_LINE) return mixColors(color, SNOW_COLOR, (land - SNOW_LINE) / SNOW_BLEND_SPAN);

  return color;
}

/** a sphere whose vertices are pushed out by terrain noise and coloured by the planet's look */
function buildPlanet(params: PlanetParams, detail: number): THREE.Mesh {
  // merge duplicate vertices so normals are smooth across the texture seam
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, Math.round(SPHERE_WIDTH_SEGMENTS * detail), Math.round(SPHERE_HEIGHT_SEGMENTS * detail));
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, WELD_TOLERANCE);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const seed = params.noiseOffset;
  const [offsetX, offsetY, offsetZ] = TERRAIN_OFFSET;

  for (let index = 0; index < pos.count; index++) {
    const length = Math.hypot(pos.getX(index), pos.getY(index), pos.getZ(index));
    const nx = pos.getX(index) / length, ny = pos.getY(index) / length, nz = pos.getZ(index) / length;
    let color: RGB;
    let lift = 0;

    if (params.kind === "gas") {
      const warp = fbm(nx * GAS_WARP_SCALE + GAS_WARP_OFFSET, ny * GAS_WARP_SCALE, nz * GAS_WARP_SCALE, seed, GAS_NOISE_OCTAVES);
      const blend = fbm(nx * 6, ny * 1.5, nz * 6, seed + GAS_BLEND_SEED_OFFSET, GAS_NOISE_OCTAVES);
      color = gasColor(params, ny, warp, blend);
    } else {
      const h = fbm(nx * params.noiseScale + offsetX, ny * params.noiseScale + offsetY, nz * params.noiseScale + offsetZ, seed);
      const craters = craterEffect(params.craters, [nx, ny, nz]);
      const grain = GRAIN_BASE + GRAIN_AMOUNT * noise3(nx * GRAIN_SCALE, ny * GRAIN_SCALE, nz * GRAIN_SCALE, seed + GRAIN_SEED_OFFSET);
      lift = (Math.max(h, params.seaLevel) - 0.5) * 2 * params.bump + craters.lift;
      color = mixColors([0, 0, 0], groundColor(params, h), craters.shade * grain);
    }

    pos.setXYZ(index, nx * (1 + lift), ny * (1 + lift), nz * (1 + lift));
    colors.set(color, index * 3);
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.scale.setScalar(params.radius);

  return mesh;
}

function buildRings(p: PlanetParams): THREE.Mesh {
  const r = p.rings!;
  const geo = new THREE.RingGeometry(r.inner, r.outer, 128, 40);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 4);

  for (let i = 0; i < pos.count; i++) {
    const rad = Math.hypot(pos.getX(i), pos.getY(i));
    const t = (rad - r.inner) / (r.outer - r.inner);
    const n = noise3(t * 14, 0.5, 0.5, r.seed);
    const gap = noise3(t * 40, 1.5, 0.5, r.seed + 9) > 0.78 ? 0.1 : 1;
    const edge = Math.min(1, t * 6, (1 - t) * 6);
    const shade = 0.6 + 0.4 * n;
    colors[i * 4] = r.color[0] * shade;
    colors[i * 4 + 1] = r.color[1] * shade;
    colors[i * 4 + 2] = r.color[2] * shade;
    colors[i * 4 + 3] = (0.35 + 0.55 * n) * gap * edge;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );

  mesh.rotation.x = -Math.PI / 2 + r.tilt;

  return mesh;
}

/** Planet + rings + atmosphere, tilted. `detail` 1 = full quality, lower = fewer vertices (thumbnails). */
export function createPlanetGroup(p: PlanetParams, detail = 1) {
  const group = new THREE.Group();
  group.rotation.z = p.tilt;
  const planet = buildPlanet(p, detail);
  group.add(planet);

  if (p.rings) group.add(buildRings(p));

  if (p.atmosphere) {
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(p.radius * 1.07, 48, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(...p.atmosphere), transparent: true, opacity: 0.18, side: THREE.BackSide }),
      ),
    );
  }

  return { group, planet };
}

/** Half the visible world height needed to frame the whole planet (including rings). */
export function planetExtent(p: PlanetParams) {
  return p.rings ? p.rings.outer : p.radius * 1.07;
}
