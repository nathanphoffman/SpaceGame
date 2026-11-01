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

const RGB_CHANNELS = 3;
const HALF = 0.5;
const SURFACE_ROUGHNESS = 0.95;
const BAND_COLORS = { first: 0, second: 1, third: 2, fourth: 3 };
const GAS_BLEND_SCALE = { x: 6, y: 1.5 }; // the second band pattern is stretched along the poles

const mixColors = (first: RGB, second: RGB, t: number): RGB => [first[0] + (second[0] - first[0]) * t, first[1] + (second[1] - first[1]) * t, first[2] + (second[2] - first[2]) * t];

/** colour of a gas giant at a point: two wobbling band patterns blended together (`warp` and `blend` are noise values there) */
function gasColor(params: PlanetParams, north: number, warp: number, blend: number): RGB {
  const latitude = (north + warp * GAS_WARP_STRENGTH - GAS_LATITUDE_SHIFT) * params.bandFreq;
  const band = Math.sin(latitude * Math.PI) * HALF + HALF;
  const band2 = Math.sin(latitude * Math.PI * GAS_BAND2_FREQ + GAS_BAND2_PHASE) * HALF + HALF;

  return mixColors(mixColors(params.bands[BAND_COLORS.first], params.bands[BAND_COLORS.second], band), mixColors(params.bands[BAND_COLORS.third], params.bands[BAND_COLORS.fourth], band2), GAS_BLEND_BASE + GAS_BLEND_NOISE * blend);
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
function groundColor(params: PlanetParams, hashed: number): RGB {
  const { seaLevel, ocean } = params;

  if (hashed < seaLevel) return mixColors(ocean, [ocean[0] * DEEP_OCEAN_DARKEN[0], ocean[1] * DEEP_OCEAN_DARKEN[1], ocean[2] * DEEP_OCEAN_DARKEN[2]], 1 - hashed / seaLevel);

  const land = seaLevel < 0 ? hashed : (hashed - seaLevel) / (1 - seaLevel);
  const color = mixColors(params.low, params.high, land);

  if (params.kind === "rocky" && land > SNOW_LINE) return mixColors(color, SNOW_COLOR, (land - SNOW_LINE) / SNOW_BLEND_SPAN);

  return color;
}

/** a sphere whose vertices are pushed out by terrain noise and coloured by the planet's look */
function buildPlanet(params: PlanetParams, detail: number): THREE.Mesh {
  // merge duplicate vertices so normals are smooth across the texture seam
  let geometry: THREE.BufferGeometry = new THREE.SphereGeometry(1, Math.round(SPHERE_WIDTH_SEGMENTS * detail), Math.round(SPHERE_HEIGHT_SEGMENTS * detail));
  geometry.deleteAttribute("uv");
  geometry.deleteAttribute("normal");
  geometry = mergeVertices(geometry, WELD_TOLERANCE);

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * RGB_CHANNELS);
  const seed = params.noiseOffset;
  const [offsetX, offsetY, offsetZ] = TERRAIN_OFFSET;

  for (let index = 0; index < pos.count; index++) {
    const length = Math.hypot(pos.getX(index), pos.getY(index), pos.getZ(index));
    const nx = pos.getX(index) / length, ny = pos.getY(index) / length, nz = pos.getZ(index) / length;
    let color: RGB;
    let lift = 0;

    if (params.kind === "gas") {
      const warp = fbm(nx * GAS_WARP_SCALE + GAS_WARP_OFFSET, ny * GAS_WARP_SCALE, nz * GAS_WARP_SCALE, seed, GAS_NOISE_OCTAVES);
      const blend = fbm(nx * GAS_BLEND_SCALE.x, ny * GAS_BLEND_SCALE.y, nz * GAS_BLEND_SCALE.x, seed + GAS_BLEND_SEED_OFFSET, GAS_NOISE_OCTAVES);
      color = gasColor(params, ny, warp, blend);
    } else {
      const h = fbm(nx * params.noiseScale + offsetX, ny * params.noiseScale + offsetY, nz * params.noiseScale + offsetZ, seed);
      const craters = craterEffect(params.craters, [nx, ny, nz]);
      const grain = GRAIN_BASE + GRAIN_AMOUNT * noise3(nx * GRAIN_SCALE, ny * GRAIN_SCALE, nz * GRAIN_SCALE, seed + GRAIN_SEED_OFFSET);
      lift = (Math.max(h, params.seaLevel) - HALF) * 2 * params.bump + craters.lift;
      color = mixColors([0, 0, 0], groundColor(params, h), craters.shade * grain);
    }

    pos.setXYZ(index, nx * (1 + lift), ny * (1 + lift), nz * (1 + lift));
    colors.set(color, index * RGB_CHANNELS);
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, RGB_CHANNELS));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: SURFACE_ROUGHNESS, metalness: 0 }));
  mesh.scale.setScalar(params.radius);

  return mesh;
}

const RING_SEGMENTS = { around: 128, across: 40 };
const RGBA = 4; // red, green, blue and alpha per ring vertex
const RING_BAND_NOISE_SCALE = 14; // how fast the ring brightness varies from inner to outer edge
const RING_GAP_NOISE_SCALE = 40;
const RING_GAP_SEED_OFFSET = 9;
const RING_GAP_THRESHOLD = 0.78; // noise above this opens a gap (a Cassini-division look)
const RING_GAP_OPACITY = 0.1;
const RING_EDGE_FADE = 6; // the ring fades out over the first and last sixth of its width
const RING_SHADE = { base: 0.6, variation: 0.4 };
const RING_OPACITY = { base: 0.35, variation: 0.55 };
const NOISE_SLICE_Y = 0.5; // the ring noise is sampled along a thin slice of the 3D noise
const NOISE_SLICE_GAP_Y = 1.5;
const ATMOSPHERE_SCALE = 1.07; // the atmosphere shell is this much bigger than the planet
const ATMOSPHERE_OPACITY = 0.18;
const ATMOSPHERE_SEGMENTS = { around: 48, across: 32 };

/** a flat ring around the planet, with soft edges and a few gaps, coloured per vertex */
function buildRings(params: PlanetParams): THREE.Mesh {
  const rings = params.rings!;
  const geometry = new THREE.RingGeometry(rings.inner, rings.outer, RING_SEGMENTS.around, RING_SEGMENTS.across);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * RGBA);

  for (let index = 0; index < position.count; index++) {
    const distance = Math.hypot(position.getX(index), position.getY(index));
    const across = (distance - rings.inner) / (rings.outer - rings.inner); // 0 at the inner edge, 1 at the outer edge
    const brightness = noise3(across * RING_BAND_NOISE_SCALE, NOISE_SLICE_Y, NOISE_SLICE_Y, rings.seed);
    const gap = noise3(across * RING_GAP_NOISE_SCALE, NOISE_SLICE_GAP_Y, NOISE_SLICE_Y, rings.seed + RING_GAP_SEED_OFFSET) > RING_GAP_THRESHOLD ? RING_GAP_OPACITY : 1;
    const edge = Math.min(1, across * RING_EDGE_FADE, (1 - across) * RING_EDGE_FADE);
    const shade = RING_SHADE.base + RING_SHADE.variation * brightness;
    const alpha = (RING_OPACITY.base + RING_OPACITY.variation * brightness) * gap * edge;
    colors.set([rings.color[0] * shade, rings.color[1] * shade, rings.color[2] * shade, alpha], index * RGBA);
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, RGBA));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2 + rings.tilt;

  return mesh;
}

/** a faint shell around the planet, seen from inside so it glows at the edge */
function buildAtmosphere(params: PlanetParams, color: RGB): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(params.radius * ATMOSPHERE_SCALE, ATMOSPHERE_SEGMENTS.around, ATMOSPHERE_SEGMENTS.across),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: ATMOSPHERE_OPACITY, side: THREE.BackSide }),
  );
}

/** Planet + rings + atmosphere, tilted. `detail` 1 = full quality, lower = fewer vertices (thumbnails). */
export function createPlanetGroup(params: PlanetParams, detail = 1) {
  const group = new THREE.Group();
  group.rotation.z = params.tilt;
  const planet = buildPlanet(params, detail);
  group.add(planet);

  if (params.rings) group.add(buildRings(params));

  if (params.atmosphere) group.add(buildAtmosphere(params, params.atmosphere));

  return { group, planet };
}

/** Half the visible world height needed to frame the whole planet (including rings). */
export function planetExtent(params: PlanetParams) {
  return params.rings ? params.rings.outer : params.radius * ATMOSPHERE_SCALE;
}
