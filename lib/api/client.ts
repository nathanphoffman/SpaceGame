import { loadSession } from "./session";

const HTTP_NO_CONTENT = 204;
const DEFAULT_BASE_URL = "";

export const HTTP_POST = "POST";
export const GAMES_PATH = "/api/games";

export type ProblemDetails = {
	type?: string;
	title?: string;
	status?: number;
	detail?: string;
	errors?: Record<string, string[]>;
};

export class ApiError extends Error {
	readonly status: number;
	readonly problem: ProblemDetails;

	constructor(status: number, problem: ProblemDetails) {
		super(problem.detail ?? problem.title ?? `Request failed (${status})`);
		this.name = "ApiError";
		this.status = status;
		this.problem = problem;
	}
}

function baseUrl(): string {
	return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
}

async function readProblem(response: Response): Promise<ProblemDetails> {
	try {
		const body: unknown = await response.json();

		return typeof body === "object" && body !== null ? (body as ProblemDetails) : {};
	} catch (error) {
		console.warn("Error response was not JSON", error);

		// The error body was not JSON (proxy page, empty body); fall back to the status text.
		return { title: response.statusText };
	}
}

/** Adds the stored bearer token and JSON content type unless the caller already set them. */
function buildHeaders(init?: HeadersInit): Headers {
	const headers = new Headers(init);
	const token = loadSession()?.token;

	if (token && !headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

	return headers;
}

/** Fetch mutator used by the generated Orval client. */
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${baseUrl()}${url}`, {
		...options,
		headers: buildHeaders(options.headers),
	});

	if (!response.ok) throw new ApiError(response.status, await readProblem(response));

	if (response.status === HTTP_NO_CONTENT) return undefined as T;

	return (await response.json()) as T;
}
