"use client";

import { useEffect, useState } from "react";
import LocalMap from "@/components/maps/LocalMap";
import SolarMap from "@/components/maps/SolarMap";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { useGameData, useOutcome, type GameData } from "@/lib/api/gameView";
import { useGameEvents, type LiveEvents } from "@/lib/api/useGameEvents";
import { syncedNowMs } from "@/lib/galaxy/flight";
import { GameTopBar } from "./GameTopBar";
import { AttackWarnings } from "./AttackWarnings";
import { BattleToast } from "./BattleToast";
import { FleetList } from "./FleetList";
import { FleetSendDialog } from "./FleetSendDialog";
import { TradePanel } from "./TradePanel";
import { PlanetDetails } from "./PlanetDetails";
import { EndScreen } from "./EndScreen";

const TICK_MS = 1000;

/** Local clock that re-renders every second so ships keep moving between server updates. */
function useLocalNow(): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);

		return () => clearInterval(timer);
	}, []);

	return now;
}

/** The galaxy and system maps for one game; the viewed system is local state, and the click handlers for ship orders are not wired up yet. */
function Maps({ gameId, data, live }: { gameId: string; data: GameData; live: LiveEvents }) {
	const { game, ids } = toGameState(data.map, data.view);
	const localNow = useLocalNow();
	const [systemId, setSystemId] = useState(game.systems[0]?.id ?? 0);
	const [pickedId, setPickedId] = useState<string>();
	const picked = data.map.systems.flatMap((entry) => entry.planets).find((planet) => planet.id === pickedId);
	const nowMs = syncedNowMs(game.nowMs, data.fetchedAtMs, localNow);
	const system = game.systems.find((candidate) => candidate.id === systemId) ?? game.systems[0];
	const viewed = game.planets.find((planet) => planet.systemId === system?.id);

	if (!system || !viewed) return <p>No systems yet.</p>;

	const holding = data.view.holdings.find((entry) => entry.planet === picked?.id);
	const destinations = data.map.systems.flatMap((entry) => entry.planets).filter((planet) => planet.id !== picked?.id);

	return (
		<>
			<LocalMap game={game} sector={[system.sectorX, system.sectorY]} shownSystemId={system.id} nowMs={nowMs} onSelect={setSystemId} onBack={() => undefined} />
			<SolarMap game={game} system={system} viewed={viewed} nowMs={nowMs} onSelect={(planet) => setPickedId(ids.idOf(planet.id))} />
			{picked && <PlanetDetails gameId={gameId} planet={picked} holding={holding} gameTime={data.view.gameTime} upgrades={data.view.upgrades} />}
			{holding && <FleetSendDialog key={holding.planet} gameId={gameId} holding={holding} destinations={destinations} gameTime={data.view.gameTime} />}
			{holding && <TradePanel key={holding.planet} gameId={gameId} holding={holding} destinations={destinations} gameTime={data.view.gameTime} />}
			<AttackWarnings fleets={data.view.fleets} gameTime={data.view.gameTime} spotted={live.spotted} />
			{live.reconnecting && <p role="status">Reconnecting to live updates…</p>}
			<BattleToast gameId={gameId} reportId={live.battleReportId} />
			<FleetList gameId={gameId} fleets={data.view.fleets} gameTime={data.view.gameTime} />
		</>
	);
}

/** The game page: loads the map and the player view, keeps them fresh from SignalR, and draws the top bar and maps. */
export function GameShell({ gameId }: { gameId: string }) {
	const live = useGameEvents(gameId);
	const { data, error } = useGameData(gameId);
	const finished = live.endedOutcome !== null || (data !== undefined && data.view.timeLeftSeconds <= 0);
	const outcome = useOutcome(gameId, finished);

	if (error) return <p role="alert">{error.message}</p>;

	if (!data) return <p>Loading game…</p>;

	if (finished) return <EndScreen view={data.view} outcome={outcome} fallbackWinner={live.endedOutcome} />;

	return (
		<main>
			<GameTopBar view={data.view} />
			<Maps gameId={gameId} data={data} live={live} />
		</main>
	);
}
