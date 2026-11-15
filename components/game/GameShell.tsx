"use client";

import { useEffect, useState } from "react";
import LocalMap from "@/components/maps/LocalMap";
import SolarMap from "@/components/maps/SolarMap";
import { toGameState } from "@/lib/api/adapters/mapAdapter";
import { useGameData, type GameData } from "@/lib/api/gameView";
import { useGameEvents } from "@/lib/api/useGameEvents";
import { syncedNowMs } from "@/lib/galaxy/flight";
import { GameTopBar } from "./GameTopBar";
import { PlanetDetails } from "./PlanetDetails";

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
function Maps({ gameId, data }: { gameId: string; data: GameData }) {
	const { game, ids } = toGameState(data.map, data.view);
	const localNow = useLocalNow();
	const [systemId, setSystemId] = useState(game.systems[0]?.id ?? 0);
	const [pickedId, setPickedId] = useState<string>();
	const picked = data.map.systems.flatMap((entry) => entry.planets).find((planet) => planet.id === pickedId);
	const nowMs = syncedNowMs(game.nowMs, data.fetchedAtMs, localNow);
	const system = game.systems.find((candidate) => candidate.id === systemId) ?? game.systems[0];
	const viewed = game.planets.find((planet) => planet.systemId === system?.id);

	if (!system || !viewed) return <p>No systems yet.</p>;

	return (
		<>
			<LocalMap game={game} sector={[system.sectorX, system.sectorY]} shownSystemId={system.id} nowMs={nowMs} onSelect={setSystemId} onBack={() => undefined} />
			<SolarMap game={game} system={system} viewed={viewed} nowMs={nowMs} onSelect={(planet) => setPickedId(ids.idOf(planet.id))} />
			{picked && <PlanetDetails gameId={gameId} planet={picked} />}
		</>
	);
}

/** The game page: loads the map and the player view, keeps them fresh from SignalR, and draws the top bar and maps. */
export function GameShell({ gameId }: { gameId: string }) {
	useGameEvents(gameId);
	const { data, error } = useGameData(gameId);

	if (error) return <p role="alert">{error.message}</p>;

	if (!data) return <p>Loading game…</p>;

	return (
		<main>
			<GameTopBar view={data.view} />
			<Maps gameId={gameId} data={data} />
		</main>
	);
}
