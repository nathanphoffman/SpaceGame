import { GameShell } from "@/components/game/shell/GameShell";

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;

	return <GameShell gameId={gameId} />;
}
