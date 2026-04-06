import useSWR from "swr";
import {
	getHabits,
	updateHabit,
	addHabit,
	deleteHabit,
	toggleCompletion,
	getToday,
	type Habit,
	reorderHabits,
} from "@/lib/habits";
import { useCallback } from "react";
import { useUserId } from "./use-user-id";

const CACHE_KEY = "af4_habits_cache";

function getHabitsCache(): Habit[] | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function setHabitsCache(habits: Habit[]) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(habits));
	} catch {}
}

export function useHabits() {
	const userId = useUserId();

	const cachedHabits = getHabitsCache();
	const hasCachedHabits =
		Array.isArray(cachedHabits) && cachedHabits.length > 0;

	const {
		data: habits = [],
		mutate,
		isLoading,
	} = useSWR<Habit[]>(userId ? `habits-${userId}` : null, getHabits, {
		refreshInterval: 0,
		fallbackData: cachedHabits ?? undefined,
		onSuccess(data) {
			setHabitsCache(data);
		},
		revalidateOnMount: !hasCachedHabits,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});

	const handleUpdate = useCallback(
		async (id: string, updates: Partial<Habit>) => {
			mutate(
				habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
				false,
			);
			await updateHabit(id, updates);
			await mutate();
		},
		[habits, mutate],
	);

	const handleAdd = useCallback(
		async (
			habit: Omit<Habit, "id" | "created_at" | "updated_at" | "completions">,
		) => {
			await addHabit(habit);
			await mutate();
		},
		[mutate],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			mutate(
				habits.filter((h) => h.id !== id),
				false,
			);
			await deleteHabit(id);
			await mutate();
		},
		[habits, mutate],
	);

	const handleToggleToday = useCallback(
		async (id: string) => {
			const habit = habits.find((h) => h.id === id);
			if (!habit) return;

			const today = getToday();
			const wasCompleted = habit.completions.includes(today);

			mutate(
				habits.map((h) => {
					if (h.id !== id) return h;
					const newCompletions = wasCompleted
						? h.completions.filter((d) => d !== today)
						: [...h.completions, today];
					return { ...h, completions: newCompletions };
				}),
				false,
			);

			await toggleCompletion(id, today, habit.completions);
			await mutate();
		},
		[habits, mutate],
	);

	const handleStatusChange = useCallback(
		async (id: string, status: Habit["status"]) => {
			await handleUpdate(id, { status });
		},
		[handleUpdate],
	);

	const handleReorder = useCallback(
		async (draggedId: string, targetId: string) => {
			const draggedIndex = habits.findIndex((h) => h.id === draggedId);
			const targetIndex = habits.findIndex((h) => h.id === targetId);
			if (
				draggedIndex === -1 ||
				targetIndex === -1 ||
				draggedIndex === targetIndex
			)
				return;

			const reordered = [...habits];
			const [dragged] = reordered.splice(draggedIndex, 1);
			reordered.splice(targetIndex, 0, dragged);

			const updates = reordered.map((h, i) => ({ id: h.id, position: i }));
			const reorderedWithPositions = reordered.map((h, i) => ({
				...h,
				position: i,
			}));

			mutate(reorderedWithPositions, false);

			try {
				await reorderHabits(updates);
				await mutate();
			} catch {
				await mutate();
			}
		},
		[habits, mutate],
	);

	return {
		habits,
		isLoading: hasCachedHabits ? false : isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleToggleToday,
		handleStatusChange,
		handleReorder,
	};
}
