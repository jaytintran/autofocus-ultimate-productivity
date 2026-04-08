// hooks/use-pamphlets.ts

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
	getPamphlets,
	getActiveTasksForPamphlet,
	getCompletedTasksForPamphlet,
	getTotalPageCountForPamphlet,
	createPamphlet,
	updatePamphlet,
	deletePamphlet,
	reassignPamphletTasks,
} from "@/lib/db/store-v1";
import {
	getActivePamphletId,
	setActivePamphletId,
	getCachedTasks,
	setCachedTasks,
	invalidatePamphletCache,
} from "@/lib/db/pamphlet-cache";
import type { Task, Pamphlet, PamphletColor } from "@/lib/types";
import { reorderPamphlets } from "@/lib/db/store-v1";

import { useUserId } from "@/hooks/state/use-user-id";

export function usePamphlets() {
	const userId = useUserId();

	// -------------------------------------------------------------------------
	// Pamphlet list
	// -------------------------------------------------------------------------
	const { data: pamphlets = [], mutate: mutatePamphlets } = useSWR<Pamphlet[]>(
		userId ? `pamphlets-${userId}` : null,
		getPamphlets,
		{
			refreshInterval: 0,
			onSuccess: (data) => {
				if (!data.length) return;
				const stored = getActivePamphletId();
				const valid = data.find((p) => p.id === stored);
				if (!valid) {
					setActivePamphletId(data[0].id);
					_setActivePamphletId(data[0].id);
				}
			},
		},
	);

	// -------------------------------------------------------------------------
	// Active pamphlet ID — initialise from localStorage
	// -------------------------------------------------------------------------
	const [activePamphletId, _setActivePamphletId] = useState<string | null>(() =>
		getActivePamphletId(),
	);

	const activePamphlet =
		pamphlets.find((p) => p.id === activePamphletId) ?? pamphlets[0] ?? null;

	// -------------------------------------------------------------------------
	// Active tasks — stale-while-revalidate from localStorage cache
	// -------------------------------------------------------------------------
	const [activeTasks, setActiveTasks] = useState<Task[]>(() => {
		if (!activePamphletId) return [];
		return getCachedTasks(activePamphletId) ?? [];
	});

	const [isLoadingTasks, setIsLoadingTasks] = useState(false);

	const fetchActiveTasksForPamphlet = useCallback(
		async (pamphletId: string, { background = false } = {}) => {
			if (!background) setIsLoadingTasks(true);
			try {
				const tasks = await getActiveTasksForPamphlet(pamphletId);
				setActiveTasks(tasks);
				setCachedTasks(pamphletId, tasks);
			} finally {
				if (!background) setIsLoadingTasks(false);
			}
		},
		[],
	);

	// On mount / pamphlet change: serve cache instantly, revalidate in background
	useEffect(() => {
		if (!activePamphletId) return;

		const cached = getCachedTasks(activePamphletId);
		if (cached) {
			setActiveTasks(cached);
			// Revalidate silently
			fetchActiveTasksForPamphlet(activePamphletId, { background: true });
		} else {
			fetchActiveTasksForPamphlet(activePamphletId, { background: false });
		}
	}, [activePamphletId, fetchActiveTasksForPamphlet]);

	// -------------------------------------------------------------------------
	// Switch pamphlet
	// -------------------------------------------------------------------------
	const switchPamphlet = useCallback(
		(pamphletId: string) => {
			if (pamphletId === activePamphletId) return;
			setActivePamphletId(pamphletId); // persist to localStorage
			_setActivePamphletId(pamphletId); // trigger re-render + effect above
		},
		[activePamphletId],
	);

	// -------------------------------------------------------------------------
	// Invalidate & refetch active pamphlet tasks (call after any mutation)
	// -------------------------------------------------------------------------
	const invalidateAndRefetch = useCallback(
		async (tasks?: Task[]) => {
			if (!activePamphletId) return;
			if (tasks) {
				// Caller already has the new state — just update cache + state
				setActiveTasks(tasks);
				setCachedTasks(activePamphletId, tasks);
			} else {
				invalidatePamphletCache(activePamphletId);
				await fetchActiveTasksForPamphlet(activePamphletId, {
					background: false,
				});
			}
		},
		[activePamphletId, fetchActiveTasksForPamphlet],
	);

	// -------------------------------------------------------------------------
	// CRUD
	// -------------------------------------------------------------------------
	const addPamphlet = useCallback(
		async (name: string, color: PamphletColor) => {
			const position = pamphlets.length;
			const created = await createPamphlet(name, color, position);
			await mutatePamphlets();
			return created;
		},
		[pamphlets.length, mutatePamphlets],
	);

	const renamePamphlet = useCallback(
		async (id: string, name: string, color: PamphletColor) => {
			await updatePamphlet(id, { name, color });
			await mutatePamphlets();
		},
		[mutatePamphlets],
	);

	const removePamphlet = useCallback(
		async (
			id: string,
			action: "transfer" | "delete-all",
			transferToId?: string,
		) => {
			if (action === "transfer" && transferToId) {
				await reassignPamphletTasks(id, transferToId);
				invalidatePamphletCache(transferToId); // destination cache is now stale
			}
			await deletePamphlet(id);
			invalidatePamphletCache(id);

			// If deleting the active pamphlet, switch to first remaining
			if (id === activePamphletId) {
				const remaining = pamphlets.filter((p) => p.id !== id);
				if (remaining.length > 0) switchPamphlet(remaining[0].id);
			}

			await mutatePamphlets();
		},
		[activePamphletId, pamphlets, switchPamphlet, mutatePamphlets],
	);

	const reorderPamphletsList = useCallback(
		async (orderedIds: string[]) => {
			const updates = orderedIds.map((id, index) => ({ id, position: index }));
			await reorderPamphlets(updates);
			await mutatePamphlets();
		},
		[mutatePamphlets],
	);

	return {
		// Data
		pamphlets,
		activePamphlet,
		activePamphletId,
		activeTasks,
		isLoadingTasks,
		// Actions
		switchPamphlet,
		invalidateAndRefetch,
		addPamphlet,
		renamePamphlet,
		removePamphlet,
		reorderPamphletsList,
		// Raw refetch for completed tasks (pamphlet-scoped, called ad hoc)
		fetchCompletedTasks: getCompletedTasksForPamphlet,
		fetchTotalPages: getTotalPageCountForPamphlet,
	};
}
