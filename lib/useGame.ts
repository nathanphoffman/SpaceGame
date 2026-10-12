import { useCallback, useEffect, useState } from "react";
import type { GameState } from "@/lib/defs";

/** Polls the server for game state and exposes `act` for sending actions. `now` is the server clock, ticking locally. */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [offset, setOffset] = useState(0); // server clock - client clock
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState("");

  const apply = (g: GameState) => {
    setGame(g);
    setOffset(g.now - Date.now());
  };
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/state");
      if (r.ok) apply(await r.json());
      else setError((await r.json()).error ?? "Could not load game (is the database running?)");
    } catch {
      setError("Could not reach server");
    }
  }, []);

  useEffect(() => {
    refresh();
    const a = setInterval(refresh, 2000);
    const b = setInterval(() => setClock(Date.now()), 250);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  const act = async (body: object) => {
    const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) setError(j.error);
    else { setError(""); apply(j); }
  };

  return { game, error, act, now: clock + offset };
}
