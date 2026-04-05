"use client";

import { useEffect } from "react";
import { startSyncListener } from "@/lib/sync";

export function SyncInitializer() {
	useEffect(() => {
		startSyncListener();

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js")
				.then(() => console.log("Service Worker registered"))
				.catch((err) => console.error("Service Worker failed:", err));
		}
	}, []);

	return null;
}
