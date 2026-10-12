"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm, planetParams, noise3, type PlanetParams, type RGB } from "@/lib/planetGen";

const MAX_FPS = 30;

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function buildPlanet(p: PlanetParams): THREE.Mesh {
  // merge duplicate vertices so normals are smooth across the texture seam
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, 160, 110);
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, 1e-4);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const s = p.noiseOffset;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.hypot(x, y, z);
    const nx = x / len, ny = y / len, nz = z / len;
    let color: RGB;
    let disp = 0;

    if (p.kind === "gas") {
      const warp = fbm(nx * 3 + 5, ny * 3, nz * 3, s, 3) * 0.35;
      const lat = (ny + warp - 0.17) * p.bandFreq;
      const band = Math.sin(lat * Math.PI) * 0.5 + 0.5;
      const band2 = Math.sin(lat * Math.PI * 2.3 + 1.3) * 0.5 + 0.5;
      color = mix(mix(p.bands[0], p.bands[1], band), mix(p.bands[2], p.bands[3], band2), 0.35 + 0.3 * fbm(nx * 6, ny * 1.5, nz * 6, s + 7, 3));
    } else {
      const h = fbm(nx * p.noiseScale + 3.1, ny * p.noiseScale + 1.7, nz * p.noiseScale + 9.3, s);
      const hEff = Math.max(h, p.seaLevel);
      disp = (hEff - 0.5) * 2 * p.bump;
      let shade = 1;
      for (const c of p.craters) {
        const dot = nx * c.dir[0] + ny * c.dir[1] + nz * c.dir[2];
        const d = Math.acos(Math.min(1, Math.max(-1, dot)));
        const t = d / c.size;
        if (t < 1) {
          disp -= c.depth * (1 - t * t) * 0.6;
          shade -= 0.25 * (1 - t);
        } else if (t < 1.3) {
          const k = (t - 1) / 0.3;
          disp += c.depth * 0.25 * (1 - k) * k * 4 * 0.5; // raised rim
        }
      }
      if (h < p.seaLevel) {
        color = mix(p.ocean, [p.ocean[0] * 0.5, p.ocean[1] * 0.5, p.ocean[2] * 0.7], 1 - h / p.seaLevel);
      } else {
        const t = p.seaLevel < 0 ? h : (h - p.seaLevel) / (1 - p.seaLevel);
        color = mix(p.low, p.high, t);
        if (p.kind === "rocky" && t > 0.82) color = mix(color, [0.95, 0.96, 0.98], (t - 0.82) / 0.18);
      }
      const grain = 0.9 + 0.2 * noise3(nx * 25, ny * 25, nz * 25, s + 3);
      shade = Math.max(0.35, shade) * grain;
      color = [color[0] * shade, color[1] * shade, color[2] * shade];
    }

    const rr = 1 + disp;
    pos.setXYZ(i, nx * rr, ny * rr, nz * rr);
    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.scale.setScalar(p.radius);
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

export default function PlanetView({ seed }: { seed: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const p = planetParams(seed);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.6, 7.5);
    camera.lookAt(0, 0, 0);

    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(5, 3, 5);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.35));

    const group = new THREE.Group();
    group.rotation.z = p.tilt;
    const planet = buildPlanet(p);
    group.add(planet);
    if (p.rings) group.add(buildRings(p));
    if (p.atmosphere) {
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius * 1.07, 48, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(...p.atmosphere), transparent: true, opacity: 0.18, side: THREE.BackSide }),
      );
      group.add(atmo);
    }
    scene.add(group);

    const resize = () => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 300;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    const frameMs = 1000 / MAX_FPS;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < frameMs - 1) return; // skip frames above the cap
      planet.rotation.y += ((t - last) / 1000) * p.spin;
      last = t;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [seed]);

  return <div ref={ref} className="planet3d" />;
}
