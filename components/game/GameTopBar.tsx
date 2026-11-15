import type { PlayerViewDto } from "@/lib/api/adapters/schemas";

export const WIN_SCORE = 500;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const PAD = 2;

/** Time left as h:mm:ss. */
export function formatTimeLeft(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
	const minutes = Math.floor(total / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR;
	const rest = total % SECONDS_PER_MINUTE;

	const two = (value: number) => String(value).padStart(PAD, "0");

	return `${hours}:${two(minutes)}:${two(rest)}`;
}

/** One score readout like "Team 12/500"; plain string building, nothing clever. */
function scoreText(label: string, score: number): string {
	return label + " " + score + "/" + WIN_SCORE;
}

/** Game clock, team and enemy score toward the win score, and the stockpile of each element. */
export function GameTopBar({ view }: { view: PlayerViewDto }) {
	return (
		<div className="topbar">
			<h1>Space Game</h1>
			<span title="Time left">⏱ {formatTimeLeft(view.timeLeftSeconds)}</span>
			<span>{scoreText("Team", view.teamScore)}</span>
			<span>{scoreText("Enemy", view.enemyScore)}</span>
			<div className="spacer" />
			{Object.entries(view.stockpile).map(([element, amount]) => (
				<div key={element} className="res">
					<b>{element}</b> <span>{Math.floor(amount)}</span>
				</div>
			))}

		</div>
	);
}
