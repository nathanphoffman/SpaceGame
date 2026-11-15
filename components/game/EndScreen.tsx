import type { OutcomeDto, PlayerViewDto } from "@/lib/api/adapters/schemas";

/** Final result: who won, why, the scores and a small per-player table (for fun). */
export function EndScreen({ view, outcome, fallbackWinner }: { view: PlayerViewDto; outcome?: OutcomeDto; fallbackWinner: string | null }) {
	const winner = outcome?.winner ?? fallbackWinner ?? "unknown";
	const contributions = outcome?.contributions ?? [];

	return (
		<main className="end-screen">
			<h1>Game over</h1>
			<p>{`Winner: ${winner}`}</p>
			{outcome?.reason && <p>{outcome.reason}</p>}
			<p>{`Final score: Team ${outcome?.teamScore ?? view.teamScore}, Enemy ${outcome?.enemyScore ?? view.enemyScore}`}</p>
			{contributions.length > 0 && (
				<table>
					<thead>
						<tr>
							<th>Player</th>
							<th>Points</th>
							<th>Battles won</th>
							<th>Planets captured</th>
						</tr>
					</thead>
					<tbody>
						{contributions.map((row) => (
							<tr key={row.player}>
								<td>{row.player}</td>
								<td>{row.points}</td>
								<td>{row.battlesWon}</td>
								<td>{row.planetsCaptured}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</main>
	);
}
