import type { Lobby } from "@/lib/api/lobby";

type Props = {
	lobby: Lobby;
	isHost: boolean;
	starting: boolean;
	error?: string;
	onStart: () => void;
	onCopy: () => void;
};

/** Pure display of the lobby; data and actions come from LobbyPage. */
export function LobbyView({ lobby, isHost, starting, error, onStart, onCopy }: Props) {
	return (
		<main style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
			<h1>Lobby</h1>
			<p>
				Game code: <strong>{lobby.code}</strong>{" "}
				<button type="button" onClick={onCopy}>Copy link</button>
			</p>
			<h2>Players ({lobby.players.length})</h2>
			<ul>
				{lobby.players.map((player) => (
					<li key={player.id}>
						{player.name}
						{player.isHost ? " (host)" : ""}
					</li>
				))}

			</ul>
			{isHost ? (
				<button type="button" onClick={onStart} disabled={starting}>Start game</button>
			) : (
				<p>Waiting for the host to start the game.</p>
			)}

			{error && <p role="alert">{error}</p>}
		</main>
	);
}
