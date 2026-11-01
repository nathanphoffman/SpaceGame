import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { planetParams, starParams } from "@/lib/planetGen";
import type { FleetDTO, GameState, PlanetDTO, SystemDTO } from "@/lib/defs";
import { flightOf } from "@/lib/flight";
import { createPlanetGroup } from "../planetMesh";
import { backdrop, glowSprite } from "./glow";
import { startFly, stepFly, type Fly } from "./cameraFlight";
import { bindPointer, pickAt, type Pickable } from "./pointer";

// One star system in 3D. 1 scene unit is NOT an AU: distances are compressed (see `dist`) so that
// Mercury and Neptune both fit on screen, and planets are drawn bigger than life. Orbits keep their order.

const STAR_COLOR_WHITEN = 0.35;
const OWNER_COLOR = { player: 0x5be08a, npc: 0xff6b6b, empty: 0x8794b5 } as const;
const ORBIT_SEGMENTS = 192;
const PLANET_SCALE = 0.42;
const LOW_DETAIL = 0.55;
const HIGH_DETAIL = 1.2;

/** compressed distance from the star in scene units */
export const dist = (orbitAU: number) => 3 + 9 * Math.sqrt(orbitAU);
/** seconds for one lap; not real physics, just slow for far planets */
const periodSec = (orbitAU: number) => Math.max(14, 45 * Math.pow(orbitAU, 0.75));
const phaseOf = (seed: number) => ((seed * 2654435761) % 1000) / 1000 * Math.PI * 2;

type PlanetNode = { dto: PlanetDTO; holder: THREE.Group; mesh: THREE.Group; spin: number; scale: number; radius: number; detail: number; label: HTMLElement };
type ShipNode = { holder: THREE.Group; trail: THREE.Line; label: HTMLElement; fleet: FleetDTO };

export type EngineCallbacks = { onPlanet(id: number): void };

export class SystemEngine {
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private labelLayer = new CSS2DRenderer();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.05, 4000);
  private controls: OrbitControls;
  private scene = new THREE.Scene();
  private stars = backdrop();
  private content = new THREE.Group(); // everything that depends on the system, replaced when it changes
  private planets = new Map<number, PlanetNode>();
  private ships = new Map<string, ShipNode>();
  private pickables: Pickable[] = [];
  private starMesh: THREE.Mesh | null = null;
  private systemId = -1;
  private planetKey = "";
  private selected: number | null = null;
  private follow: number | null = null;
  private fly: Fly | null = null;
  private clockOffset = 0; // server clock - performance.now()
  private frame = 0;
  private last = performance.now();
  private disposed = false;
  private resizeWatcher: ResizeObserver;
  private unbind: () => void;
  private scratch = new THREE.Vector3();

  constructor(private el: HTMLElement, private cb: EngineCallbacks) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.display = "block";
    el.appendChild(this.renderer.domElement);
    this.labelLayer.domElement.className = "labels";
    el.appendChild(this.labelLayer.domElement);
    this.scene.add(this.stars, this.content);

    this.controls = new OrbitControls(this.camera, el);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.zoomSpeed = 0.9;

    this.resizeWatcher = new ResizeObserver(() => this.resize());
    this.resizeWatcher.observe(el);
    this.resize();
    this.unbind = bindPointer(el, (e) => pickAt(e, el, this.pickables, this.camera), (id) => { if (id != null) this.cb.onPlanet(id); });
    this.frame = requestAnimationFrame(this.loop);
  }

  /** called whenever new game state arrives; rebuilds the scene only when the system or its planets change */
  update(game: GameState, system: SystemDTO, serverNow: number, selectedId: number | null) {
    this.clockOffset = serverNow - performance.now();
    this.gameForShips = game;
    const planets = game.planets.filter((p) => p.systemId === system.id).sort((a, b) => a.orbit - b.orbit);
    const key = planets.map((p) => p.id).join(",");
    const fresh = system.id !== this.systemId;
    if (fresh || key !== this.planetKey) this.build(system, planets);
    if (fresh) { this.selected = selectedId; for (const [pid, n] of this.planets) n.label.classList.toggle("sel", pid === selectedId); } // start on the overview, not zoomed into the selected planet
    for (const p of planets) { // owner can change (colonised, conquered)
      const node = this.planets.get(p.id);
      if (!node) continue;
      node.dto = p;
      node.label.className = `lbl body ${p.kind}`;
    }
    this.syncShips(game, system);
    this.select(selectedId);
  }

  select(id: number | null) {
    if (id === this.selected) return;
    this.selected = id;
    for (const [pid, n] of this.planets) n.label.classList.toggle("sel", pid === id);
    const node = id != null ? this.planets.get(id) : null;
    if (!node) return;
    if (node.detail < HIGH_DETAIL) this.setDetail(node, HIGH_DETAIL);
    this.focus(node);
  }

  /** zoom out to see the whole system */
  overview() {
    this.follow = null;
    const span = this.span();
    this.controls.minDistance = 2;
    this.fly = startFly(this.camera, this.controls, new THREE.Vector3(0.25, 0.85, 1.1).multiplyScalar(span), new THREE.Vector3());
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeWatcher.disconnect();
    this.unbind();
    this.controls.dispose();
    this.clearContent();
    this.stars.geometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.domElement.remove();
  }

  // ---- internals ----

  private span() {
    const far = Math.max(0, ...[...this.planets.values()].map((n) => dist(n.dto.orbit)));
    return Math.max(far, 12) * 1.15;
  }

  private nowMs() { return performance.now() + this.clockOffset; }

  private angle(p: PlanetDTO, nowMs: number) {
    return phaseOf(p.seed) - (nowMs / 1000 / periodSec(p.orbit)) * Math.PI * 2;
  }

  private planetPos(p: PlanetDTO, nowMs: number, out: THREE.Vector3) {
    const a = this.angle(p, nowMs), d = dist(p.orbit);
    return out.set(Math.cos(a) * d, 0, Math.sin(a) * d);
  }

  private clearContent() {
    this.content.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.content.clear();
    this.planets.clear();
    this.ships.clear();
    this.pickables = [];
  }

  private makeLabel(parent: THREE.Object3D, text: string, cls: string) {
    const div = document.createElement("div");
    div.className = `lbl ${cls}`;
    div.textContent = text;
    parent.add(new CSS2DObject(div));
    return div;
  }

  private build(system: SystemDTO, planets: PlanetDTO[]) {
    const firstTime = system.id !== this.systemId;
    this.clearContent();
    this.systemId = system.id;
    this.planetKey = planets.map((p) => p.id).join(",");
    this.follow = null;

    // star: unlit sphere + glow sprites, and the light everything else uses
    const sp = starParams(system.seed);
    const color = new THREE.Color(...sp.color);
    const starR = 1 + sp.size * 0.9;
    const star = new THREE.Mesh(new THREE.SphereGeometry(starR, 48, 32), new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(1, 1, 1), STAR_COLOR_WHITEN) }));
    const glow = glowSprite(color, starR * 7, 0.9), halo = glowSprite(color, starR * 16, 0.22);
    star.add(glow, halo);
    this.makeLabel(star, system.name, "star");
    this.content.add(star, new THREE.PointLight(color.clone().lerp(new THREE.Color(1, 1, 1), 0.3), 5, 0, 0), new THREE.AmbientLight(0xffffff, 0.14));
    this.starMesh = star;

    for (const p of planets) {
      const params = planetParams(p.seed);
      const holder = new THREE.Group(), mesh = new THREE.Group();
      holder.add(mesh);
      this.content.add(holder);

      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(Array.from({ length: ORBIT_SEGMENTS + 1 }, (_, i) => {
          const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * dist(p.orbit), 0, Math.sin(a) * dist(p.orbit));
        })),
        new THREE.LineBasicMaterial({ color: 0x3b4a70, transparent: true, opacity: 0.6 }),
      );
      this.content.add(ring);

      const dot = glowSprite(OWNER_COLOR[p.kind], 0.9, 0.9);
      dot.material.sizeAttenuation = false;
      dot.scale.setScalar(0.03);
      holder.add(dot);

      const node: PlanetNode = {
        dto: p, holder, mesh, spin: params.spin, scale: PLANET_SCALE, radius: params.radius * PLANET_SCALE,
        detail: 0, label: this.makeLabel(holder, p.name, `body ${p.kind}`),
      };
      this.setDetail(node, LOW_DETAIL);
      this.planets.set(p.id, node);
      this.pickables.push({ id: p.id, object: holder, radiusPx: 24 });
    }

    if (firstTime) {
      this.controls.maxDistance = this.span() * 6;
      this.camera.position.set(0.25, 0.85, 1.1).multiplyScalar(this.span());
      this.controls.target.set(0, 0, 0);
      this.selected = null;
    }
  }

  private setDetail(node: PlanetNode, detail: number) {
    node.mesh.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose(); });
    node.mesh.clear();
    const { group } = createPlanetGroup(planetParams(node.dto.seed), detail);
    group.scale.setScalar(PLANET_SCALE);
    node.mesh.add(group);
    node.detail = detail;
  }

  private focus(node: PlanetNode) {
    const pos = node.holder.getWorldPosition(new THREE.Vector3());
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.minDistance = node.radius * 1.8;
    this.follow = node.dto.id;
    this.fly = startFly(this.camera, this.controls, pos.clone().add(dir.multiplyScalar(Math.max(node.radius * 6, 1.2))), pos);
  }

  private syncShips(game: GameState, system: SystemDTO) {
    const wanted = game.fleets.filter((f) => {
      if (f.status !== "outbound" && f.status !== "returning") return false;
      const { from, to } = flightOf(game, f, this.nowMs());
      return from.systemId === system.id && to.systemId === system.id;
    });
    const ids = new Set(wanted.map((f) => f.id));
    for (const [id, s] of this.ships) {
      if (ids.has(id)) continue;
      this.content.remove(s.holder, s.trail);
      s.trail.geometry.dispose();
      s.holder.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
      this.ships.delete(id);
    }
    for (const f of wanted) {
      const have = this.ships.get(f.id);
      if (have) { have.fleet = f; continue; }
      const colonize = f.mission === "colonize";
      const col = colonize ? 0x5be08a : 0x4cc2ff;
      const holder = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 10), new THREE.MeshBasicMaterial({ color: col }));
      hull.rotation.x = Math.PI / 2; // cone points along +z, the direction of travel
      const glow = glowSprite(col, 0.6, 0.8);
      holder.add(hull, glow);
      const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: 0.45, dashSize: 0.4, gapSize: 0.3 }));
      const count = Object.values(f.ships).reduce((a, b) => a + b, 0);
      const label = this.makeLabel(holder, `${colonize ? "Colony" : "Fleet"} ×${count}`, "ship");
      this.content.add(holder, trail);
      this.ships.set(f.id, { holder, trail, label, fleet: f });
    }
  }

  private resize() {
    const w = this.el.clientWidth || 800, h = this.el.clientHeight || 500;
    this.renderer.setSize(w, h);
    this.labelLayer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (t: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    const now = this.nowMs();

    for (const n of this.planets.values()) {
      this.planetPos(n.dto, now, n.holder.position);
      n.mesh.rotation.y += dt * n.spin * 2;
    }
    this.stars.position.copy(this.camera.position);
    if (this.starMesh) this.starMesh.rotation.y += dt * 0.05;

    const game = this.gameForShips;
    for (const s of this.ships.values()) {
      const from = this.planets.get(s.fleet.status === "outbound" ? s.fleet.originId : s.fleet.targetId);
      const to = this.planets.get(s.fleet.status === "outbound" ? s.fleet.targetId : s.fleet.originId);
      if (!from || !to) continue;
      const { k } = game ? flightOf(game, s.fleet, now) : { k: 0 };
      const a = from.holder.position, b = to.holder.position;
      s.holder.position.lerpVectors(a, b, k);
      s.holder.lookAt(b);
      const pts = s.trail.geometry.attributes.position as THREE.BufferAttribute;
      pts.setXYZ(0, a.x, a.y, a.z); pts.setXYZ(1, b.x, b.y, b.z); pts.needsUpdate = true;
      s.trail.computeLineDistances();
    }

    if (this.fly) this.fly = stepFly(this.fly, dt, this.camera, this.controls);
    else if (this.follow != null) { // keep tracking the planet as it orbits
      const n = this.planets.get(this.follow);
      if (n) {
        const delta = n.holder.getWorldPosition(this.scratch).sub(this.controls.target);
        this.camera.position.add(delta);
        this.controls.target.add(delta);
      }
    }
    this.camera.near = Math.max(0.01, this.camera.position.distanceTo(this.controls.target) * 0.02);
    this.camera.far = this.span() * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelLayer.render(this.scene, this.camera);
  };

  /** latest game state, used to read flight progress each frame */
  gameForShips: GameState | null = null;
}
