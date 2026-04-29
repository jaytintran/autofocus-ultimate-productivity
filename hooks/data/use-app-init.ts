import { useState, useEffect, useCallback } from "react";
import { initializeApp, type InitialAppData } from "@/lib/db/init";
import { useUserId } from "@/hooks/state/use-user-id";

/**
 * Hook that initializes all app data in parallel on mount.
 * Returns cached data immediately if available, then revalidates in background.
 *
 * Note: Cache is only read on client-side to avoid SSR hydration mismatches.
 */
export function useAppInit() {
	const userId = useUserId();
	const [data, setData] = useState<InitialAppData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [hasMounted, setHasMounted] = useState(false);

	// Load cache only after mount to avoid SSR/client mismatch
	useEffect(() => {
		setHasMounted(true);
		try {
			const cached = localStorage.getItem("af4_init_cache");
			if (cached) {
				setData(JSON.parse(cached));
				setIsLoading(false);
			}
		} catch {
			// Cache read failed, continue with loading
		}
	}, []);

	const loadData = useCallback(async () => {
		if (!userId) return;

		try {
			const result = await initializeApp(userId);
			if (result) {
				setData(result);
				// Cache the result
				try {
					localStorage.setItem("af4_init_cache", JSON.stringify(result));
				} catch (e) {
					console.error("Failed to cache init data:", e);
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err : new Error("Failed to initialize"));
		} finally {
			setIsLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		if (!userId || !hasMounted) return;

		// If we have cached data, revalidate in background
		if (data) {
			loadData();
		} else {
			// No cache, show loading
			setIsLoading(true);
			loadData();
		}
	}, [userId, hasMounted, loadData]);

	// Expose refetch function for manual revalidation
	const refetch = useCallback(() => {
		return loadData();
	}, [loadData]);

	return { data, isLoading, error, refetch };
}
