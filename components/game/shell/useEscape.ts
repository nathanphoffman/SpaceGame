import { useEffect } from "react";

/** Calls onEscape when the Escape key is pressed, while active is true. */
export function useEscape(active: boolean, onEscape: () => void): void {
	useEffect(() => {
		if (!active) return;

		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") onEscape();
		};

		window.addEventListener("keydown", handler);

		return () => window.removeEventListener("keydown", handler);
	}, [active, onEscape]);
}
