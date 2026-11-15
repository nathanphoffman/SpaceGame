import Link from "next/link";
import { ApiError } from "@/lib/api/core/client";
import { friendlyError } from "@/lib/api/core/errors";

const HTTP_NOT_FOUND = 404;

const isNotFound = (error: Error): boolean => error instanceof ApiError && error.status === HTTP_NOT_FOUND;

/** What the game page shows instead of the game: loading, redirecting, not found, or a failed request with a retry. */
export function GameStatus({ kind, error, onRetry }: { kind: "loading" | "redirecting" | "error"; error?: Error; onRetry?: () => void }) {
	if (kind === "loading") return <p role="status">Loading game…</p>;

	if (kind === "redirecting") return <p role="status">No saved login for this game. Taking you home…</p>;

	if (error && isNotFound(error)) {
		return (
			<main>
				<p role="alert">We could not find that game.</p>
				<Link href="/">Back to home</Link>
			</main>
		);
	}

	return (
		<main>
			<p role="alert">{friendlyError(error)}</p>
			{onRetry && (
				<button type="button" onClick={onRetry}>
					Try again
				</button>
			)}
			<Link href="/">Back to home</Link>
		</main>
	);
}
