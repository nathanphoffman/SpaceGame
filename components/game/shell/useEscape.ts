import { useEffect } from "react";

/** Calls onEscape when the Escape key is pressed. Pass undefined while nothing is open to listen for nothing. */
export function useEscape(onEscape: (() => void) | undefined): void {
	useEffect(() => {
		if (!onEscape) return;

		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") onEscape();
		};

		window.addEventListener("keydown", handler);

		return () => window.removeEventListener("keydown", handler);
	}, [onEscape]);
}
