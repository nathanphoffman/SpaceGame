"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
	// One client per browser tab; created in state so re-renders keep the cache.
	const [client] = useState(() => new QueryClient());

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
