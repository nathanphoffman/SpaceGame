"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession } from "@/lib/api/core/session";
import { GameStatus } from "@/components/game/shell/GameStatus";
import LocalMap from "@/components/maps/LocalMap";
import SolarMap from "@/components/maps/SolarMap";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { useGameData, useOutcome, type GameData } from "@/lib/api/game/gameView";
import { useGameEvents, type LiveEvents } from "@/lib/api/game/useGameEvents";
import { syncedNowMs } from "@/lib/galaxy/flight";
import { GameTopBar } from "@/components/game/shell/GameTopBar";
import { AttackWarnings } from "@/components/game/shell/AttackWarnings";
import { BattleToast } from "@/components/game/shell/BattleToast";
import { FleetList } from "@/components/game/panels/FleetList";
import { FleetSendDialog } from "@/components/game/commands/FleetSendDialog";
import { TradePanel } from "@/components/game/panels/TradePanel";
import { PlanetDetails } from "@/components/game/panels/PlanetDetails";
import { useEscape } from "@/components/game/shell/useEscape";
import { EndScreen } from "@/components/game/shell/EndScreen";
import { MS_PER_SECOND } from "@/lib/defs";

const TICK_MS = MS_PER_SECOND;

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
function Maps({ gameId, data, live, localNow }: { gameId: string; data: GameData; live: LiveEvents; localNow: number }) {
	const { game, ids } = toGameState(data.map, data.view);
	const [systemId, setSystemId] = useState(game.systems[0]?.id ?? 0);
	const [pickedId, setPickedId] = useState<string>();
	useEscape(pickedId !== undefined ? () => setPickedId(undefined) : undefined);

	// every planet in every system, then the one matching the picked id
	const picked = data.map.systems.flatMap((entry) => entry.planets).find((planet) => planet.id === pickedId);
	const nowMs = syncedNowMs(game.nowMs, data.fetchedAtMs, localNow);
	// Game time ticks forward locally every second; each fresh answer from the server resets it to the real value.
	const gameTime = Math.floor(nowMs / MS_PER_SECOND);
	const system = game.systems.find((candidate) => candidate.id === systemId) ?? game.systems[0];
	const viewed = game.planets.find((planet) => planet.systemId === system?.id);

	if (!system || !viewed) return <p>No systems yet.</p>;

	const holding = data.view.holdings.find((entry) => entry.planet === picked?.id);

	// every planet in every system, minus the picked one
	const destinations = data.map.systems.flatMap((entry) => entry.planets).filter((planet) => planet.id !== picked?.id);

	return (
		<div className="game-grid">
			<div className="game-maps">
			<LocalMap game={game} sector={[system.sectorX, system.sectorY]} shownSystemId={system.id} nowMs={nowMs} onSelect={setSystemId} onBack={() => undefined} />
			<SolarMap game={game} system={system} viewed={viewed} nowMs={nowMs} onSelect={(planet) => setPickedId(ids.idOf(planet.id))} />
			</div>
			<div className="game-side">
			{picked && <PlanetDetails gameId={gameId} planet={picked} holding={holding} gameTime={gameTime} />}
			{holding && <FleetSendDialog key={holding.planet} gameId={gameId} holding={holding} destinations={destinations} gameTime={gameTime} />}
			{holding && <TradePanel key={holding.planet} gameId={gameId} holding={holding} destinations={destinations} gameTime={gameTime} />}
			<AttackWarnings fleets={data.view.fleets} gameTime={gameTime} spotted={live.spotted} />
			{live.reconnecting && <p role="status">Reconnecting to live updates…</p>}
			<BattleToast gameId={gameId} reportId={live.battleReportId} />
			<FleetList gameId={gameId} fleets={data.view.fleets} gameTime={gameTime} />
			</div>
		</div>
	);
}

/** The game page: loads the map and the player view, keeps them fresh from SignalR, and draws the top bar and maps. */
export function GameShell({ gameId }: { gameId: string }) {
	const router = useRouter();
	const localNow = useLocalNow();
	const [missingToken, setMissingToken] = useState(false);
	const live = useGameEvents(gameId);
	const { data, error, refetch } = useGameData(gameId);
	const finished = live.endedOutcome !== null || (data !== undefined && data.view.timeLeftSeconds <= 0);
	const outcome = useOutcome(finished ? gameId : undefined);

	useEffect(() => {
		if (loadSession()?.gameId === gameId) return;
		setMissingToken(true);
		router.replace("/");
	}, [gameId, router]);

	if (missingToken) return <GameStatus kind="redirecting" />;

	if (error) return <GameStatus kind="error" error={error} onRetry={refetch} />;

	if (!data) return <GameStatus kind="loading" />;

	if (finished) return <EndScreen view={data.view} outcome={outcome} fallbackWinner={live.endedOutcome} />;

	return (
		<main>
			<GameTopBar view={data.view} timeLeftSeconds={Math.max(0, data.view.timeLeftSeconds - Math.floor((localNow - data.fetchedAtMs) / MS_PER_SECOND))} />
			<Maps gameId={gameId} data={data} live={live} localNow={localNow} />
		</main>
	);
}
