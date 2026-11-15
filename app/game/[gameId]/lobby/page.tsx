import { LobbyPage } from "@/components/lobby/LobbyPage";

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;

	return <LobbyPage gameId={gameId} />;
}
