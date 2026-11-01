import { useCallback, useEffect, useState } from "react";
import type { GameState } from "@/lib/defs";

const REFRESH_MS = 2000; // how often the game state is fetched from the server
const CLOCK_TICK_MS = 250; // how often the on-screen clock moves

/** what the player is looking at: the server only sends (and generates) that part of the galaxy */
export type GameView = { sx: number; sy: number; system?: number };

/** Polls the server for game state and exposes `act` for sending actions. `now` is the server clock, ticking locally. */
export function useGame(view: GameView) {
  const { sx, sy, system } = view;
  const [game, setGame] = useState<GameState | null>(null);
  const [offset, setOffset] = useState(0); // server clock - client clock
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState("");

  const apply = (loadedGame: GameState) => {
    setGame(loadedGame);
    setOffset(loadedGame.nowMs - Date.now());
  };

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/state?sx=${sx}&sy=${sy}${system ? `&system=${system}` : ""}`);

      if (r.ok) apply(await r.json());
      else setError((await r.json()).error ?? "Could not load game (is the database running?)");
    } catch (failure) {
      console.error("Could not reach the game server", failure);
      setError("Could not reach server");
    }
  }, [sx, sy, system]);

  useEffect(() => {
    refresh();
    const refreshTimer = setInterval(refresh, REFRESH_MS);
    const clockTimer = setInterval(() => setClock(Date.now()), CLOCK_TICK_MS);

    return () => { clearInterval(refreshTimer); clearInterval(clockTimer); };
  }, [refresh]);

  const sendAction = async (body: object) => {
    const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, view: { sx, sy, system } }) });
    const reply = await r.json();

    if (!r.ok) setError(reply.error);
    else { setError(""); apply(reply); }
  };

  return { game, error, act: sendAction, nowMs: clock + offset };
}
