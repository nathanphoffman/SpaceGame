import { ReportsPage } from "@/components/game/reports/ReportViews";

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;

	return <ReportsPage gameId={gameId} />;
}
