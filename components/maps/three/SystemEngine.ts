import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
	type CameraFlight,
	startFly,
	stepFly,
} from "@/components/maps/three/cameraFlight";

import { BACKDROP_RADIUS, backdrop } from "@/components/maps/three/glow";
import {
	orbitRing,
	planetPosition,
	systemRadius,
} from "@/components/maps/three/orbits";

import {
	bindPointer,
	type Pickable,
	pickAt,
} from "@/components/maps/three/pointer";

import {
	createPlanetNode,
	createShip,
	createStar,
	disposeTree,
	HIGH_DETAIL,
	LOW_DETAIL,
	type PlanetNode,
	placeShip,
	type ShipNode,
	setDetail,
} from "@/components/maps/three/systemParts";

import {
	FLEET_STATUS,
	type GameState,
	MS_PER_SECOND,
	type PlanetDTO,
	type SystemDTO,
} from "@/lib/defs";

import { flightOf } from "@/lib/galaxy/flight";

const FIELD_OF_VIEW = 50;
const FAR_PLANE = 4000;
const DEFAULT_SIZE = { width: 800, height: 500 };
const DAMPING = 0.08;
const MAX_PIXEL_RATIO = 2;
const MAX_FRAME_SECONDS = 0.1;
const MIN_SPAN = 12;
const SPAN_MARGIN = 1.15;
const MAX_ZOOM_OUT = 6;
const FAR_SPANS = 20;
const BACKDROP_FAR_SHARE = 0.4; // the star backdrop must sit inside the far plane
const NEAR_SHARE = 0.02;
const MIN_NEAR = 0.01;
const PLANET_PICK_RADIUS_PX = 24;
const ORBIT_SEGMENTS = 192;
const OVERVIEW_OFFSET = new THREE.Vector3(0.25, 0.85, 1.1); // times the system's span
const CLOSE_UP_RADII = 6;
const MIN_CLOSE_UP = 1.2;
const MIN_DISTANCE_RADII = 1.8;
const STAR_SPIN = 0.05;
const PLANET_SPIN_SPEEDUP = 2;

export type EngineCallbacks = { onPlanet(id: number): void };

type World = {
	systemId: number;
	planetKey: string;
	planets: Map<number, PlanetNode>;
	ships: Map<string, ShipNode>;
	pickables: Pickable[];
	star: THREE.Mesh | null;
};

/** Owns the renderer, camera and controls for one 3D star system. It is told what to show through `update`. */
export class SystemEngine {
	private renderer = new THREE.WebGLRenderer({ antialias: true });
	private labelLayer = new CSS2DRenderer();
	private camera = new THREE.PerspectiveCamera(
		FIELD_OF_VIEW,
		1,
		MIN_NEAR,
		FAR_PLANE,
	);

	private controls: OrbitControls;
	private scene = new THREE.Scene();
	private stars = backdrop();
	private content = new THREE.Group(); // everything that depends on the system, replaced when it changes
	private world: World = {
		systemId: -1,
		planetKey: "",
		planets: new Map(),
		ships: new Map(),
		pickables: [],
		star: null,
	};

	private view = {
		selected: null as number | null,
		follow: null as number | null,
		fly: null as CameraFlight | null,
	};

	private clock = {
		serverOffset: 0,
		last: performance.now(),
		game: null as GameState | null,
	};

	private running = {
		frame: 0,
		disposed: false,
		unbind: () => {},
		resize: null as ResizeObserver | null,
	};

	private scratch = new THREE.Vector3();

	constructor(
		private element: HTMLElement,
		private callbacks: EngineCallbacks,
	) {
		this.renderer.setPixelRatio(
			Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
		);

		this.renderer.domElement.style.display = "block";
		element.appendChild(this.renderer.domElement);
		this.labelLayer.domElement.className = "labels";
		element.appendChild(this.labelLayer.domElement);
		this.scene.add(this.stars, this.content);
		this.controls = new OrbitControls(this.camera, element);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = DAMPING;
		this.running.resize = new ResizeObserver(() => this.resize());
		this.running.resize.observe(element);
		this.resize();
		this.running.unbind = bindPointer(
			element,
			(event) => pickAt(event, element, this.world.pickables, this.camera),
			(id) => {
				if (id != null) this.callbacks.onPlanet(id);
			},
		);

		this.running.frame = requestAnimationFrame(this.loop);
	}

	/** called whenever new game state arrives; the scene is only rebuilt when the system or its planets change */
	update(
		game: GameState,
		system: SystemDTO,
		serverNow: number,
		selectedId: number | null,
	) {
		this.clock.serverOffset = serverNow - performance.now();
		this.clock.game = game;
		const planets = game.planets
			.filter((p) => p.systemId === system.id)
			.sort((first, second) => first.orbit - second.orbit);
		const isNewSystem = system.id !== this.world.systemId;

		if (isNewSystem || planets.map((p) => p.id).join() !== this.world.planetKey)
			this.build(system, planets);

		for (const p of planets) this.refreshOwner(p);
		this.syncShips(game, system);

		if (isNewSystem)
			this.markSelected(selectedId); // start on the overview instead of zooming in
		else this.select(selectedId);
	}

	/** zoom out to see the whole system */
	overview() {
		this.view.follow = null;
		this.controls.minDistance = 0;
		this.view.fly = startFly(
			this.camera,
			this.controls,
			OVERVIEW_OFFSET.clone().multiplyScalar(this.span()),
			new THREE.Vector3(),
		);
	}

	dispose() {
		this.running.disposed = true;
		cancelAnimationFrame(this.running.frame);
		this.running.resize?.disconnect();
		this.running.unbind();
		this.controls.dispose();
		this.clearContent();
		this.stars.geometry.dispose();
		this.renderer.dispose();
		this.renderer.domElement.remove();
		this.labelLayer.domElement.remove();
	}

	// ---- internals ----

	private span() {
		return (
			Math.max(
				systemRadius([...this.world.planets.values()].map((n) => n.dto)),
				MIN_SPAN,
			) * SPAN_MARGIN
		);
	}

	private nowMs() {
		return performance.now() + this.clock.serverOffset;
	}

	private clearContent() {
		disposeTree(this.content);
		this.content.clear();
		this.world = {
			...this.world,
			planets: new Map(),
			ships: new Map(),
			pickables: [],
			star: null,
		};
	}

	private build(system: SystemDTO, planets: PlanetDTO[]) {
		const isNewSystem = system.id !== this.world.systemId;
		this.clearContent();
		this.world.systemId = system.id;
		this.world.planetKey = planets.map((p) => p.id).join();
		this.view.follow = null;

		const { star, lights } = createStar(system);
		this.content.add(star, ...lights);
		this.world.star = star;

		for (const planetData of planets) {
			const node = createPlanetNode(planetData);
			setDetail(node, LOW_DETAIL);
			this.content.add(
				node.holder,
				orbitRing(planetData.orbit, ORBIT_SEGMENTS),
			);

			this.world.planets.set(planetData.id, node);
			this.world.pickables.push({
				id: planetData.id,
				object: node.holder,
				radiusPx: PLANET_PICK_RADIUS_PX,
			});
		}

		if (isNewSystem) this.resetCamera();
	}

	private resetCamera() {
		this.controls.maxDistance = this.span() * MAX_ZOOM_OUT;
		this.camera.position.copy(OVERVIEW_OFFSET).multiplyScalar(this.span());
		this.controls.target.set(0, 0, 0);
		this.view.selected = null;
	}

	/** owner colour and name can change while the planet stays (colonised, conquered) */
	private refreshOwner(planet: PlanetDTO) {
		const node = this.world.planets.get(planet.id);

		if (!node) return;

		node.dto = planet;
		node.label.className = `lbl body ${planet.kind}${planet.id === this.view.selected ? " sel" : ""}`;
	}

	private markSelected(id: number | null) {
		this.view.selected = id;

		for (const [planetId, node] of this.world.planets)
			node.label.classList.toggle("sel", planetId === id);
	}

	/** select a body by id; selecting the already selected one does nothing */
	private select(id: number | null) {
		if (id === this.view.selected) return;

		this.markSelected(id);
		const node = id != null ? this.world.planets.get(id) : null;

		if (!node) return;

		if (node.detail < HIGH_DETAIL) setDetail(node, HIGH_DETAIL);

		this.focus(node);
	}

	private focus(node: PlanetNode) {
		const position = node.holder.getWorldPosition(new THREE.Vector3());
		const direction = this.camera.position
			.clone()
			.sub(this.controls.target)
			.normalize();
		this.controls.minDistance = node.radius * MIN_DISTANCE_RADII;
		this.view.follow = node.dto.id;
		this.view.fly = startFly(
			this.camera,
			this.controls,
			position
				.clone()
				.add(
					direction.multiplyScalar(
						Math.max(node.radius * CLOSE_UP_RADII, MIN_CLOSE_UP),
					),
				),
			position,
		);
	}

	/** only fleets flying between two planets of this system are drawn */
	private syncShips(game: GameState, system: SystemDTO) {
		const local = game.fleets.filter((f) => {
			if (
				f.status !== FLEET_STATUS.outbound &&
				f.status !== FLEET_STATUS.returning
			)

				return false;
			const { from, to } = flightOf(game, f, this.nowMs());

			return from.systemId === system.id && to.systemId === system.id;
		});

		const planetIds = new Set(local.map((f) => f.id));

		for (const [id, ship] of this.world.ships) {
			if (planetIds.has(id)) continue;

			this.content.remove(ship.holder, ship.trail);
			disposeTree(ship.holder);
			ship.trail.geometry.dispose();
			this.world.ships.delete(id);
		}

		for (const fleet of local) {
			const existing = this.world.ships.get(fleet.id);

			if (existing) {
				existing.fleet = fleet;

				continue;
			}

			const ship = createShip(fleet);
			this.content.add(ship.holder, ship.trail);
			this.world.ships.set(fleet.id, ship);
		}
	}

	private resize() {
		const width = this.element.clientWidth || DEFAULT_SIZE.width,
			height = this.element.clientHeight || DEFAULT_SIZE.height;
		this.renderer.setSize(width, height);
		this.labelLayer.setSize(width, height);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	/** advance every planet along its orbit by the elapsed time */
	private moveBodies(deltaSeconds: number, now: number) {
		for (const node of this.world.planets.values()) {
			planetPosition(node.dto, now, node.holder.position);
			node.mesh.rotation.y += deltaSeconds * node.spin * PLANET_SPIN_SPEEDUP;
		}

		if (this.world.star) this.world.star.rotation.y += deltaSeconds * STAR_SPIN;

		const game = this.clock.game;

		for (const ship of this.world.ships.values()) {
			const outbound = ship.fleet.status === FLEET_STATUS.outbound;
			const from = this.world.planets.get(
				outbound ? ship.fleet.originId : ship.fleet.targetId,
			);

			const destination = this.world.planets.get(
				outbound ? ship.fleet.targetId : ship.fleet.originId,
			);

			if (!from || !destination || !game) continue;

			placeShip(
				ship,
				from.holder.position,
				destination.holder.position,
				flightOf(game, ship.fleet, now).k,
			);
		}
	}

	/** a tracked planet keeps its place in the view while it orbits */
	private followTarget() {
		const node =
			this.view.follow != null
				? this.world.planets.get(this.view.follow)
				: null;

		if (!node) return;

		const delta = node.holder
			.getWorldPosition(this.scratch)
			.sub(this.controls.target);
		this.camera.position.add(delta);
		this.controls.target.add(delta);
	}

	private loop = (time: number) => {
		if (this.running.disposed) return;

		this.running.frame = requestAnimationFrame(this.loop);
		const dt = Math.min(
			MAX_FRAME_SECONDS,
			(time - this.clock.last) / MS_PER_SECOND,
		);

		this.clock.last = time;
		this.moveBodies(dt, this.nowMs());
		this.stars.position.copy(this.camera.position);

		if (this.view.fly)
			this.view.fly = stepFly(this.view.fly, dt, this.camera, this.controls);
		else this.followTarget();

		this.camera.near = Math.max(
			MIN_NEAR,
			this.camera.position.distanceTo(this.controls.target) * NEAR_SHARE,
		);

		this.camera.far = this.span() * FAR_SPANS;
		this.camera.updateProjectionMatrix();
		this.stars.scale.setScalar(
			(this.camera.far * BACKDROP_FAR_SHARE) / BACKDROP_RADIUS,
		);

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		this.labelLayer.render(this.scene, this.camera);
	};
}
