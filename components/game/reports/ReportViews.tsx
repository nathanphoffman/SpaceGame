"use client";

import Link from "next/link";
import { reportOutcome, useReport, useReports, type BattleReportDto } from "@/lib/api/reports";

export function ReportSummary({ report }: { report: BattleReportDto }) {
	return (
		<dl>
			<dt>Planet</dt>
			<dd>{report.planet}</dd>
			<dt>Result</dt>
			<dd>{reportOutcome(report)}</dd>
			<dt>Rounds</dt>
			<dd>{report.rounds}</dd>
			<dt>Game time</dt>
			<dd>{report.time}s</dd>
		</dl>
	);
}

export function ReportList({ gameId, reports }: { gameId: string; reports: BattleReportDto[] }) {
	if (reports.length === 0) return <p className="dim">No battles yet.</p>;

	return (
		<ul>
			{reports.map((report) => (
				<li key={report.id}>
					<Link href={`/game/${gameId}/reports/${report.id}`}>{`${report.planet}: ${reportOutcome(report)}`}</Link>
				</li>
			))}

		</ul>
	);
}

export function ReportsPage({ gameId }: { gameId: string }) {
	const { data, error } = useReports(gameId);

	if (error) return <p role="alert">{(error as Error).message}</p>;

	return (
		<main>
			<h2>Battle reports</h2>
			<Link href={`/game/${gameId}`}>Back to the game</Link>
			{data ? <ReportList gameId={gameId} reports={data} /> : <p>Loading reports…</p>}
		</main>
	);
}

export function ReportDetailPage({ gameId, reportId }: { gameId: string; reportId: string }) {
	const { data, error } = useReport(gameId, reportId);

	if (error) return <p role="alert">{(error as Error).message}</p>;

	return (
		<main>
			<h2>Battle report</h2>
			<Link href={`/game/${gameId}/reports`}>All reports</Link>
			{data ? <ReportSummary report={data} /> : <p>Loading report…</p>}
		</main>
	);
}
