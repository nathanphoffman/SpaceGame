"use client";

import GameScreen from "@/components/screens/GameScreen";
import { useGame } from "@/components/hooks/useGame";
import { useNavigation } from "@/components/hooks/useNavigation";

export default function Page() {
  const nav = useNavigation();
  const { game, error, act, now } = useGame(nav.view);

  if (!game) return <div style={{ padding: 24 }}>{error || "Loading…"}</div>;

  return <GameScreen game={game} error={error} act={act} now={now} nav={nav} />;
}
