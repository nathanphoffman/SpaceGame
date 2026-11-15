import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api/core/client";
import { clearSession, loadSession, SESSION_KEY, saveSession } from "@/lib/api/core/session";

function memoryStorage(): Storage {
	const data = new Map<string, string>();

	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, v),
	};
}

const session = { gameId: "g1", playerId: "p1", token: "tok" };

beforeEach(() => {
	vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("session", () => {
	it("round-trips and clears", () => {
		saveSession(session);
		expect(loadSession()).toEqual(session);
		clearSession();
		expect(loadSession()).toBeNull();
	});

	it("ignores malformed data", () => {
		localStorage.setItem(SESSION_KEY, "{nope");
		expect(loadSession()).toBeNull();
		localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId: 1 }));
		expect(loadSession()).toBeNull();
	});

	it("is safe when storage is unavailable", () => {
		vi.stubGlobal("localStorage", undefined);
		expect(loadSession()).toBeNull();
		expect(() => saveSession(session)).not.toThrow();
		expect(() => clearSession()).not.toThrow();
	});

	it("is safe when storage throws", () => {
		const broken = memoryStorage();
		broken.getItem = () => {
			throw new TypeError("blocked");
		};

		broken.setItem = () => {
			throw new TypeError("full");
		};

		vi.stubGlobal("localStorage", broken);
		expect(loadSession()).toBeNull();
		expect(() => saveSession(session)).not.toThrow();
	});
});

describe("apiFetch", () => {
	it("sends the bearer token and parses json", async () => {
		saveSession(session);
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 })));
		vi.stubGlobal("fetch", fetchMock);
		await expect(apiFetch("/api/x", { method: "GET" })).resolves.toEqual({ ok: 1 });
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/x");
		expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
	});

	it("sends no auth header without a session", async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
		vi.stubGlobal("fetch", fetchMock);
		await apiFetch("/api/x");
		const init = fetchMock.mock.calls[0][1] as RequestInit;
		expect(new Headers(init.headers).has("Authorization")).toBe(false);
	});

	it("turns ProblemDetails into ApiError", async () => {
		const body = { title: "Bad", detail: "Not enough iron", status: 400 };
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 })));
		const error = await apiFetch("/api/x").catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(400);
		expect((error as ApiError).message).toBe("Not enough iron");
	});

	it("handles non-json error bodies and empty success", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));
		await expect(apiFetch("/api/x")).rejects.toBeInstanceOf(ApiError);
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
		await expect(apiFetch("/api/x")).resolves.toBeUndefined();
	});
});
