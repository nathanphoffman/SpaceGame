"use client";

import { useState } from "react";
import { HowToPlay } from "@/components/game/shell/HowToPlay";
import { useEscape } from "@/components/game/shell/useEscape";
import type { PlayerViewDto } from "@/lib/api/adapters/schemas";

export const WIN_SCORE = 500;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const PAD = 2;
const PERCENT = 100;

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

/** Share of the win score reached, 0 to 100. */
export function scorePercent(score: number): number {
	return Math.min(PERCENT, Math.max(0, (score / WIN_SCORE) * PERCENT));
}

function ScoreBar({ label, score }: { label: string; score: number }) {
	return (
		<span className="scorebar" title={scoreText(label, score)}>
			<span>{scoreText(label, score)}</span>
			<progress max={WIN_SCORE} value={Math.min(score, WIN_SCORE)} aria-label={label + " score"} />
		</span>
	);
}

/** Game clock, team and enemy score toward the win score, and the stockpile of each element. */
export function GameTopBar({ view }: { view: PlayerViewDto }) {
	const [helpOpen, setHelpOpen] = useState(false);

	useEscape(helpOpen, () => setHelpOpen(false));

	return (
		<div className="topbar">
			<h1>Space Game</h1>
			<span title="Time left">⏱ {formatTimeLeft(view.timeLeftSeconds)}</span>
			<ScoreBar label="Team" score={view.teamScore} />
			<ScoreBar label="Enemy" score={view.enemyScore} />
			<button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>? How to play</button>
			{helpOpen && <HowToPlay onClose={() => setHelpOpen(false)} />}
			<div className="spacer" />
			{Object.entries(view.stockpile).map(([element, amount]) => (
				<div key={element} className="res">
					<b>{element}</b> <span>{Math.floor(amount)}</span>
				</div>
			))}

		</div>
	);
}
