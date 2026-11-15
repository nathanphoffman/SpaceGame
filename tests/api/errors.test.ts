import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { friendlyError } from "@/lib/api/errors";

describe("friendlyError", () => {
	it("uses the ProblemDetails detail", () => {
		expect(friendlyError(new ApiError(409, { detail: "Game is full" }))).toBe("Game is full");
	});

	it("falls back by status", () => {
		expect(friendlyError(new ApiError(403, {}))).toContain("host");
	});

	it("handles unknown values", () => {
		expect(friendlyError("x")).toBe("Something went wrong");
		expect(friendlyError(new Error("boom"))).toBe("boom");
	});
});
