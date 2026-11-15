import { WIN_SCORE } from "@/components/game/shell/GameTopBar";

/** Short rules summary, shown from the top bar. Closed with the button or Escape. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
	return (
		<section className="howto" role="dialog" aria-label="How to play">
			<h2>How to play</h2>
			<ul>
				<li>Hold objective planets to score. The first side to {WIN_SCORE} points wins.</li>
				<li>The enemy scores too, and it attacks Earth now and then. If it wins a battle at Earth, you lose.</li>
				<li>Claim the enemy home world with a Colony ship to win at once.</li>
				<li>Fog of war: you only see systems near your planets and fleets. Watch the warning strip for incoming enemies.</li>
				<li>The game also ends after one week. The higher score wins, and a tie goes to the enemy.</li>
				<li>Press Escape to close panels.</li>
			</ul>
			<button type="button" onClick={onClose}>Close</button>
		</section>
	);
}
