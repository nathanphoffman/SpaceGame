import Buildings from "@/components/panels/Buildings";
import FleetSend from "@/components/panels/FleetSend";
import FleetsPanel from "@/components/panels/FleetsPanel";
import PlanetPanel from "@/components/panels/PlanetPanel";
import Shipyard from "@/components/panels/Shipyard";
import TopBar from "@/components/panels/TopBar";
import GalaxyView from "@/components/maps/GalaxyView";
import LocalMap from "@/components/maps/LocalMap";
import SolarMap from "@/components/maps/SolarMap";
import SystemView from "@/components/maps/SystemView";
import type { Navigation } from "@/components/hooks/useNavigation";
import type { useGame } from "@/components/hooks/useGame";
import { buildableTypes, shortfallText, stockAfter } from "@/lib/economy";
import { MS_PER_SECOND, productionRates, type FleetDTO, type GameState, type PlanetDTO, type SystemDTO } from "@/lib/defs";
import { planetStats } from "@/lib/planets/planetStats";
import Reports from "./Reports";

type Act = ReturnType<typeof useGame>["act"];
type Props = { game: GameState; error: string; act: Act; now: number; nav: Navigation };

/** everything about the planets the player is looking at, worked out once per render */
function describeScene(game: GameState, navigation: Navigation, nowMs: number) {
  const mine = game.planets.filter((planet) => planet.kind === "player");
  const planet = mine.find((candidate) => candidate.id === navigation.planetId) ?? mine[0];
  const viewed = game.planets.find((candidate) => candidate.id === navigation.viewId) ?? planet;
  const target = game.planets.find((candidate) => candidate.id === navigation.targetId && candidate.kind !== "player") ?? null;

  // look up a loaded system by id; one is always loaded for a planet we show
  const systemOf = (id: number) => game.systems.find((system) => system.id === id)!;
  const shown = game.systems.find((system) => system.id === navigation.systemId) ?? systemOf(viewed.systemId); // (a just-clicked system arrives with the next update)
  const composition = planetStats(planet.seed).composition;
  const rate = productionRates(planet.buildings, composition);
  const stock = stockAfter(planet, rate, Math.max(0, (nowMs - game.nowMs) / MS_PER_SECOND));

  return { mine, planet, viewed, target, systemOf, shown, composition, rate, stock };
}

type Scene = ReturnType<typeof describeScene>;

function SolarPanel({ game, nav, now, scene }: { game: GameState; nav: Navigation; now: number; scene: Scene }) {
  const shared = { game, system: scene.shown as SystemDTO, viewed: scene.viewed, nowMs: now, onSelect: nav.selectPlanet };

  return (
    <>
      <div style={{ textAlign: "right", marginBottom: 6 }}>
        <button className="ghost" onClick={() => nav.setView3d(!nav.view3d)}>{nav.view3d ? "Show flat map" : "Show 3D view"}</button>
      </div>
      {nav.view3d ? <SystemView {...shared} /> : <SolarMap {...shared} />} {/* show the 3D system or the flat map */}
    </>
  );
}

function GalaxyPanel({ game, nav, now, shownSystemId }: { game: GameState; nav: Navigation; now: number; shownSystemId: number }) {
  if (nav.atGalaxy) return <GalaxyView game={game} current={nav.sector} onSelect={nav.openSector} />;

  return <LocalMap key={nav.sector.join(",")} game={game} sector={nav.sector} shownSystemId={shownSystemId} nowMs={now} onSelect={nav.setSystemId} onBack={() => nav.setAtGalaxy(true)} />;
}

function LeftColumn({ game, nav, now, scene, guards }: { game: GameState; nav: Navigation; now: number; scene: Scene; guards: FleetDTO[] }) {
  return (
    <div>
      <PlanetPanel planet={scene.viewed} systemSeed={scene.systemOf(scene.viewed.systemId).seed} guards={guards.filter((fleet) => fleet.targetId === scene.viewed.id)} />
      <SolarPanel game={game} nav={nav} now={now} scene={scene} />
      <GalaxyPanel game={game} nav={nav} now={now} shownSystemId={scene.shown.id} />
    </div>
  );
}

function RightColumn({ game, error, act, now, nav, scene }: Props & { scene: Scene }) {
  const { planet, viewed } = scene;
  const activeFleets = game.fleets.filter((fleet) => fleet.status !== "done");

  const planetName = (id: number) => game.planets.find((candidate) => candidate.id === id)?.name ?? "?"; // a planet's name from its id, or ? when that planet isn't loaded

  const queueOf = (kind: "building" | "ship") => game.queue.filter((item) => item.planetId === planet.id && item.kind === kind); // this planet's queue entries of one kind

  const shortfall = (cost: Parameters<typeof shortfallText>[0]) => shortfallText(cost, scene.stock);
  const isMine = viewed.kind === "player";

  return (
    <div>
      {/* back to your base after sending, so its buildings/shipyard show again */}
      <FleetSend game={game} planet={planet} target={scene.target} sendAction={act} onSent={() => nav.setViewId(planet.id)} />
      {error && <div className="panel err">{error}</div>}
      {isMine && <Buildings planet={planet} composition={scene.composition} types={buildableTypes(planet, scene.composition)} queue={queueOf("building")} nowMs={now} shortfall={shortfall} sendAction={act} />}
      <Shipyard show={isMine} planet={planet} queue={queueOf("ship")} nowMs={now} shortfall={shortfall} sendAction={act} />
      <FleetsPanel planet={planet} showHangar={isMine} fleets={activeFleets} planetName={planetName} nowMs={now} sendAction={act} />
      <Reports fleets={game.fleets} />
    </div>
  );
}

/** the whole game screen: top bar, maps and planet details on the left, build and fleet panels on the right */
export default function GameScreen(props: Props) {
  const { game, act, now, nav } = props;
  const scene = describeScene(game, nav, now);
  const guards = game.fleets.filter((fleet) => fleet.status === "stationed");

  return (
    <>
      <TopBar
        planets={scene.mine} current={scene.planet} stock={scene.stock} rate={scene.rate}
        onSelect={(id) => nav.goToBase(id, scene.systemOf(game.planets.find((candidate: PlanetDTO) => candidate.id === id)!.systemId))} // picking one of your planets moves the maps to its system
        onReset={() => confirm("Reset the whole game?") && act({ action: "reset" })}
      />
      <div className="layout">
        <LeftColumn game={game} nav={nav} now={now} scene={scene} guards={guards} />
        <RightColumn {...props} scene={scene} />
      </div>
    </>
  );
}
