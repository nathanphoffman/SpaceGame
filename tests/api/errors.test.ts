import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/core/client";
import { friendlyError } from "@/lib/api/core/errors";

describe("friendlyError", () => {
	it.each([
		["uses the ProblemDetails detail", new ApiError(409, { detail: "Game is full" }), "Game is full"],
		["falls back by status", new ApiError(403, {}), "host"],
	])("%s", (_name, error, expected) => {
		expect(friendlyError(error)).toContain(expected);
	});

	it("handles unknown values", () => {
		expect(friendlyError("x")).toBe("Something went wrong");
		expect(friendlyError(new Error("boom"))).toBe("boom");
	});
});
