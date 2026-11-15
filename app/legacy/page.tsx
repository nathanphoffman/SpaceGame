"use client";

import { useGame } from "@/components/hooks/useGame";
import { useNavigation } from "@/components/hooks/useNavigation";
import GameScreen from "@/components/screens/GameScreen";

export default function Page() {
	const navigation = useNavigation();
	const { game, error, act, nowMs } = useGame(navigation.view);

	if (!game) return <div style={{ padding: 24 }}>{error || "Loading…"}</div>;

	return (
		<GameScreen
			game={game}
			error={error}
			act={act}
			nowMs={nowMs}
			nav={navigation}
		/>
	);
}
