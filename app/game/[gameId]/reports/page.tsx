import { ReportsPage } from "@/components/game/ReportViews";

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;

	return <ReportsPage gameId={gameId} />;
}
