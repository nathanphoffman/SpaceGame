import { useCallback, useEffect, useState } from "react";
import type { GameState } from "@/lib/defs";

const REFRESH_MS = 2000; // how often the game state is fetched from the server
const CLOCK_TICK_MS = 250; // how often the on-screen clock moves

/** what the player is looking at: the server only sends (and generates) that part of the galaxy */
export type GameView = { sx: number; sy: number; system?: number };

const JSON_HEADERS = { "Content-Type": "application/json" };
const NO_DATABASE_MESSAGE = "Could not load game (is the database running?)";

/** asks the server for the part of the galaxy the player is looking at */
async function fetchState(view: GameView) {
	const { sx, sy, system } = view;
	const response = await fetch(
		`/api/state?sx=${sx}&sy=${sy}${system ? `&system=${system}` : ""}`,
	);

	const body = await response.json();

	return response.ok
		? { state: body as GameState }
		: { error: (body.error as string | undefined) ?? NO_DATABASE_MESSAGE };
}

/** sends an action (build, ship, send, recall, reset) together with what the player is looking at */
async function postAction(body: object, view: GameView) {
	const response = await fetch("/api/action", {
		method: "POST",
		headers: JSON_HEADERS,
		body: JSON.stringify({ ...body, view }),
	});

	const reply = await response.json();

	return response.ok
		? { state: reply as GameState }
		: { error: reply.error as string };
}

/** Polls the server for game state and exposes `act` for sending actions. `now` is the server clock, ticking locally. */
export function useGame(view: GameView) {
	const { sx, sy, system } = view;
	const [game, setGame] = useState<GameState | null>(null);
	const [offset, setOffset] = useState(0); // server clock - client clock
	const [clock, setClock] = useState(Date.now());
	const [error, setError] = useState("");

	const apply = (state: GameState) => {
		setGame(state);
		setOffset(state.nowMs - Date.now());
	};

	const refresh = useCallback(async () => {
		try {
			const result = await fetchState({ sx, sy, system });

			if (result.state) apply(result.state);
			else setError(result.error);
		} catch (failure) {
			console.error("Could not reach the game server", failure);
			setError("Could not reach server");
		}
	}, [sx, sy, system]);

	useEffect(() => {
		refresh();
		const refreshTimer = setInterval(refresh, REFRESH_MS);
		const clockTimer = setInterval(() => setClock(Date.now()), CLOCK_TICK_MS);

		return () => {
			clearInterval(refreshTimer);
			clearInterval(clockTimer);
		};
	}, [refresh]);

	/** an error from an action stays on screen until the next action works */
	const sendAction = async (body: object) => {
		const result = await postAction(body, { sx, sy, system });

		if (!result.state) return setError(result.error);

		setError("");
		apply(result.state);
	};

	return { game, error, act: sendAction, nowMs: clock + offset };
}
