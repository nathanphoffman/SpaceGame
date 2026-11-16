import Link from "next/link";

/** Small notice that a battle was resolved, with a link to its report. */
export function BattleToast({ gameId, reportId }: { gameId: string; reportId: string | null }) {
	if (!reportId) return null;

	return (
		<div className="panel" role="status">
			A battle was fought. <Link href={`/game/${gameId}/reports/${reportId}`}>Read the report</Link>
		</div>
	);
}
