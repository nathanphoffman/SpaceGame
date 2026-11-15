import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

import NewRedirectPage from "@/app/new/page";

describe("/new redirect", () => {
	beforeEach(() => redirect.mockClear());

	it("goes to / without a code", async () => {
		await NewRedirectPage({ searchParams: Promise.resolve({}) });
		expect(redirect).toHaveBeenCalledWith("/");
	});

	it("keeps the join code", async () => {
		await NewRedirectPage({ searchParams: Promise.resolve({ code: "A B" }) });
		expect(redirect).toHaveBeenCalledWith("/?code=A%20B");
	});
});
