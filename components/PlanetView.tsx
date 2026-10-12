"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { planetParams } from "@/lib/planetGen";
import { createPlanetGroup } from "./planetMesh";

const MAX_FPS = 30;

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

    const { group, planet } = createPlanetGroup(p);
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
