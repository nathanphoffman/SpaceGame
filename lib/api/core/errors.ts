import { ApiError } from "@/lib/api/core/client";
import { HTTP_CONFLICT, HTTP_FORBIDDEN, HTTP_NOT_FOUND } from "@/lib/api/core/httpStatus";

const GENERIC_MESSAGE = "Something went wrong";

const FALLBACKS: Record<number, string> = {
	[HTTP_NOT_FOUND]: "We could not find that game. Check the code.",
	[HTTP_CONFLICT]: "That could not be done right now (the game may be full, started, or the name is taken).",
	[HTTP_FORBIDDEN]: "Only the host can do that.",
};

/** A short sentence for the player: the server's ProblemDetails text first, then a status-based fallback. */
export function friendlyError(error: unknown): string {
	if (error instanceof ApiError) {
		return error.problem.detail ?? error.problem.title ?? FALLBACKS[error.status] ?? error.message;
	}

	return error instanceof Error ? error.message : GENERIC_MESSAGE;
}
