import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { GameTopBar } from "@/components/game/shell/GameTopBar";
import { HowToPlay } from "@/components/game/shell/HowToPlay";
import { playerViewFixture } from "../fixtures/apiMap";

describe("how to play panel", () => {
	it("is closed at first, with a button in the top bar", () => {
		const html = renderToString(<GameTopBar view={playerViewFixture} />);

		expect(html).toContain("How to play");
		expect(html).not.toContain('role="dialog"');
	});

	it("summarises the rules", () => {
		const html = renderToString(<HowToPlay onClose={() => undefined} />);

		expect(html).toContain("500");
		expect(html).toContain("Fog of war");
		expect(html).toContain("Earth");
		expect(html).toContain("Escape");
	});
});
