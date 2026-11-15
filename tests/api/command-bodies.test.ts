import { describe, expect, it } from "vitest";
import { cancelQueueItemBody } from "@/lib/api/commands";

describe("cancelQueueItemBody", () => {
	it("builds a cancelQueueItem command for the planet and item", () => {
		const body = cancelQueueItemBody("p1", "item9");

		expect(JSON.stringify(body)).toContain("cancelQueueItem");
		expect(JSON.stringify(body)).toContain("item9");
	});
});
