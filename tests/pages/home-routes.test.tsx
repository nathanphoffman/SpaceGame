import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

import NewRedirectPage from "@/app/new/page";

describe("/new redirect", () => {
	beforeEach(() => redirect.mockClear());

	it.each([
		["goes to / without a code", {}, "/"],
		["keeps the join code", { code: "A B" }, "/?code=A%20B"],
	])("%s", async (_name, searchParams, expected) => {
		await NewRedirectPage({ searchParams: Promise.resolve(searchParams) });
		expect(redirect).toHaveBeenCalledWith(expected);
	});
});
