import { ReportDetailPage } from "@/components/game/reports/ReportViews";

export default async function Page({ params }: { params: Promise<{ gameId: string; id: string }> }) {
	const { gameId, id } = await params;

	return <ReportDetailPage gameId={gameId} reportId={id} />;
}
