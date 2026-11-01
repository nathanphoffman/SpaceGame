"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MS_PER_SECOND } from "@/lib/defs";
import { planetParams } from "@/lib/planets/planetParams";
import type { PlanetParams } from "@/lib/planets/types";
import { createPlanetGroup } from "@/components/planet/planetMesh";
import { disposeScene, lightScene } from "@/components/planet/sceneParts";

const MAX_FPS = 30;
const CAMERA = { fieldOfView: 40, near: 0.1, far: 100, height: 0.4, distance: 5.5 };
const MAX_PIXEL_RATIO = 2;
const DEFAULT_SIZE_PX = 300;

function createRenderer(element: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  element.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";

  return renderer;
}

/** the planet, its lights and a camera that looks at it from a little above */
function createScene(params: PlanetParams) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fieldOfView, 1, CAMERA.near, CAMERA.far);
  camera.position.set(0, CAMERA.height, CAMERA.distance); // closer than a square view so the planet still fills the shorter frame
  camera.lookAt(0, 0, 0);
  lightScene(scene);
  const { group, planet } = createPlanetGroup(params);
  scene.add(group);

  return { scene, camera, planet };
}

/** keeps the renderer and camera matched to the size of the element; returns the function that stops watching */
function followSize(element: HTMLElement, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const resize = () => {
    const width = element.clientWidth || DEFAULT_SIZE_PX;
    const height = element.clientHeight || DEFAULT_SIZE_PX;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resize();
  const watcher = new ResizeObserver(resize);
  watcher.observe(element);

  return () => watcher.disconnect();
}

/** draws and spins the planet, skipping frames above the frame-rate cap; returns the function that stops the loop */
function startLoop(render: () => void, spin: (seconds: number) => void) {
  let frame = 0;
  let last = performance.now();
  const frameMs = MS_PER_SECOND / MAX_FPS;

  const loop = (time: number) => {
    frame = requestAnimationFrame(loop);

    if (time - last < frameMs - 1) return;

    spin((time - last) / MS_PER_SECOND);
    last = time;
    render();
  };

  frame = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(frame);
}

export default function PlanetView({ seed }: { seed: number }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current!;
    const params = planetParams(seed);
    const renderer = createRenderer(element);
    const { scene, camera, planet } = createScene(params);
    const stopWatching = followSize(element, renderer, camera);
    const stopLoop = startLoop(() => renderer.render(scene, camera), (seconds) => { planet.rotation.y += seconds * params.spin; });

    return () => { // cleanup that runs when the view closes: stop the loop and free the GPU memory
      stopLoop();
      stopWatching();
      disposeScene(scene);
      renderer.dispose();
      element.removeChild(renderer.domElement);
    };
  }, [seed]);

  return <div ref={elementRef} className="planet3d" />;
}
