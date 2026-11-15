export type Session = {
	gameId: string;
	playerId: string;
	token: string;
};

export const SESSION_KEY = "spacegame.session";

function storage(): Storage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch (error) {
		console.warn("localStorage unavailable", error);
		// Accessing localStorage can throw (blocked cookies); behave as if there is no storage.
		return null;
	}
}

/** Narrows parsed JSON to a Session; anything with a missing or non-string field is rejected. */
function isSession(value: unknown): value is Session {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;

	return (
		typeof v.gameId === "string" &&
		typeof v.playerId === "string" &&
		typeof v.token === "string"
	);
}

export function loadSession(): Session | null {
	try {
		const raw = storage()?.getItem(SESSION_KEY);

		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);

		return isSession(parsed) ? parsed : null;
	} catch (error) {
		console.warn("Could not load the saved session", error);
		// Corrupt JSON or blocked storage: treat as signed out rather than crash.
		return null;
	}
}

export function saveSession(session: Session): void {
	try {
		storage()?.setItem(SESSION_KEY, JSON.stringify(session));
	} catch (error) {
		console.warn("Could not save the session", error);
		// Storage can be full or blocked; the player just has to join again.
	}
}

export function clearSession(): void {
	try {
		storage()?.removeItem(SESSION_KEY);
	} catch (error) {
		console.warn("Could not clear the session", error);
		// Nothing to clear if storage is blocked.
	}
}
